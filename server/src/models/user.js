const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        unique: true,
        sparse: true, // Allows null/undefined to not violate unique constraint if needed, but email should usually be unique
    },
    phone: {
        type: String,
        required: false,
        unique: true,
        sparse: true,
    },
    auth_provider: {
        type: String,
        enum: ['google', 'local', 'google_phone'],
        default: 'local',
    },
    is_phone_verified: {
        type: Boolean,
        default: false,
    },
    is_profile_complete: {
        type: Boolean,
        default: false,
    },
    username: {
        type: String,
        unique: true,
        sparse: true,
    },
    first_name: {
        type: String,
    },
    last_name: {
        type: String,
    },
    dob: {
        type: Date,
    },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

module.exports = mongoose.model('User', userSchema);
