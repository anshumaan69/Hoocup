const User = require('../models/user');

// @desc    Get all users
// @route   GET /api/admin/users
// @access  Private/Admin
exports.getAllUsers = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const users = await User.find({})
            .select('-password -refresh_token_hash')
            .sort({ created_at: -1 })
            .skip(skip)
            .limit(limit);

        console.log('DEBUG: Admin fetch users:', users);

        const total = await User.countDocuments();

        res.status(200).json({
            success: true,
            count: users.length,
            total,
            page,
            pages: Math.ceil(total / limit),
            data: users
        });
    } catch (error) {
        console.error('Admin Get Users Error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Create a new user (Admin bypass)
// @route   POST /api/admin/users
// @access  Private/Admin
exports.createUser = async (req, res) => {
    try {
        const { username, email, phone, password, role, first_name, last_name } = req.body;

        // Basic validation
        if (!username || (!email && !phone)) {
            return res.status(400).json({ message: 'Please provide username and either email or phone' });
        }

        // Check duplicates
        const userExists = await User.findOne({ 
            $or: [
                { username }, 
                { email: email || 'placeholder_check' }, // Avoid matching nulls
                { phone: phone || 'placeholder_check' }
            ] 
        });

        if (userExists) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const user = await User.create({
            username,
            email,
            phone,
            role: role || 'user',
            first_name,
            last_name,
            // If we had password auth, we'd hash it here. 
            // For now, assuming OTP/Google auth flows, but admin might want to pre-verify.
            is_phone_verified: !!phone,
            is_profile_complete: true // Auto-complete for admin created users?
        });

        res.status(201).json({
            success: true,
            data: user
        });

    } catch (error) {
        console.error('Admin Create User Error:', error);
        res.status(500).json({ 
            message: 'Server Error',
            error: error.message 
        });
    }
};
