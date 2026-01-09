const User = require('../models/user');

// @desc    Get Feed Users (Users with photos)
// @route   GET /api/users/feed
// @access  Private
exports.getFeed = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        // Find users who have at least one photo OR a profile photo
        // AND are active (not banned/suspended)
        const query = {
            status: 'active',
            _id: { $ne: req.user._id }, // Exclude current user
            $or: [
                { 'photos.0': { $exists: true } }, // Has at least 1 item in photos array
                { profilePhoto: { $ne: null } }
            ]
        };

        const users = await User.find(query)
            .select('username first_name last_name avatar profilePhoto photos bio created_at')
            .sort({ updated_at: -1 }) // Show recently active/updated users first
            .skip(skip)
            .limit(limit);

        // Transform data ensures we have a nice list of photos for the carousel
        const feedData = users.map(user => {
            const userObj = user.toObject();
            
            // Ensure photos array exists
            let photos = userObj.photos || [];

            // If profilePhoto exists, make sure it's the first one in the list (or added if missing)
            if (userObj.profilePhoto) {
                // Check if it's already in photos to avoid dupe (simple check by url string match might be enough)
                const exists = photos.some(p => p.url === userObj.profilePhoto);
                if (!exists) {
                    // Prepend as main photo
                    photos.unshift({
                        url: userObj.profilePhoto,
                        isProfile: true,
                        _id: 'main_profile'
                    });
                } else {
                    // Move profile photo to front
                    photos.sort((a, b) => (a.url === userObj.profilePhoto ? -1 : 1));
                }
            }

            // Filter out any broken structure if necessary, though schema guarantees structure usually
            
            return {
                _id: userObj._id,
                username: userObj.username,
                avatar: userObj.avatar,
                bio: userObj.bio,
                photos: photos
            };
        });

        res.status(200).json({
            success: true,
            count: feedData.length,
            data: feedData
        });
    } catch (error) {
        console.error('Get Feed Error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};
a