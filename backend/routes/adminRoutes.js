const express = require('express');
const router = express.Router();

const ctrl = require('../controllers/adminController');
const {
    requireAdmin,
    requireSuperAdmin
} = require('../middleware/adminAuth');

router.post('/login', ctrl.login);

router.get('/session', ctrl.session);

router.post(
    '/admins',
    requireAdmin,
    requireSuperAdmin,
    ctrl.createAdmin
);

router.post(
    '/password',
    requireAdmin,
    ctrl.changePassword
);

router.get(
    '/admins',
    requireAdmin,
    requireSuperAdmin,
    ctrl.getAdmins
);

router.get(
    '/dashboard',
    requireAdmin,
    ctrl.getDashboard
);

router.patch(
    '/admins/:id/status',
    requireAdmin,
    requireSuperAdmin,
    ctrl.setAdminStatus
);
router.post('/logout', ctrl.logout);

module.exports = router;


