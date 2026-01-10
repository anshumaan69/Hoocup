const PhotoAccessRequest = require('../models/PhotoAccessRequest');
const User = require('../models/user');

// @desc    Request access to a user's photos
// @route   POST /api/users/photo-access/request
// @access  Private
exports.requestAccess = async (req, res) => {
    const { targetUserId } = req.body;
    const requesterId = req.user.id;

    if (!targetUserId) {
        return res.status(400).json({ message: 'Target user ID is required' });
    }

    if (requesterId === targetUserId) {
        return res.status(400).json({ message: 'Cannot request access to your own profile' });
    }

    try {
        const targetUser = await User.findById(targetUserId);
        if (!targetUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Check for existing request
        let request = await PhotoAccessRequest.findOne({ requester: requesterId, targetUser: targetUserId });

        if (request) {
            // Logic to handle re-requesting
            if (request.status === 'pending') {
                return res.status(400).json({ message: 'A request is already pending', request });
            }
            if (request.status === 'granted') {
                return res.status(400).json({ message: 'Access already granted', request });
            }
            if (request.status === 'rejected') {
                // Allow re-request after cooldown? For simplicity now, allow immediate re-request
                // Or maybe just update status back to pending
                request.status = 'pending';
                request.rejectedAt = undefined;
                request.reviewedBy = undefined;
                await request.save();
                return res.status(200).json({ message: 'Access request re-submitted', request });
            }
        } else {
            // Create new
            request = await PhotoAccessRequest.create({
                requester: requesterId,
                targetUser: targetUserId,
                status: 'pending'
            });
        }

        res.status(201).json({ message: 'Access request sent', request });
    } catch (error) {
        console.error('Request Access Error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get all pending requests (Admin)
// @route   GET /api/admin/photo-access/requests
// @access  Private (Admin)
exports.getPendingRequests = async (req, res) => {
    try {
        const requests = await PhotoAccessRequest.find({ status: 'pending' })
            .populate('requester', 'username first_name last_name avatar')
            .populate('targetUser', 'username first_name last_name avatar')
            .sort({ createdAt: -1 });

        res.status(200).json({ count: requests.length, data: requests });
    } catch (error) {
        console.error('Get Pending Requests Error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Update request status (Approve/Reject)
// @route   PATCH /api/admin/photo-access/requests/:id
// @access  Private (Admin)
exports.updateAccessStatus = async (req, res) => {
    const { id } = req.params;
    const { status } = req.body; // 'granted' or 'rejected'

    if (!['granted', 'rejected'].includes(status)) {
        return res.status(400).json({ message: 'Invalid status' });
    }

    try {
        const request = await PhotoAccessRequest.findById(id);
        if (!request) {
            return res.status(404).json({ message: 'Request not found' });
        }

        request.status = status;
        request.reviewedBy = req.user.id;
        
        if (status === 'granted') {
            request.grantedAt = Date.now();
        } else {
            request.rejectedAt = Date.now();
        }

        await request.save();

        res.status(200).json({ message: `Request ${status}`, request });
    } catch (error) {
        console.error('Update Access Request Error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get access status for a specific user
// @route   GET /api/users/photo-access/status/:targetUserId
// @access  Private
exports.getAccessStatus = async (req, res) => {
    const { targetUserId } = req.params;
    const requesterId = req.user.id;

    try {
        const request = await PhotoAccessRequest.findOne({ requester: requesterId, targetUser: targetUserId });
        if (!request) {
            return res.status(200).json({ status: 'none' });
        }
        res.status(200).json({ status: request.status, request });
    } catch (error) {
        console.error('Get Access Status Error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};
