const User = require('../models/user');
const { OAuth2Client } = require('google-auth-library');
const twilio = require('twilio');
const jwt = require('jsonwebtoken');

const client = new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.CALLBACK_URL + '/api/auth/callback/google'
);

let twilioClient;
try {
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_ACCOUNT_SID.startsWith('AC')) {
        twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    } else {
        console.warn('Twilio API keys missing or invalid. OTP will be mocked.');
    }
} catch (e) {
    console.warn('Failed to initialize Twilio client:', e.message);
}

const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

const fs = require('fs');
const path = require('path');

const logDebug = (msg) => {
    const logPath = path.join(__dirname, '../../auth_debug.log');
    const timestamp = new Date().toISOString();
    fs.appendFileSync(logPath, `[${timestamp}] ${msg}\n`);
};

// Google Auth
exports.googleAuth = async (req, res) => {
    const { code } = req.body; 
    logDebug(`googleAuth called with code: ${code ? 'Yes' : 'No'}`);
    
    try {
        // Exchange code for tokens
        logDebug('Attempting to exchange code for tokens...');
        const clientUrl = process.env.CLIENT_URL ? process.env.CLIENT_URL.replace(/\/$/, '') : 'http://localhost:3000';
        
        console.log(`[DEBUG] Google Auth: Exchange Code. Redirect URI: ${clientUrl}/api/auth/callback/google`);
        console.log(`[DEBUG] CLIENT_URL env var: ${process.env.CLIENT_URL}`);

        const { tokens } = await client.getToken({
            code,
            redirect_uri: `${clientUrl}/api/auth/callback/google`
        });
        logDebug('Tokens received successfully.');
        
        client.setCredentials(tokens);

        // Verify ID token
        logDebug('Verifying ID token...');
        const ticket = await client.verifyIdToken({
            idToken: tokens.id_token,
            audience: process.env.GOOGLE_CLIENT_ID,
        });
        const payload = ticket.getPayload();
        logDebug(`ID Token verified. Email: ${payload.email}`);
        
        const { email, given_name, family_name, picture } = payload;

        let user = await User.findOne({ email });

        if (!user) {
            logDebug('User not found. Creating new user...');
            user = new User({
                email,
                first_name: given_name,
                last_name: family_name,
                auth_provider: 'google',
            });
            await user.save();
            logDebug(`New user created: ${user._id}`);
        } else {
            logDebug(`User found: ${user._id}`);
        }

        const jwtToken = generateToken(user._id);

        res.cookie('token', jwtToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
        });

        res.status(200).json({ user, token: jwtToken });
        logDebug('Response sent with 200 OK.');
    } catch (error) {
        const errorMsg = JSON.stringify(error, Object.getOwnPropertyNames(error));
        logDebug(`ERROR in googleAuth: ${errorMsg}`);
        console.error('Google Auth Error Full Object:', errorMsg);
        
        // Improve error extraction
        let errorMessage = 'Google authentication failed';
        if (error.response && error.response.data) {
             errorMessage = error.response.data.error_description || error.response.data.error || JSON.stringify(error.response.data);
        } else if (error.message) {
             errorMessage = error.message;
        }
        
        res.status(400).json({ message: errorMessage });
    }
};

// Send OTP
exports.sendOtp = async (req, res) => {
    let { phone } = req.body;
    
    // Normalize phone number to E.164 (assuming +91 if missing)
    if (phone) {
        phone = phone.toString().replace(/\s+/g, '');
        if (!phone.startsWith('+')) {
            phone = '+91' + phone;
        }
    }

    console.log(`[DEBUG] sendOtp called for phone: ${phone}`);
    console.log(`[DEBUG] Twilio Service SID present: ${!!process.env.TWILIO_SERVICE_SID}`);

    try {
        // Mock sending if no keys (or implement actual logic)
        if (!twilioClient) {
             console.log(`[MOCK] Sending OTP to ${phone}`);
             return res.status(200).json({ message: 'OTP sent successfully (MOCK)' });
        }

        if (!process.env.TWILIO_SERVICE_SID) {
            throw new Error('TWILIO_SERVICE_SID is missing in env');
        }

        // Check for duplicate phone number if user is logged in (linking phase)
        let tokenFromCookie = req.cookies.token;
        if (!tokenFromCookie && req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
             tokenFromCookie = req.headers.authorization.split(' ')[1];
        }

        if (tokenFromCookie) {
             try {
                const decoded = jwt.verify(tokenFromCookie, process.env.JWT_SECRET);
                const currentUser = await User.findById(decoded.id);
                // If user is already logged in, they are trying to link a phone.
                // Check if this phone is already owned by SOMEONE ELSE.
                const existingPhoneUser = await User.findOne({ phone });
                
                if (existingPhoneUser && existingPhoneUser._id.toString() !== currentUser._id.toString()) {
                    return res.status(400).json ({ message: 'Phone number already in use by another account' });
                }
             } catch (err) {
                 // Token invalid, treat as guest/login attempt (allow OTP)
             }
        }

        console.log('[DEBUG] Attempting to create verification...');
        const serviceSid = process.env.TWILIO_SERVICE_SID.trim();
        console.log(`[DEBUG] Using Service SID: '${serviceSid}'`);

        const verification = await twilioClient.verify.v2.services(serviceSid)
            .verifications
            .create({ to: phone.trim(), channel: 'sms' });
        
        console.log(`[DEBUG] Verification status: ${verification.status}`);
        res.status(200).json({ message: 'OTP sent successfully', status: verification.status });
    } catch (error) {
        console.error('Send OTP Error:', error);
        res.status(500).json({ message: 'Failed to send OTP', error: error.message });
    }
};

