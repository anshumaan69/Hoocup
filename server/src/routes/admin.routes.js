const express = require('express');
const router = express.Router();
const { getAllUsers, createUser, deleteUser, updateUserStatus, getStats, uploadBulkUsers, saveBulkUsers, getBulkPreview, cancelBulkUpload } = require('../controllers/admin.controller');
const uploadMemory = require('../config/multerMemory'); // Reusing memory storage from auth routes
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect); // All admin routes needed login
router.use(authorize('admin')); // All admin routes need admin role

router.get('/stats', getStats);
router.route('/users')
    .get(getAllUsers)
    .post(createUser);

router.post('/upload', uploadMemory.single('file'), uploadBulkUsers);
router.get('/upload-preview', getBulkPreview);
router.delete('/upload-cancel', cancelBulkUpload);
router.post('/bulk-save', saveBulkUsers);

router.route('/users/:id')
    .delete(deleteUser);

router.route('/users/:id/status')
    .patch(updateUserStatus);

module.exports = router;
