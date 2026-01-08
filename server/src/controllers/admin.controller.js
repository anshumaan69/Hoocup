const User = require('../models/user');

// @desc    Get all users
// @route   GET /api/admin/users
// @access  Private/Admin
exports.getAllUsers = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const users = await User.find({ deletedAt: null })
            .select('-password -refresh_token_hash')
            .sort({ created_at: -1 })
            .skip(skip)
            .limit(limit);

        const total = await User.countDocuments({ deletedAt: null });

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
// @desc    Delete user
// @route   DELETE /api/admin/users/:id
// @access  Private/Admin
exports.deleteUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (user.role === 'admin') {
            return res.status(403).json({ message: 'Cannot delete an admin account' });
        }

        // Soft Delete
        user.deletedAt = new Date();
        await user.save();
        
        res.status(200).json({ message: 'User removed' });
    } catch (error) {
        console.error('Delete User Error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Update user status (Ban/Suspend/Active)
// @route   PATCH /api/admin/users/:id/status
// @access  Private/Admin
// @desc    Get dashboard stats
// @route   GET /api/admin/stats
// @access  Private/Admin
exports.getStats = async (req, res) => {
    try {
        const totalUsers = await User.countDocuments({ deletedAt: null });
        const activeUsers = await User.countDocuments({ status: 'active', deletedAt: null });
        const suspendedUsers = await User.countDocuments({ status: 'suspended', deletedAt: null });
        const bannedUsers = await User.countDocuments({ status: 'banned', deletedAt: null });

        res.status(200).json({
            success: true,
            totalUsers,
            activeUsers,
            suspendedUsers,
            bannedUsers
        });
    } catch (error) {
        console.error('Admin Stats Error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

exports.updateUserStatus = async (req, res) => {
    try {
        const { status } = req.body; // 'active', 'banned', 'suspended'
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (user.role === 'admin') {
             return res.status(403).json({ message: 'Cannot change status of an admin account' });
        }

        user.status = status;

        if (status === 'banned') {
            // Default 30 days ban
            const banDate = new Date();
            banDate.setDate(banDate.getDate() + 30);
            user.banExpiresAt = banDate;
        } else {
            user.banExpiresAt = undefined;
        }

        await user.save();

        res.status(200).json({ success: true, user });
    } catch (error) {
        console.error('Update Status Error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};
