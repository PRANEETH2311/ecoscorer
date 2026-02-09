const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const auth = require('../middleware/auth');

// Public routes
router.post('/register', authController.register);
router.post('/login', authController.login);

// Protected routes (require authentication)
router.put('/profile', auth, authController.updateProfile);
router.delete('/account', auth, authController.deleteAccount);

module.exports = router;
