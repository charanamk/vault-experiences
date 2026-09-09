const adminController = require('../controllers/adminController');

async function requireAdmin(req, res, next) {
    try {
        const auth = await adminController.getAuthenticatedAdmin(req);

        if (!auth) {
            return res.status(401).json({
                message: 'Admin authentication required.'
            });
        }

        req.admin = auth.admin;
        req.adminSession = auth.session;

        next();
    } catch (error) {
        console.error('ADMIN AUTH:', error);

        return res.status(500).json({
            message: 'Admin authentication failed.'
        });
    }
}

function requireRole(...allowedRoles) {
    return (req, res, next) => {
        if (!req.admin) {
            return res.status(401).json({
                message: 'Admin authentication required.'
            });
        }

        if (!allowedRoles.includes(req.admin.role)) {
            return res.status(403).json({
                message: 'Insufficient admin permissions.'
            });
        }

        next();
    };
}

const requireSuperAdmin = requireRole('super_admin');

module.exports = {
    requireAdmin,
    requireRole,
    requireSuperAdmin
};
