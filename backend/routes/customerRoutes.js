const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/customerController');

router.post('/guest', ctrl.postGuest);
router.post('/register', ctrl.postRegister);
router.post('/email-signin', ctrl.postEmailSignIn);
router.get('/google', ctrl.googleStart);
router.get('/google/callback', ctrl.googleCallback);
router.post('/logout', ctrl.logout);
router.get('/session', ctrl.getSession);
router.get('/me', ctrl.getCurrentCustomer);
router.patch('/me/profile', ctrl.updateProfile);
router.patch('/me/password', ctrl.changePassword);
router.get('/me/preferences', ctrl.getPreferences);
router.patch('/me/preferences', ctrl.updatePreferences);
router.post('/email/verify', ctrl.verifyEmail);
router.post('/email/verification/request', ctrl.requestEmailVerification);
router.post('/password-reset/request', ctrl.requestPasswordReset);
router.post('/password-reset/confirm', ctrl.resetPassword);
router.get('/:id', ctrl.getCustomerById);

module.exports = router;

