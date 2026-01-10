const mongoose = require('mongoose');

const photoAccessRequestSchema = new mongoose.Schema({
    requester: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    targetUser: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'granted', 'rejected'],
        default: 'pending'
    },
    grantedAt: {
        type: Date
    },
    rejectedAt: {
        type: Date
    },
    reviewedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true
});

// Ensure a user can only have one active request per target user
// However, if rejected, they might want to request again later (handled by logic),
// but for DB integrity, let's keep it unique pair. Logic should update existing doc.
photoAccessRequestSchema.index({ requester: 1, targetUser: 1 }, { unique: true });

module.exports = mongoose.model('PhotoAccessRequest', photoAccessRequestSchema);
