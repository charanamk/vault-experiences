const bcrypt = require('bcryptjs');
const adminModel = require('../models/adminModel');

function sanitizeEmail(raw) {
    return String(raw || '').trim().toLowerCase();
}

function getSessionIdFromRequest(req) {
    const cookieValue =
        req.cookies?.vault_admin_session ||
        req.headers.cookie?.split('vault_admin_session=').slice(1).join('=') ||
        '';

    if (!cookieValue) return '';

    return decodeURIComponent(cookieValue.split(';')[0].trim());
}

function setSessionCookie(res, sessionId) {
    res.cookie('vault_admin_session', sessionId, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: 1000 * 60 * 60 * 24 * 7
    });
}

function clearSessionCookie(res) {
    res.clearCookie('vault_admin_session', {
        httpOnly: true,
        sameSite: 'lax',
        secure: false,
        path: '/'
    });
}

async function getAuthenticatedAdmin(req) {
    const pool = req.app.get('dbPool');
    const sessionId = getSessionIdFromRequest(req);

    if (!sessionId) return null;

    const session = await adminModel.findSessionById(pool, sessionId);

    if (!session) return null;

    const admin = await adminModel.findById(pool, session.admin_id);

    if (!admin || !admin.is_active) return null;

    await adminModel.touchSession(pool, sessionId);

    return { admin, session };
}

function serializeAdmin(admin) {
    if (!admin) return null;

    return {
        id: admin.id,
        email: admin.email,
        fullName: admin.full_name,
        role: admin.role,
        isActive: admin.is_active,
        lastLoginAt: admin.last_login_at,
        createdAt: admin.created_at
    };
}

async function login(req, res) {
    const pool = req.app.get('dbPool');

    const email = sanitizeEmail(req.body?.email);
    const password = String(req.body?.password || '');

    if (!email || !password) {
        return res.status(400).json({
            message: 'Email and password are required.'
        });
    }

    try {
        const admin = await adminModel.findByEmail(pool, email);

        if (!admin || !admin.is_active) {
            return res.status(401).json({
                message: 'Invalid admin credentials.'
            });
        }

        const valid = await bcrypt.compare(
            password,
            admin.password_hash
        );

        if (!valid) {
            return res.status(401).json({
                message: 'Invalid admin credentials.'
            });
        }

        const session = await adminModel.createSession(
            pool,
            admin.id,
            1000 * 60 * 60 * 24 * 7
        );

        await adminModel.updateLastLogin(pool, admin.id);

        setSessionCookie(res, session.sessionId);

        return res.json({
            success: true,
            admin: serializeAdmin(admin),
            expiresAt: session.expiresAt
        });

    } catch (error) {
        console.error('ADMIN LOGIN:', error);

        return res.status(500).json({
            message: 'Admin login failed.'
        });
    }
}

async function session(req, res) {
    try {
        const auth = await getAuthenticatedAdmin(req);

        if (!auth) {
            return res.status(401).json({
                message: 'No active admin session.'
            });
        }

        return res.json({
            success: true,
            admin: serializeAdmin(auth.admin)
        });

    } catch (error) {
        console.error('ADMIN SESSION:', error);

        return res.status(500).json({
            message: 'Failed to retrieve admin session.'
        });
    }
}

async function logout(req, res) {
    const pool = req.app.get('dbPool');

    try {
        const sessionId = getSessionIdFromRequest(req);

        if (sessionId) {
            await adminModel.revokeSession(pool, sessionId);
        }

        clearSessionCookie(res);

        return res.json({
            success: true,
            message: 'Admin logged out.'
        });

    } catch (error) {
        console.error('ADMIN LOGOUT:', error);

        clearSessionCookie(res);

        return res.status(500).json({
            message: 'Admin logout failed.'
        });
    }
}

async function changePassword(req, res) {
    const pool = req.app.get('dbPool');

    try {
        const auth = await getAuthenticatedAdmin(req);

        if (!auth) {
            return res.status(401).json({
                message: 'Authentication required.'
            });
        }

        const currentPassword =
            String(req.body?.currentPassword || '');

        const newPassword =
            String(req.body?.newPassword || '');

        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                message: 'Current password and new password are required.'
            });
        }

        if (newPassword.length < 8) {
            return res.status(400).json({
                message: 'New password must be at least 8 characters long.'
            });
        }

        const valid = await bcrypt.compare(
            currentPassword,
            auth.admin.password_hash
        );

        if (!valid) {
            return res.status(401).json({
                message: 'Current password is incorrect.'
            });
        }

        const salt = await bcrypt.genSalt(10);

        const passwordHash = await bcrypt.hash(
            newPassword,
            salt
        );

        await adminModel.updatePassword(
            pool,
            auth.admin.id,
            passwordHash
        );

        return res.json({
            success: true,
            message: 'Admin password updated successfully.'
        });

    } catch (error) {
        console.error('ADMIN PASSWORD CHANGE:', error);

        return res.status(500).json({
            message: 'Failed to update admin password.'
        });
    }
}
async function createAdmin(req, res) {
    const pool = req.app.get('dbPool');

    try {
        const auth = await getAuthenticatedAdmin(req);

        if (!auth) {
            return res.status(401).json({
                message: 'Authentication required.'
            });
        }

        if (auth.admin.role !== 'super_admin') {
            return res.status(403).json({
                message: 'Only a super admin can create another admin.'
            });
        }

        const email = sanitizeEmail(req.body?.email);
        const password = String(req.body?.password || '');
        const fullName = String(req.body?.fullName || '').trim();
        const role = String(req.body?.role || 'admin').trim();

        if (!email || !password || !fullName) {
            return res.status(400).json({
                message: 'Full name, email and password are required.'
            });
        }

        if (password.length < 8) {
            return res.status(400).json({
                message: 'Password must be at least 8 characters long.'
            });
        }

        if (!['admin', 'super_admin'].includes(role)) {
            return res.status(400).json({
                message: 'Invalid admin role.'
            });
        }

        const existing = await adminModel.findByEmail(pool, email);

        if (existing) {
            return res.status(409).json({
                message: 'An admin with that email already exists.'
            });
        }

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        const admin = await adminModel.createAdmin(
            pool,
            email,
            passwordHash,
            fullName,
            role
        );

        return res.status(201).json({
            success: true,
            message: 'Admin account created successfully.',
            admin: serializeAdmin(admin)
        });

    } catch (error) {
        console.error('CREATE ADMIN:', error);

        return res.status(500).json({
            message: 'Failed to create admin account.'
        });
    }
}

