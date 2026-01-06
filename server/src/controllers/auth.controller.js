const User = require('../models/user');
const { OAuth2Client } = require('google-auth-library');
const twilio = require('twilio');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const client = new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.CALLBACK_URL + '/api/auth/callback/google'
);

let twilioClient;
try {
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_ACCOUNT_SID.startsWith('AC')) {
        twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    }
} catch (e) {
    console.warn('Failed to initialize Twilio client:', e.message);
}

// --- Helper Functions ---

const generateTokens = (userId) => {
    const accessToken = jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '15m' });
    const refreshToken = crypto.randomBytes(40).toString('hex');
    return { accessToken, refreshToken };
};

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

const setCookies = (res, accessToken, refreshToken) => {
    const isProd = process.env.NODE_ENV === 'production';
    
    // Access Token (Short-lived)
    res.cookie('access_token', accessToken, {
        httpOnly: true,
        secure: isProd,
        sameSite: isProd ? 'none' : 'lax', // Must be 'none' for cross-site cookie if frontend/backend are on diff domains
        maxAge: 15 * 60 * 1000, // 15 mins
        path: '/'
    });

    // Refresh Token (Long-lived)
    res.cookie('refresh_token', refreshToken, {
        httpOnly: true,
        secure: isProd,
        sameSite: isProd ? 'none' : 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        path: '/' // Relaxed path for reliability
    });
};

const clearCookies = (res) => {
    const isProd = process.env.NODE_ENV === 'production';
    const cookieOptions = {
        httpOnly: true,
        secure: isProd,
        sameSite: isProd ? 'none' : 'lax',
        path: '/'
    };

    res.clearCookie('access_token', cookieOptions);
    res.clearCookie('refresh_token', cookieOptions);
    res.clearCookie('csrf_token', { ...cookieOptions, httpOnly: false }); 
    res.clearCookie('token'); // Clear legacy cookie just in case
};

// --- Controllers ---

// Google Auth
exports.googleAuth = async (req, res) => {
    const { code, redirect_uri } = req.body; 
    try {
        // Use provided redirect_uri or fallback to env var
        const clientUrl = process.env.CLIENT_URL ? process.env.CLIENT_URL.replace(/\/$/, '') : 'http://localhost:3000';
        const finalRedirectUri = redirect_uri || `${clientUrl}/api/auth/callback/google`;
        
        const { tokens } = await client.getToken({
            code,
            redirect_uri: finalRedirectUri
        });
        
        client.setCredentials(tokens);
        const ticket = await client.verifyIdToken({
            idToken: tokens.id_token,
            audience: process.env.GOOGLE_CLIENT_ID,
        });
        const payload = ticket.getPayload();
        const { email, given_name, family_name } = payload;

        let user = await User.findOne({ email }).select('+refresh_token_hash'); // Explicitly select for internal use

        if (!user) {
            user = new User({
                email,
                first_name: given_name,
                last_name: family_name,
                auth_provider: 'google',
            });
            await user.save();
        }

        const { accessToken, refreshToken } = generateTokens(user._id);
        
        // Save hashed refresh token
        user.refresh_token_hash = hashToken(refreshToken);
        await user.save();

        setCookies(res, accessToken, refreshToken);

        res.status(200).json({ success: true, user: { ...user.toObject(), refresh_token_hash: undefined } });
    } catch (error) {
        console.error('Google Auth Error:', error);
        res.status(401).json({ message: 'Authentication failed' });
    }
};

// Send OTP
exports.sendOtp = async (req, res) => {
    let { phone } = req.body;
    
    if (phone) {
        phone = phone.toString().replace(/\s+/g, '');
        if (!phone.startsWith('+')) phone = '+91' + phone;
    }

    try {
        // Mock fallback
        if (!twilioClient) {
             return res.status(200).json({ message: 'OTP sent successfully (MOCK)' });
        }

        const serviceSid = process.env.TWILIO_SERVICE_SID.trim();
        const verification = await twilioClient.verify.v2.services(serviceSid)
            .verifications.create({ to: phone.trim(), channel: 'sms' });
        
        res.status(200).json({ message: 'OTP sent successfully', status: verification.status });
    } catch (error) {
        console.error('Send OTP Error:', error);
        res.status(500).json({ message: 'Failed to send OTP' });
    }
};

