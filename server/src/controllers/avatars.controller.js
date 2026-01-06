// controllers/avatar.controller.js
const { v4: uuid } = require("uuid");
const storage = require("../config/gcs");
let bucket;
if (process.env.GCP_BUCKET_NAME) {
    bucket = storage.bucket(process.env.GCP_BUCKET_NAME);
} else {
    console.warn("⚠️ GCP_BUCKET_NAME is missing in .env. Avatar features will not work.");
}
const User = require('../models/user');

exports.getAvatarUploadUrl = async (req, res) => {
  if (!bucket) {
      return res.status(500).json({ message: 'Server configuration error: Bucket not defined' });
  }
  const fileName = `avatars/${req.user.id}-${uuid()}.webp`;
  const file = bucket.file(fileName);

  const [uploadUrl] = await file.getSignedUrl({
    version: "v4",
    action: "write",
    expires: Date.now() + 5 * 60 * 1000,
    contentType: "image/webp",
  });

  res.json({ uploadUrl, filePath: fileName });
};

exports.saveAvatar = async (req, res) => {
  try {
      const { filePath } = req.body;
      const imageUrl = `https://storage.googleapis.com/${process.env.GCP_BUCKET_NAME}/${filePath}`;

      await User.findByIdAndUpdate(req.user.id, {
        avatar: imageUrl,
      });

      res.json({ avatar: imageUrl });
  } catch (error) {
      console.error('Save Avatar Error:', error);
      res.status(500).json({ message: 'Failed to save avatar' });
  }
};

