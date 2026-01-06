// controllers/avatar.controller.js
const User = require('../models/user');

exports.uploadAvatar = async (req, res) => {
  try {
     if (!req.file) {
        return res.status(400).json({ message: "Image required" });
      }
    
      // Cloudinary (via Multer) has already uploaded the file and put details in req.file
      // req.file.path contains the secure URL
      
      const updatedUser = await User.findByIdAndUpdate(req.user.id, {
        avatar: req.file.path,
      }, { new: true });
    
      res.json({
        avatar: updatedUser.avatar,
        message: 'Avatar updated successfully'
      });
  } catch (error) {
    console.error('Avatar Upload Error:', error);
    res.status(500).json({ message: 'Failed to upload avatar' });
  }
};

