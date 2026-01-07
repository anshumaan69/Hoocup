const express = require('express');
const router = express.Router();
const { getAllUsers, createUser, deleteUser, updateUserStatus } = require('../controllers/admin.controller');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect); // All admin routes needed login
router.use(authorize('admin')); // All admin routes need admin role

router.route('/users')
    .get(getAllUsers)
    .post(createUser);

router.route('/users/:id')
    .delete(deleteUser);

router.route('/users/:id/status')
    .patch(updateUserStatus);

module.exports = router;