// Verify OTP
exports.verifyOtp = async (req, res) => {
    let { phone, code } = req.body;
    
    // Normalize phone number to E.164
    if (phone) {
        phone = phone.toString().replace(/\s+/g, '');
        if (!phone.startsWith('+')) {
            phone = '+91' + phone;
        }
    }
    
    console.log(`[DEBUG] verifyOtp called for phone: ${phone}, code: ${code}`);

    try {
        let isVerified = false;
        
        if (!twilioClient) {
             console.log('[DEBUG] Using MOCK verification');
             // Mock verification
             if (code === '123456') isVerified = true;
             else return res.status(400).json({ message: 'Invalid OTP (MOCK)' });
        } else {
             const serviceSid = process.env.TWILIO_SERVICE_SID.trim();
             console.log(`[DEBUG] Verifying with Service SID: '${serviceSid}'`);
             
             const verificationCheck = await twilioClient.verify.v2.services(serviceSid)
            .verificationChecks
            .create({ to: phone.trim(), code });
            
            console.log(`[DEBUG] Verification check status: ${verificationCheck.status}`);
            if (verificationCheck.status === 'approved') isVerified = true;
        }

        if (isVerified) {
            let currentUser;
            // 1. Get Logged In User (e.g. Google User)
            let tokenFromCookie = req.cookies.token;
            if (!tokenFromCookie && req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
                tokenFromCookie = req.headers.authorization.split(' ')[1];
            }

            if (tokenFromCookie) {
                try {
                    const decoded = jwt.verify(tokenFromCookie, process.env.JWT_SECRET);
                    currentUser = await User.findById(decoded.id);
                } catch (err) {
                    console.log('Token verification failed during OTP');
                }
            }

            // 2. Get Existing Phone User
            const existingPhoneUser = await User.findOne({ phone });

            let finalUser;

            if (currentUser && existingPhoneUser) {
                if (currentUser._id.toString() === existingPhoneUser._id.toString()) {
                    // Scenario: Same user verifying their own phone again?
                    console.log('[DEBUG] Merging: Users are identical.');
                    finalUser = currentUser;
                } else {
                    // Scenario: Conflict. Logged in as User A, verifying phone of User B.
                    // Resolution: Merge User B (Phone) into User A (Google).
                    console.log(`[DEBUG] Merging: Deleting Phone User ${existingPhoneUser._id} and merging into Logged In User ${currentUser._id}`);
                    
                    // Copy fields from phone user if missing in current user
                    if (!currentUser.first_name && existingPhoneUser.first_name) currentUser.first_name = existingPhoneUser.first_name;
                    if (!currentUser.last_name && existingPhoneUser.last_name) currentUser.last_name = existingPhoneUser.last_name;
                    if (!currentUser.username && existingPhoneUser.username) currentUser.username = existingPhoneUser.username;
                    if (!currentUser.dob && existingPhoneUser.dob) currentUser.dob = existingPhoneUser.dob;
                    if (!currentUser.is_profile_complete && existingPhoneUser.is_profile_complete) currentUser.is_profile_complete = existingPhoneUser.is_profile_complete;

                    // Delete the old phone user to free up the unique phone number
                    await User.findByIdAndDelete(existingPhoneUser._id);
                    finalUser = currentUser;
                }
            } else if (currentUser) {
                // Scenario: Google User linking a fresh phone number
                console.log('[DEBUG] Linking fresh phone to Logged In User');
                finalUser = currentUser;
            } else if (existingPhoneUser) {
                // Scenario: Login via OTP (Phone User exists, no session)
                console.log('[DEBUG] Logging in Existing Phone User');
                finalUser = existingPhoneUser;
            } else {
                // Scenario: Brand new user via Phone
                console.log('[DEBUG] Creating New Phone User');
                finalUser = new User({ auth_provider: 'local' });
            }

            // Update Final User
            finalUser.phone = phone;
            finalUser.is_phone_verified = true;
            if (finalUser.auth_provider === 'google') {
                finalUser.auth_provider = 'google_phone';
            }

            try {
                await finalUser.save();
                console.log(`[DEBUG] User ${finalUser._id} saved successfully.`);
            } catch (saveError) {
                console.error('[ERROR] Save failed:', saveError);
                 return res.status(400).json({ message: 'Failed to save user', error: saveError.message });
            }
            
            const token = generateToken(finalUser._id);
             res.cookie('token', token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                 maxAge: 30 * 24 * 60 * 60 * 1000
            });
            
            return res.status(200).json({ message: 'Phone verified successfully', user: finalUser, token });
        } else {
            return res.status(400).json({ message: 'Invalid OTP' });
        }
    } catch (error) {
        console.error('Verify OTP Error:', error);
        res.status(500).json({ message: 'Verification failed', error: error.message });
    }
};

// Register Details
exports.registerDetails = async (req, res) => {
    const { username, first_name, last_name, dob } = req.body;
    const userId = req.user.id; // From middleware

    try {
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: 'User not found' });

        user.username = username;
        user.first_name = first_name;
        user.last_name = last_name;
        user.dob = dob;
        user.is_profile_complete = true;

        await user.save();
        res.status(200).json({ message: 'Profile updated successfully', user });
    } catch (error) {
        console.error('Register Details Error:', error);
        res.status(500).json({ message: 'Failed to update profile' });
    }
};

exports.logout = (req, res) => {
    res.clearCookie('token');
    res.status(200).json({ message: 'Logged out successfully' });
};

exports.getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ message: 'User not found' });
        res.status(200).json(user);
    } catch (error) {
         res.status(500).json({ message: 'Server Error' });
    }
};
