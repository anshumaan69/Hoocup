const User = require('../models/user');
const PhotoAccessRequest = require('../models/PhotoAccessRequest');
const { OAuth2Client } = require('google-auth-library');
const twilio = require('twilio');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const cloudinary = require('../config/cloudinary');
const sharp = require('sharp');

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

// --- Stateless JWT Helper Functions ---

const generateTokens = (userId) => {
    // Access Token: Short Lived (15m)
    const accessToken = jwt.sign(
        { id: userId, type: 'access' }, 
        process.env.JWT_SECRET, 
        { expiresIn: '15m' }
    );
    
    // Refresh Token: Long Lived (30d), Stateless (No DB)
    // Using REFRESH_TOKEN_SECRET if available, else fallback to JWT_SECRET (for dev ease)
    // In production, these should be different!
    const secret = process.env.REFRESH_TOKEN_SECRET || process.env.JWT_SECRET;
    
    const refreshToken = jwt.sign(
        { id: userId, type: 'refresh' }, 
        secret, 
        { expiresIn: '30d' }
    );
    
    return { accessToken, refreshToken };
};

// Removed hashToken as we are now stateless

const getCookieOptions = () => {
    // SECURITY NOTE:
    // On localhost (development), 'secure: true' often fails if not using https.
    // 'sameSite: none' REQUIRED 'secure: true'.
    // So for dev (http://localhost), we need 'lax' and 'secure: false'.
    
    const isProd = process.env.NODE_ENV === 'production';
    
    return {
        httpOnly: true,
        secure: isProd, 
        sameSite: isProd ? 'none' : 'lax', 
        path: '/'
    };
};

// ... getCookieNames (unchanged) ...
const getCookieNames = (req) => {
    return {
        access: 'access_token',
        refresh: 'refresh_token'
    };
};

const setCookies = (req, res, accessToken, refreshToken) => {
    const options = getCookieOptions();
    const { access, refresh } = getCookieNames(req);

    // Access Token (15 mins)
    res.cookie(access, accessToken, {
        ...options,
        maxAge: 15 * 60 * 1000 
    });

    // Refresh Token (30 days)
    res.cookie(refresh, refreshToken, {
        ...options,
        maxAge: 30 * 24 * 60 * 60 * 1000 
    });

    // CSRF Token
    const csrfOptions = { ...options, httpOnly: false };
    const csrfToken = crypto.randomBytes(32).toString('hex');
    res.cookie('csrf_token', csrfToken, csrfOptions);
};

const clearCookies = (req, res) => {
    const options = getCookieOptions();
    const { access, refresh } = getCookieNames(req);
    
    // Clear cookies based on origin (now standardized)
    res.clearCookie(access, options);
    res.clearCookie(refresh, options);
    
    // CLEAR LEGACY / ZOMBIE COOKIES:
    res.clearCookie('admin_access_token', options);
    res.clearCookie('admin_refresh_token', options);
    
    if (access !== 'access_token') res.clearCookie('access_token', options);
    if (refresh !== 'refresh_token') res.clearCookie('refresh_token', options);
    
    res.clearCookie('csrf_token', { ...options, httpOnly: false }); 
};

// ... Controllers ...

// Refresh Token (Stateless Version)
exports.refreshToken = async (req, res) => {
    const { refresh } = getCookieNames(req);
    const incomingRefreshToken = req.cookies[refresh];

    if (!incomingRefreshToken) {
        return res.status(401).json({ message: 'No refresh token' });
    }

    try {
        const secret = process.env.REFRESH_TOKEN_SECRET || process.env.JWT_SECRET;
        
        let decoded;
        try {
            decoded = jwt.verify(incomingRefreshToken, secret);
        } catch (jwtError) {
            // Token is invalid, expired, or malformed (legacy token)
            // Just clear cookies and return 401
            clearCookies(req, res);
            return res.status(401).json({ message: 'Session expired' });
        }
        
        // 2. Check Type
        if (decoded.type !== 'refresh') {
            clearCookies(req, res);
            return res.status(401).json({ message: 'Invalid token type' });
        }

        // 3. Issue NEW Access Token
        const newAccessToken = jwt.sign(
            { id: decoded.id, type: 'access' }, 
            process.env.JWT_SECRET, 
            { expiresIn: '15m' }
        );

        // 4. Send cookies (Keep same refresh token - No Rotation)
        const options = getCookieOptions();
        const { access } = getCookieNames(req);
        
        res.cookie(access, newAccessToken, {
            ...options,
            maxAge: 15 * 60 * 1000 
        });
        
        // Update CSRF too for safety
        const csrfOptions = { ...options, httpOnly: false };
        const csrfToken = crypto.randomBytes(32).toString('hex');
        res.cookie('csrf_token', csrfToken, csrfOptions);

        res.status(200).json({ success: true });

    } catch (error) {
        console.error('Refresh Error:', error);
        clearCookies(req, res);
        res.status(401).json({ message: 'Refresh failed' });
    }
};

