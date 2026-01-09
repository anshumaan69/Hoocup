const mongoose = require('mongoose');
const User = require('../models/user');
const TempUser = require('../models/tempUser');
const xlsx = require('xlsx');

// @desc    Upload bulk users (Parse & Temp Store)
// @route   POST /api/admin/upload
// @access  Private/Admin
exports.uploadBulkUsers = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        // Parse File
        const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const rawData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

        if (!rawData || rawData.length === 0) {
            return res.status(400).json({ message: 'File is empty' });
        }

        // Validate & Structure Data
        const validUsers = [];
        const errors = [];

        for (const [index, row] of rawData.entries()) {
            // Normalize Keys (case insensitive check usually good, or strict)
            // Expect keys: username, email, phone, first_name, last_name, bio
            
            let username = row.username || row.Username;
            
            // Auto-generate username if missing
            if (!username) {
                const baseName = (row.first_name || row.FirstName || 'user').toString().toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 10);
                const randomSuffix = Math.floor(1000 + Math.random() * 9000); // 4 digit random
                username = `${baseName}${randomSuffix}`;
            }

            const user = {
                username: username,
                email: row.email || row.Email,
                phone: row.phone || row.Phone,
                first_name: row.first_name || row.FirstName || 'User',
                last_name: row.last_name || row.LastName || '',
                role: 'user', // Default
                is_phone_verified: false,
                is_profile_complete: true,
            };

            // Normalize Phone
            if (user.phone) {
                let p = user.phone.toString().replace(/\s+/g, '').replace(/-/g, '');
                if (/^\d{10}$/.test(p)) {
                     p = '+91' + p;
                }
                user.phone = p;
            }

            // --- VALIDATION RULES ---
            
            // 1. Required Fields (Username is handled/generated, so just check contacts)
            if (!user.email && !user.phone) {
                 return res.status(400).json({ message: `Row ${index + 1}: Missing required fields (either email or phone is required)` });
            }

            // 2. Email Format
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (user.email && !emailRegex.test(user.email)) {
                return res.status(400).json({ message: `Row ${index + 1}: Invalid email format (${user.email})` });
            }

            // 3. Phone Format (E.164ish: + followed by 7-15 digits)
            const phoneRegex = /^\+?[1-9]\d{7,14}$/;
            if (user.phone && !phoneRegex.test(user.phone)) {
                 return res.status(400).json({ message: `Row ${index + 1}: Invalid phone format (${user.phone}). Use E.164 (e.g. +919876543210)` });
            }

            // 4. Username Format (Alphanumeric, underscores, 3-20 chars)
            const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
            if (!usernameRegex.test(user.username)) {
                 return res.status(400).json({ message: `Row ${index + 1}: Invalid username (${user.username}). Must be 3-20 alphanumeric characters or underscores.` });
            }
            
            // 5. Duplicate Check (Internal to file)
            const duplicateInFile = validUsers.find(u => 
                (u.username === user.username) || 
                (user.email && u.email === user.email) ||
                (user.phone && u.phone === user.phone)
            );
            
            if (duplicateInFile) {
                 return res.status(400).json({ message: `Row ${index + 1}: Duplicate entry found in file (Username, Email, or Phone already in row ${validUsers.indexOf(duplicateInFile) + 1})` });
            }

            validUsers.push(user);
        }
        
        // Remove existing temp data for this admin to avoid verify/mixup
        await TempUser.deleteMany({ adminId: req.user.id });

        // Save to TempDB
        await TempUser.create({
            adminId: req.user.id,
            data: validUsers
        });

        res.status(200).json({ 
            success: true, 
            message: `File parsed successfully. ${validUsers.length} users ready to save.`,
            count: validUsers.length
        });

    } catch (error) {
        console.error('Bulk Upload Error:', error);
        res.status(500).json({ message: 'File parsing failed', error: error.message });
    }
};

// @desc    Commit bulk users to DB
// @route   POST /api/admin/bulk-save
// @access  Private/Admin
exports.saveBulkUsers = async (req, res) => {
    try {
        // Retrieve Temp Data
        const tempEntry = await TempUser.findOne({ adminId: req.user.id });

        if (!tempEntry || !tempEntry.data || tempEntry.data.length === 0) {
            return res.status(400).json({ message: 'No uploaded data found. Please upload a file first.' });
        }

        const usersToInsert = tempEntry.data;
        
        // Bulk Insert (ordered: false continues even if some fail due to duplicates)
        try {
            const result = await User.insertMany(usersToInsert, { ordered: false });
             // Cleanup Temp
            await TempUser.deleteOne({ _id: tempEntry._id });
            
            res.status(200).json({ 
                success: true, 
                message: 'Users saved successfully',
                insertedCount: result.length,
                totalRequested: usersToInsert.length
            });
        } catch (bulkError) {
            // Handle Partial Success (e.g. duplicates)
            if (bulkError.code === 11000 || bulkError.message.includes('duplicate key')) {
                 const inserted = bulkError.insertedDocs.length;
                  // Cleanup Temp even on partial? "Save Changes" usually implies "Done".
                  // Keeping it might allow retry? But duplicates won't fix themselves.
                  // Let's clear it to avoid confusion.
                 await TempUser.deleteOne({ _id: tempEntry._id });

                 return res.status(200).json({ // 200 because partial success
                    success: true,
                    message: `Operation complete with some duplicate skips.`,
                    insertedCount: inserted,
                    totalRequested: usersToInsert.length,
                    warnings: 'Some users were skipped because they already exist.'
                });
            }
            throw bulkError;
        }

    } catch (error) {
        console.error('Bulk Save Error:', error);
        res.status(500).json({ message: 'Failed to save users', error: error.message });
    }
};


// @desc    Get preview of bulk upload (Paginated)
// @route   GET /api/admin/upload-preview
// @access  Private/Admin
exports.getBulkPreview = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const skip = (page - 1) * limit;

        const tempEntry = await TempUser.findOne({ adminId: req.user.id }, { 
            data: { $slice: [skip, limit] }, // Get slice of data array
            // Optimization: We also need total count.
            // But projection prevents getting full array length easily in one query if we only project slice.
            // For preview, we might query twice or just project slice and use aggregation for count.
        });
        
        // Separate query for total count (or fetch full document if memory allows - but for 100k, don't).
        // Using aggregation for count is better.
        const countResult = await TempUser.aggregate([
            { $match: { adminId: new mongoose.Types.ObjectId(req.user.id) } },
            { $project: { count: { $size: "$data" } } }
        ]);

        const total = countResult.length > 0 ? countResult[0].count : 0;
        const previewData = tempEntry ? tempEntry.data : [];

        res.status(200).json({
            success: true,
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
            data: previewData
        });

    } catch (error) {
        console.error('Preview Error:', error);
        res.status(500).json({ message: 'Failed to get preview', error: error.message });
    }
};

// @desc    Cancel bulk upload (Delete temp data)
// @route   DELETE /api/admin/upload-cancel
// @access  Private/Admin
exports.cancelBulkUpload = async (req, res) => {
    try {
        const result = await TempUser.deleteOne({ adminId: req.user.id });
        
        if (result.deletedCount === 0) {
            return res.status(404).json({ message: 'No active upload to cancel' });
        }

        res.status(200).json({ success: true, message: 'Upload cancelled and temp data cleared' });
    } catch (error) {
        console.error('Cancel Upload Error:', error);
        res.status(500).json({ message: 'Failed to cancel upload', error: error.message });
    }
};

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