async function getAdmins(req, res) {
    const pool = req.app.get('dbPool');

    try {
        const auth = await getAuthenticatedAdmin(req);

        if (!auth) {
            return res.status(401).json({
                message: 'Authentication required.'
            });
        }

        if (auth.admin.role !== 'super_admin') {
            return res.status(403).json({
                message: 'Only a super admin can view administrators.'
            });
        }

        const admins = await adminModel.getAllAdmins(pool);

        return res.json({
            success: true,
            admins: admins.map(serializeAdmin)
        });

    } catch (error) {
        console.error('GET ADMINS:', error);

        return res.status(500).json({
            message: 'Failed to load administrators.'
        });
    }
}


async function setAdminStatus(req, res) {
    const pool = req.app.get('dbPool');

    try {
        const auth = await getAuthenticatedAdmin(req);

        if (!auth) {
            return res.status(401).json({
                message: 'Authentication required.'
            });
        }

        if (auth.admin.role !== 'super_admin') {
            return res.status(403).json({
                message: 'Only a super admin can change administrator status.'
            });
        }

        const adminId =
            String(req.params?.id || '').trim();

        const isActive =
            req.body?.isActive;

        if (!adminId) {
            return res.status(400).json({
                message: 'Administrator ID is required.'
            });
        }

        if (typeof isActive !== 'boolean') {
            return res.status(400).json({
                message: 'isActive must be true or false.'
            });
        }

        if (adminId === auth.admin.id) {
            return res.status(400).json({
                message: 'You cannot change the status of your own account.'
            });
        }

        const targetAdmin =
            await adminModel.findById(
                pool,
                adminId
            );

        if (!targetAdmin) {
            return res.status(404).json({
                message: 'Administrator not found.'
            });
        }

        const admin =
            await adminModel.setAdminActive(
                pool,
                adminId,
                isActive
            );

        return res.json({
            success: true,
            message: isActive
                ? 'Administrator activated successfully.'
                : 'Administrator deactivated successfully.',
            admin: serializeAdmin(admin)
        });

    } catch (error) {
        console.error('SET ADMIN STATUS:', error);

        return res.status(500).json({
            message: 'Failed to update administrator status.'
        });
    }
}

async function getDashboard(req, res) {
    const pool = req.app.get('dbPool');

    try {
        const auth = await getAuthenticatedAdmin(req);

        if (!auth) {
            return res.status(401).json({
                message: 'Authentication required.'
            });
        }

        const [
            eventsResult,
            bookingsResult,
            ticketsResult,
            customersResult,
            upcomingResult
        ] = await Promise.all([
            pool.query(`
                SELECT COUNT(*)::int AS count
                FROM events
            `),

            pool.query(`
                SELECT COUNT(*)::int AS count
                FROM reservations
            `),

            pool.query(`
                SELECT COALESCE(SUM(sold), 0)::int AS count
                FROM tickets
            `),

            pool.query(`
                SELECT COUNT(*)::int AS count
                FROM customers
            `),

            pool.query(`
                SELECT
                    id,
                    title,
                    theme,
                    description,
                    image,
                    event_date AS date,
                    event_time AS time,
                    location,
                    status
                FROM events
                WHERE status = 'upcoming'
                ORDER BY event_date ASC, event_time ASC NULLS LAST
            `)
        ]);

        return res.json({
            success: true,

            stats: {
                events: eventsResult.rows[0].count,
                bookings: bookingsResult.rows[0].count,
                tickets: ticketsResult.rows[0].count,
                revenue: 0
            },

            customers: customersResult.rows[0].count,

            upcoming: upcomingResult.rows
        });

    } catch (error) {
        console.error('ADMIN DASHBOARD:', error);

        return res.status(500).json({
            message: 'Failed to load admin dashboard.'
        });
    }
}

module.exports = {
login,
session,
logout,
changePassword,
createAdmin,
getAdmins,
setAdminStatus,
getAuthenticatedAdmin,
    serializeAdmin,
getDashboard
};





