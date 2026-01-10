const User = require('../models/user');
const PhotoAccessRequest = require('../models/PhotoAccessRequest');

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
            .select('username first_name last_name avatar profilePhoto photos bio created_at role')
            .sort({ updated_at: -1 }) // Show recently active/updated users first
            .skip(skip)
            .limit(limit);

        // Transform data ensures we have a nice list of photos for the carousel
        // Fetch access requests for these users if not admin/superadmin
        let grantedUserIds = new Set();
        const isAdmin = ['admin', 'superadmin'].includes(req.user.role);
        
        if (!isAdmin) {
             const grantedRequests = await PhotoAccessRequest.find({
                requester: req.user.id,
                status: 'granted',
                targetUser: { $in: users.map(u => u._id) }
             }).select('targetUser');
             
             grantedRequests.forEach(req => grantedUserIds.add(req.targetUser.toString()));
        }

        // Transform data ensures we have a nice list of photos for the carousel
        const feedData = users.map(user => {
            const userObj = user.toObject();
            
            // Ensure photos array exists
            let photos = userObj.photos || [];

            // Sort photos: Profile photo (isProfile: true) must be first (index 0)
            photos.sort((a, b) => (b.isProfile ? 1 : 0) - (a.isProfile ? 1 : 0));

            // FILTERING LOGIC
            const hasAccess = isAdmin || grantedUserIds.has(userObj._id.toString());
            
            if (!hasAccess && photos.length > 1) {
                photos = photos.map((photo, index) => {
                    // First photo is always visible
                    if (index === 0) return photo;
                    
                    // Respond with metadata placeholder
                    return {
                        _id: photo._id,
                        restricted: true,
                        isProfile: photo.isProfile,
                        order: photo.order
                    };
                });
            }

            return {
                _id: userObj._id,
                username: userObj.username,
                avatar: userObj.avatar,
                bio: userObj.bio,
                photos: photos,
                role: userObj.role // Include role for UI customization
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