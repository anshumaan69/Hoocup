const mongoose = require('mongoose');

const tempUserSchema = new mongoose.Schema({
    adminId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    // Store array of user objects directly
    data: {
        type: Array, 
        required: true
    },
    // TTL Index: Auto-delete after 24 hours (86400 seconds)
    createdAt: {
        type: Date,
        default: Date.now,
        index: { expires: 86400 } 
    }
});

module.exports = mongoose.model('TempUser', tempUserSchema);