exports.registerDetails = async (req, res) => {
    const { username, first_name, last_name, dob, avatar, bio } = req.body;
    
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

        // ALLOW UPDATES: Removed the check that blocked updates if profile was already complete.
        // if (user.is_profile_complete) {
        //    return res.status(403).json({ message: 'Profile already completed. Please use Edit Profile.' });
        // }

        user.username = username;
        if (first_name) user.first_name = first_name;
        if (last_name) user.last_name = last_name;
        user.dob = dob;
        if (bio) user.bio = bio;
        
        // If avatar is provided (e.g. from the selected photo in register flow)
        // ensure we update both fields for consistency
        if (avatar) {
            user.avatar = avatar;
            user.profilePhoto = avatar; 
        }

        user.is_profile_complete = true;
        await user.save();
        res.status(200).json({ message: 'Profile updated successfully', user });
    } catch (error) {
        console.error('Register Details Error:', error);
        if (error.code === 11000) {
            const field = Object.keys(error.keyPattern)[0];
            const readableField = field.charAt(0).toUpperCase() + field.slice(1);
            return res.status(400).json({ message: `${readableField} already exists. Please choose another.` });
        }
        res.status(500).json({ 
            message: 'Failed to update profile', 
            error: error.toString(),
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};

// Google Auth
exports.googleAuth = async (req, res) => {
    const { code, redirect_uri } = req.body; 
    try {
        // Determine origin to construct callback
        const origin = req.get('origin'); 
        let clientUrl = process.env.CLIENT_URL ? process.env.CLIENT_URL.replace(/\/$/, '') : 'http://localhost:3000';
        
        // If the request comes from the Admin App (port 3001), use that as base
        if (origin && (origin.includes('localhost:3001') || origin === process.env.ADMIN_URL)) {
             clientUrl = origin;
        }

        // Use provided redirect_uri or construct default based on origin
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
        const { email, given_name, family_name, picture } = payload;

        let user = await User.findOne({ email });

        if (!user) {
            user = new User({
                email,
                first_name: given_name,
                last_name: family_name,
                avatar: picture, 
                auth_provider: 'google',
            });
            await user.save();
        } else if (!user.avatar) {
             user.avatar = picture;
             await user.save();
        }

        if (user.deletedAt) {
            return res.status(403).json({ message: 'Your account has been deleted. Please contact support to restore it.' });
        }

        // Check Status
        if (user.status === 'suspended') {
            return res.status(403).json({ message: 'Your account has been suspended by admin until further notice' });
        }

        if (user.status === 'banned') {
            if (user.banExpiresAt && user.banExpiresAt > new Date()) {
                const daysLeft = Math.ceil((user.banExpiresAt - new Date()) / (1000 * 60 * 60 * 24));
                return res.status(403).json({ message: `You have been banned for next ${daysLeft} days` });
            } else {
                user.status = 'active';
                user.banExpiresAt = undefined;
                await user.save();
            }
        }

        const { accessToken, refreshToken } = generateTokens(user._id);
        


        setCookies(req, res, accessToken, refreshToken);

        res.status(200).json({ success: true, user: { ...user.toObject() } });
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
        // Magic Number for Testing
        if (process.env.NODE_ENV !== 'production' && phone === '+919999999999') {
            return res.status(200).json({ message: 'OTP sent successfully (MOCK TEST)' });
        }

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
        if (process.env.NODE_ENV !== 'production' && phone === '+919999999999') {
             if (code === '123456') isVerified = true;
             else return res.status(400).json({ message: 'Invalid OTP (MOCK TEST)' });
        } else if (!twilioClient) {
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
            let user = await User.findOne({ phone });
            
            if (user) {
                // LOGIN FLOW
                if (user.deletedAt) {
                    return res.status(403).json({ message: 'Your account has been deleted. Please contact support to restore it.' });
                }

                if (user.status === 'suspended') {
                    return res.status(403).json({ message: 'Your account has been suspended by admin until further notice' });
                }

                if (user.status === 'banned') {
                    if (user.banExpiresAt && user.banExpiresAt > new Date()) {
                        const daysLeft = Math.ceil((user.banExpiresAt - new Date()) / (1000 * 60 * 60 * 24));
                        return res.status(403).json({ message: `You have been banned for next ${daysLeft} days` });
                    } else {
                        user.status = 'active';
                        user.banExpiresAt = undefined;
                        await user.save();
                    }
                }

                const { accessToken, refreshToken } = generateTokens(user._id);
                // Stateless: No Hash
                setCookies(req, res, accessToken, refreshToken);
                return res.status(200).json({ success: true, user: { ...user.toObject() } });
            }

            // Case 2: Signup Step 2 (Linking Phone to Google Account)
            const incomingToken = req.cookies.access_token;
            if (incomingToken) {
                try {
                    const decoded = jwt.verify(incomingToken, process.env.JWT_SECRET);
                    user = await User.findById(decoded.id);
                    
                    if (user) {
                        user.phone = phone;
                        user.is_phone_verified = true;
                         const { accessToken, refreshToken } = generateTokens(user._id);
                         // Stateless: No Hash
                        await user.save();
                        
                        setCookies(req, res, accessToken, refreshToken);
                        return res.status(200).json({ success: true, user: { ...user.toObject() } });
                    }
                } catch (e) {
                    // Token invalid
                }
            }

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



// --- Email OTP (Stateless) ---

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.ethereal.email',
    port: process.env.SMTP_PORT || 587,
    secure: false, // true for 465, false for other ports
    auth: {
        user: process.env.SMTP_USER || 'ethereal_user',
        pass: process.env.SMTP_PASS || 'ethereal_pass'
    }
});

exports.sendEmailOtp = async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required' });

    try {
        // 1. Generate OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        
        // 2. Hash OTP for Stateless verification
        // (We don't save to DB, we sign it in a cookie)
        const otpHash = crypto.createHmac('sha256', process.env.JWT_SECRET)
            .update(otp)
            .digest('hex');

        // 3. Create Temp Token (5 mins)
        const emailOtpToken = jwt.sign(
            { email, otpHash }, 
            process.env.JWT_SECRET, 
            { expiresIn: '5m' }
        );

        // 4. Set Cookie
        res.cookie('email_otp_token', emailOtpToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
            maxAge: 5 * 60 * 1000 // 5 mins
        });

        // 5. Send Email
        console.log(`[##### OTP #####] Email: ${email} | OTP: ${otp}`);

        if (!process.env.SMTP_HOST) {
            return res.status(200).json({ message: 'OTP sent (Mock Mode)' });
        }

        await transporter.sendMail({
            from: '"Hoocup Admin" <admin@hoocup.com>',
            to: email,
            subject: 'Your Login OTP',
            text: `Your OTP is: ${otp}. It expires in 5 minutes.`
        });

        res.status(200).json({ message: 'OTP sent successfully' });

    } catch (error) {
        console.error('Send Email OTP Error:', error);
        res.status(500).json({ message: 'Failed to send OTP' });
    }
};

exports.verifyEmailOtp = async (req, res) => {
    const { email, otp } = req.body;
    const emailOtpToken = req.cookies.email_otp_token;

    if (!email || !otp) return res.status(400).json({ message: 'Email and OTP required' });
    if (!emailOtpToken) return res.status(400).json({ message: 'OTP expired or not sent' });

    try {
        // 1. Verify Token
        const decoded = jwt.verify(emailOtpToken, process.env.JWT_SECRET);
        
        if (decoded.email !== email) {
            return res.status(400).json({ message: 'Email mismatch' });
        }

        // 2. Verify OTP Hash
        const incomingHash = crypto.createHmac('sha256', process.env.JWT_SECRET)
            .update(otp)
            .digest('hex');
            
        if (incomingHash !== decoded.otpHash) {
            return res.status(400).json({ message: 'Invalid OTP' });
        }

        // 3. Login User
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (user.deletedAt) return res.status(403).json({ message: 'Account deleted' });
        if (user.status === 'suspended') return res.status(403).json({ message: 'Account suspended' });
        if (user.status === 'banned') return res.status(403).json({ message: 'Account banned' });

        // 4. Generate Auth Tokens
        const { accessToken, refreshToken } = generateTokens(user._id);

        // 5. Set Auth Cookies & Clear OTP Cookie
        setCookies(req, res, accessToken, refreshToken);
        res.clearCookie('email_otp_token');

        res.status(200).json({ success: true, user: { ...user.toObject() } });

    } catch (error) {
        console.error('Verify Email OTP Error:', error);
        res.status(400).json({ message: 'Invalid or expired OTP session' });
    }
};

exports.logout = async (req, res) => {
    // Stateless logout = just clear cookies.
    // Cannot invalidate token on server without a blacklist (Redis).
    clearCookies(req, res);
    res.status(200).json({ message: 'Logged out' });
};

exports.getUserByUsername = async (req, res) => {
    try {
        const { username } = req.params;
        const user = await User.findOne({ username });
        if (!user) return res.status(404).json({ message: 'User not found' });
        
        // Return public info only
        // Filter Photos based on access
        let userObj = user.toObject();
        let photos = userObj.photos || [];

        // Current User Logic
        // Note: protect middleware adds req.user. If not protected (public profile?), req.user might be missing.
        // user.routes.js says router.use(protect), so req.user should be there.
        const currentUserId = req.user ? req.user.id : null;
        const isAdmin = req.user && ['admin', 'superadmin'].includes(req.user.role);
        const isOwner = currentUserId && currentUserId === userObj._id.toString();

        if (!isAdmin && !isOwner) {
            // Check Access
            let hasAccess = false;
            if (currentUserId) {
                const accessReq = await PhotoAccessRequest.findOne({ 
                    requester: currentUserId, 
                    targetUser: userObj._id,
                    status: 'granted'
                });
                if (accessReq) hasAccess = true;
            }

            if (!hasAccess && photos.length > 1) {
                 photos = photos.map((photo, index) => {
                    if (index === 0) return photo; // 1st always visible
                    return {
                        _id: photo._id,
                        restricted: true,
                        isProfile: photo.isProfile,
                        order: photo.order
                    };
                });
            }
        }
        
        userObj.photos = photos;

        res.status(200).json(userObj);
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

// --- Photo Management ---

exports.uploadPhotos = async (req, res) => {
    try {
        const files = req.files;
        if (!files || files.length === 0) {
            return res.status(400).json({ message: 'No files uploaded' });
        }

        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        // Initialize photos if undefined (backward compatibility)
        if (!user.photos) user.photos = [];

        if (user.photos.length + files.length > 4) {
             return res.status(400).json({ message: `Max 4 photos allowed. You can upload ${4 - user.photos.length} more.` });
        }

        const uploadPromises = files.map(async (file) => {
            // value-add: compress image
            const optimizedBuffer = await sharp(file.buffer)
                .resize(800, 800, { fit: 'cover' })
                .jpeg({ quality: 80 })
                .toBuffer();

            // Upload via stream
            return new Promise((resolve, reject) => {
                const uploadStream = cloudinary.uploader.upload_stream(
                    { folder: 'hoocup_user_photos', resource_type: 'image' },
                    (error, result) => {
                        if (error) reject(error);
                        else resolve(result);
                    }
                );
                uploadStream.end(optimizedBuffer);
            });
        });

        const results = await Promise.all(uploadPromises);

        // Add to user photos
        results.forEach((result, index) => {
            user.photos.push({
                url: result.secure_url,
                publicId: result.public_id,
                isProfile: false,
                order: user.photos.length, // simple append order
            });
        });

        // Auto-set profile photo if first upload or none exists
        if (!user.profilePhoto || user.photos.length === results.length) {
            // Find the one we just added (if it was the first ever)
             // Simpler: Just ensure one is set to true
             const hasProfile = user.photos.some(p => p.isProfile);
             if (!hasProfile && user.photos.length > 0) {
                 user.photos[0].isProfile = true;
                 user.profilePhoto = user.photos[0].url;
                 if (user.avatar === null) user.avatar = user.photos[0].url; // Backwards compat
             }
        }



        await user.save();
        res.status(200).json({ message: 'Photos uploaded', photos: user.photos, profilePhoto: user.profilePhoto });

    } catch (error) {
        console.error('Photo Upload Error:', error);
        res.status(500).json({ message: 'Image upload failed' });
    }
};

exports.setProfilePhoto = async (req, res) => {
    const { photoId } = req.body;
    try {
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        const photoExists = user.photos.id(photoId);
        if (!photoExists) return res.status(404).json({ message: 'Photo not found' });

        // Update flags
        user.photos.forEach(photo => {
            if (photo._id.toString() === photoId) {
                photo.isProfile = true;
                user.profilePhoto = photo.url;
                user.avatar = photo.url; // Backwards compat
            } else {
                photo.isProfile = false;
            }
        });

        await user.save();
        res.status(200).json({ message: 'Profile photo updated', profilePhoto: user.profilePhoto, photos: user.photos });

    } catch (error) {
        console.error('Set Profile Photo Error:', error);
        res.status(500).json({ message: 'Failed to update profile photo' });
    }
};

exports.deletePhoto = async (req, res) => {
    const { photoId } = req.params;
    try {
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        const photo = user.photos.id(photoId);
        if (!photo) return res.status(404).json({ message: 'Photo not found' });

        // Delete from Cloudinary
        await cloudinary.uploader.destroy(photo.publicId);

        // Remove from DB
        const isProfile = photo.isProfile;
        user.photos.pull(photoId);

        // Fallback if deleted photo was profile photo
        if (isProfile) {
            user.profilePhoto = null;
            user.avatar = null;

            if (user.photos.length > 0) {
                user.photos[0].isProfile = true;
                user.profilePhoto = user.photos[0].url;
                user.avatar = user.photos[0].url;
            }
        }

        await user.save();
        res.status(200).json({ message: 'Photo deleted', photos: user.photos, profilePhoto: user.profilePhoto });

    } catch (error) {
        console.error('Delete Photo Error:', error);
        res.status(500).json({ message: 'Failed to delete photo' });
    }
};
