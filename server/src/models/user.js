const mongoose = require('mongoose');

const photoSchema = new mongoose.Schema(
  {
    url: {
      type: String,
      required: true,
    },
    publicId: {
      type: String,
      required: true,
    },
    isProfile: {
      type: Boolean,
      default: false,
    },
    order: {
      type: Number,
      min: 0,
      max: 3,
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true,
    },

    phone: {
      type: String,
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

    role: {
        type: String,
        enum: ['user', 'admin', 'superadmin'],
        default: 'user',
    },



    username: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },

    bio: {
      type: String,
      maxLength: 150,
      default: '',
    },

    first_name: {
      type: String,
      trim: true,
    },

    last_name: {
      type: String,
      trim: true,
    },

    dob: {
      type: Date,
    },

    // BACKWARD COMPATIBILITY (can be deprecated later)
    // NEW MULTI-PHOTO FEATURE
    photos: {
      type: [{
          url: { type: String, required: true },
          publicId: { type: String, required: true },
          isProfile: { type: Boolean, default: false },
          order: { type: Number, default: 0 },
          uploadedAt: { type: Date, default: Date.now }
      }],
      validate: [
        {
          validator: function (v) {
            return v.length <= 4;
          },
          message: 'Maximum 4 photos allowed',
        },
      ],
      default: [],
    },

    // QUICK ACCESS PROFILE PHOTO
    profilePhoto: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      enum: ['active', 'banned', 'suspended'],
      default: 'active',
    },
    banExpiresAt: {
      type: Date,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: {
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
  }
);

module.exports = mongoose.model('User', userSchema);
