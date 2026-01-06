// config/multer.js
const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("./cloudinary");

const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => ({
    folder: "avatars",
    resource_type: "image",

    // 🔥 INDUSTRY STANDARD TRANSFORMATIONS
    transformation: [
      { width: 512, height: 512, crop: "fill", gravity: "face" },
      { fetch_format: "auto" },
      { quality: "auto:good" },
    ],

    public_id: `user_${req.user.id}`, // overwrite old avatar
  }),
});

module.exports = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});