// Verify OTP
exports.verifyOtp = async (req, res) => {
    let { phone, code } = req.body;
    let isVerified = false;

    if (phone) {
        phone = phone.toString().replace(/\s+/g, '');
        if (!phone.startsWith('+')) phone = '+91' + phone;
    }
    
    try {
        if (!twilioClient) {
             if (code === '123456') isVerified = true;
             else return res.status(400).json({ message: 'Invalid OTP (MOCK)' });
        } else {
             const serviceSid = process.env.TWILIO_SERVICE_SID.trim();
             const check = await twilioClient.verify.v2.services(serviceSid)
                .verificationChecks.create({ to: phone.trim(), code });
             if (check.status === 'approved') isVerified = true;
        }

        if (isVerified) {
            // Case 1: content login (User exists with this phone)
            let user = await User.findOne({ phone }).select('+refresh_token_hash');
            
            if (user) {
                // LOGIN FLOW
                const { accessToken, refreshToken } = generateTokens(user._id);
                user.refresh_token_hash = hashToken(refreshToken);
                await user.save();
                setCookies(res, accessToken, refreshToken);
                return res.status(200).json({ success: true, user: { ...user.toObject(), refresh_token_hash: undefined } });
            }

            // Case 2: Signup Step 2 (Linking Phone to Google Account)
            // Check if user is currently logged in (Google Session)
            const incomingToken = req.cookies.access_token;
            if (incomingToken) {
                try {
                    const decoded = jwt.verify(incomingToken, process.env.JWT_SECRET);
                    user = await User.findById(decoded.id);
                    
                    if (user) {
                        // Link phone to existing Google user
                        user.phone = phone;
                        user.is_phone_verified = true;
                        // user.refresh_token_hash = ... (Already set during Google login, but good to rotate)
                         const { accessToken, refreshToken } = generateTokens(user._id);
                         user.refresh_token_hash = hashToken(refreshToken);
                        await user.save();
                        
                        setCookies(res, accessToken, refreshToken);
                        return res.status(200).json({ success: true, user: { ...user.toObject(), refresh_token_hash: undefined } });
                    }
                } catch (e) {
                    // Token invalid, proceed to error
                }
            }

            // Case 3: Unknown Phone & No Session -> REJECT
            return res.status(400).json({ 
                message: 'Account not found. Please signup with Google first.',
                error: 'signup_required' 
            });

        } else {
            return res.status(400).json({ message: 'Invalid OTP' });
        }
    } catch (error) {
        console.error('Verify OTP Error:', error);
        res.status(500).json({ message: 'Verification failed' });
    }
};

// Refresh Token
exports.refreshToken = async (req, res) => {
    const incomingRefreshToken = req.cookies.refresh_token;

    if (!incomingRefreshToken) {
        return res.status(401).json({ message: 'No refresh token' });
    }

    try {
        // We need to find the user efficiently. Since we don't have ID in opaque token,
        // we might need to rely on the token itself.
        // HOWEVER: Best practice is opaque token lookup. 
        // For simplicity with Mongoose without a separate Token collection,
        // we can try to find the user who has this hash.
        // Note: This is inefficient (scan). Better: Store { userId, token } in separate collection.
        // COMPROMISE: We will assume we found the user via an additional cookie or just inefficient scan for now?
        // ACTION: Let's do the scan for now as the userbase is small, or decode if we used JWT for refresh token.
        // Plan said: "Refresh Token: JWT or opaque". Let's use opaque for security.
        
        const incomingHash = hashToken(incomingRefreshToken);
        const user = await User.findOne({ refresh_token_hash: incomingHash }).select('+refresh_token_hash');

        if (!user) {
            // REUSE DETECTION / THEFT: Token is valid format but not found? 
            // Could mean it was already rotated. Clear cookies.
            clearCookies(res);
            return res.status(401).json({ message: 'Invalid or expired token reuse detected' });
        }

        // Rotate
        const { accessToken, refreshToken: newRefreshToken } = generateTokens(user._id);
        user.refresh_token_hash = hashToken(newRefreshToken);
        await user.save();

        setCookies(res, accessToken, newRefreshToken);
        res.status(200).json({ success: true });

    } catch (error) {
        console.error('Refresh Error:', error);
        clearCookies(res);
        res.status(401).json({ message: 'Refresh failed' });
    }
};

exports.registerDetails = async (req, res) => {
    const { username, first_name, last_name, dob, avatar } = req.body;
    
    // Server-side Age Validation
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }

    if (age < 10) {
        return res.status(400).json({ message: 'You must be at least 10 years old to register.' });
    }

    try {
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        user.username = username;
        user.first_name = first_name;
        user.last_name = last_name;
        user.dob = dob;
        if (avatar) user.avatar = avatar;
        user.is_profile_complete = true;

        await user.save();
        res.status(200).json({ message: 'Profile updated successfully', user });
    } catch (error) {
        console.error('Register Details Error:', error);
        if (error.code === 11000) {
            return res.status(400).json({ message: 'Username already taken' });
        }
        res.status(500).json({ 
            message: 'Failed to update profile', 
            error: error.toString(),
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};

exports.logout = async (req, res) => {
    try {
        // Invalidate in DB for extra security
        if (req.user && req.user.id) {
            await User.findByIdAndUpdate(req.user.id, { refresh_token_hash: null });
        }
    } catch (e) {
        // Ignore error user might be invalid
    }
    clearCookies(res);
    res.status(200).json({ message: 'Logged out' });
};

exports.getUserByUsername = async (req, res) => {
    try {
        const { username } = req.params;
        const user = await User.findOne({ username });
        if (!user) return res.status(404).json({ message: 'User not found' });
        
        // Return public info only
        // Mongoose default projection is fine, but we might want to be explicit optionally.
        // For now, return whole user object (minus sensitive hash).
        res.status(200).json(user);
    } catch (error) {
         res.status(500).json({ message: 'Server Error' });
    }
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
