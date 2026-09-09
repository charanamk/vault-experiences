const bcrypt = require('bcryptjs');
const customerModel = require('../models/customerModel');

const loginAttempts = new Map();

function sanitizeEmail(raw) {
    return String(raw || '').trim().toLowerCase();
}

function sanitizePhone(raw) {
    return String(raw || '').trim().replace(/\s+/g, ' ');
}

function validateEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value || '');
}

function validatePhone(value) {
    return /^[+()\d\s-]{7,20}$/.test(value || '');
}

function getCustomerIdFromRequest(req) {
    const raw = req.body?.customerId || req.query?.customerId || req.headers['x-customer-id'];
    return typeof raw === 'string' ? raw.trim() : raw ? String(raw).trim() : '';
}

function getSessionIdFromRequest(req) {
    const cookieValue = req.cookies?.vault_session || req.headers.cookie?.split('vault_session=').slice(1).join('=') || '';
    if (!cookieValue) return '';
    return decodeURIComponent(cookieValue.split(';')[0].trim());
}

function setSessionCookie(res, sessionId) {
    res.cookie('vault_session', sessionId, {
        httpOnly: true,
        sameSite: 'lax',
        secure: false,
        path: '/',
        maxAge: 1000 * 60 * 60 * 24 * 7
    });
}

function clearSessionCookie(res) {
    res.clearCookie('vault_session', { httpOnly: true, sameSite: 'lax', secure: false, path: '/' });
}

function getClientKey(req) {
    return `${req.ip || 'unknown'}:${sanitizeEmail(req.body?.email || req.query?.email || '')}`;
}

function markFailedAttempt(req) {
    const key = getClientKey(req);
    const now = Date.now();
    const attempts = loginAttempts.get(key) || [];
    const recent = attempts.filter((ts) => now - ts < 1000 * 60 * 15);
    recent.push(now);
    loginAttempts.set(key, recent.slice(-5));
    return recent.length;
}

function clearFailedAttempt(req) {
    const key = getClientKey(req);
    loginAttempts.delete(key);
}

async function getOptionalAuthenticatedCustomer(req) {
    const pool = req.app.get('dbPool');
    const sessionId = getSessionIdFromRequest(req);
    if (!sessionId) {
        return null;
    }

    const session = await customerModel.findSessionById(pool, sessionId);
    if (!session) {
        return null;
    }

    const customer = await customerModel.findById(pool, session.customer_id);
    if (!customer) {
        return null;
    }

    await customerModel.touchSession(pool, sessionId);
    return { customer, session };
}

function serializeCustomer(customer) {
    if (!customer) return null;
    const { password_hash, ...safe } = customer;
    return {
        ...safe,
        customerId: customer.id,
        fullName: customer.full_name,
        phoneNumber: customer.phone_number,
        isGuest: !!customer.is_guest,
        emailVerified: !!customer.email_verified,
        notificationsEnabled: customer.notifications_enabled !== false,
        eventRemindersEnabled: customer.event_reminders_enabled !== false,
        privacyProfileVisible: customer.privacy_profile_visible !== false,
        privacyMarketingOptIn: !!customer.privacy_marketing_opt_in
    };
}

async function postGuest(req, res) {
    const pool = req.app.get('dbPool');
    try {
        const customer = await customerModel.createGuest(pool);
        const session = await customerModel.createSession(pool, customer.id, true, 1000 * 60 * 60 * 24 * 7);
        setSessionCookie(res, session.sessionId);
        return res.json({ customerId: customer.id, isGuest: true, createdAt: customer.created_at });
    } catch (error) {
        console.error('POST GUEST:', error);
        return res.status(500).json({ message: 'Failed to create guest customer' });
    }
}

async function postRegister(req, res) {
    const pool = req.app.get('dbPool');
    const { fullName, email, password, phoneNumber } = req.body || {};
    const trimmedEmail = sanitizeEmail(email);
    const trimmedName = String(fullName || '').trim();
    const trimmedPhone = sanitizePhone(phoneNumber);

    if (!trimmedEmail || !validateEmail(trimmedEmail)) {
        return res.status(400).json({ message: 'Please provide a valid email address.' });
    }

    if (!trimmedName) {
        return res.status(400).json({ message: 'Full name is required.' });
    }

    if (!password || String(password).length < 8) {
        return res.status(400).json({ message: 'Password must be at least 8 characters long.' });
    }

    if (trimmedPhone && !validatePhone(trimmedPhone)) {
        return res.status(400).json({ message: 'Please provide a valid phone number.' });
    }

    try {
        const existing = await customerModel.findByEmail(pool, trimmedEmail);
        if (existing) {
            return res.status(409).json({ message: 'An account with that email already exists.' });
        }

        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(password, salt);
        const created = await customerModel.createEmailCustomer(pool, trimmedEmail, hash, trimmedName);
        if (trimmedPhone) {
            await customerModel.updateCustomerProfile(pool, created.id, { fullName: trimmedName, email: trimmedEmail, phoneNumber: trimmedPhone });
        }

        const { token } = await customerModel.createVerificationToken(pool, created.id, trimmedEmail, 'email_verification', 1000 * 60 * 60 * 24 * 2);
        const session = await customerModel.createSession(pool, created.id, false, 1000 * 60 * 60 * 24 * 7);
        setSessionCookie(res, session.sessionId);

        return res.status(201).json({
            success: true,
            customerId: created.id,
            email: trimmedEmail,
            isGuest: false,
            emailVerified: false,
            verificationToken: process.env.NODE_ENV === 'production' ? undefined : token,
            message: 'Account created successfully.'
        });
    } catch (error) {
        console.error('POST REGISTER:', error);
        return res.status(500).json({ message: 'Registration failed' });
    }
}

async function postEmailSignIn(req, res) {
    const pool = req.app.get('dbPool');
    const { email, password } = req.body || {};
    const normalizedEmail = sanitizeEmail(email);

    if (!normalizedEmail || !password) {
        return res.status(400).json({
            message: 'Email and password are required.'
        });
    }

    const attemptCount = markFailedAttempt(req);

    if (attemptCount >= 5) {
        return res.status(429).json({
            message: 'Too many login attempts. Please try again in a few minutes.'
        });
    }

    try {
        const existing = await customerModel.findByEmail(
            pool,
            normalizedEmail
        );
/*
         * CUSTOMER DOES NOT EXIST
         * Create the account using the supplied email and password,
         * then log the customer in immediately.
         */
        if (!existing) {
            const salt = await bcrypt.genSalt(10);
            const hash = await bcrypt.hash(password, salt);

            const generatedName = normalizedEmail
                .split('@')[0]
                .replace(/[._-]+/g, ' ')
                .trim();

            const created = await customerModel.createEmailCustomer(
                pool,
                normalizedEmail,
                hash,
                generatedName || 'Vault Customer'
            );

            clearFailedAttempt(req);

            const session = await customerModel.createSession(
                pool,
                created.id,
                false,
                1000 * 60 * 60 * 24 * 7
            );

            setSessionCookie(res, session.sessionId);

            return res.status(201).json({
                success: true,
                customerId: created.id,
                email: created.email,
                isGuest: false,
                emailVerified: false,
                fullName: created.full_name || generatedName || 'Vault Customer',
                accountCreated: true,
                message: 'Account created and signed in successfully.'
            });
        }

        /*
         * CUSTOMER EXISTS
         * Check the supplied password against the stored hash.
         */
        if (!existing.password_hash) {
            markFailedAttempt(req);

            return res.status(401).json({
                message: 'This account does not have a password. Please use the appropriate sign-in method.'
            });
        }

        const ok = await bcrypt.compare(
            password,
            existing.password_hash
        );

        if (!ok) {
            markFailedAttempt(req);

            return res.status(401).json({
                message: 'Invalid credentials.'
            });
        }

        clearFailedAttempt(req);

        const session = await customerModel.createSession(
            pool,
            existing.id,
            !!existing.is_guest,
            1000 * 60 * 60 * 24 * 7
        );

        setSessionCookie(res, session.sessionId);

        return res.json({
            success: true,
            customerId: existing.id,
            email: existing.email,
            isGuest: !!existing.is_guest,
            emailVerified: !!existing.email_verified,
            fullName: existing.full_name || null,
            accountCreated: false,
            message: 'Signed in successfully.'
        });

    } catch (error) {
        console.error('POST EMAIL SIGN IN:', error);

        return res.status(500).json({
            message: 'Email sign-in failed.'
        });
    }
}
async function getSession(req, res) {
    const auth = await getOptionalAuthenticatedCustomer(req);
    if (!auth) {
        return res.status(401).json({ message: 'No active session.' });
    }

    return res.json({
        customer: serializeCustomer(auth.customer),
        sessionId: auth.session.session_id
    });
}

async function logout(req, res) {
    const pool = req.app.get('dbPool');
    const sessionId = getSessionIdFromRequest(req);
    if (sessionId) {
        await customerModel.revokeSession(pool, sessionId);
    }
    clearSessionCookie(res);
    return res.json({ success: true, message: 'Logged out.' });
}

async function getCustomerById(req, res) {
    const pool = req.app.get('dbPool');
    const id = req.params.id;
    if (!id) return res.status(400).json({ message: 'Missing customer id' });
    try {
        const customer = await customerModel.findById(pool, id);
        if (!customer) return res.status(404).json({ message: 'Customer not found' });
        return res.json(serializeCustomer(customer));
    } catch (error) {
        console.error('GET CUSTOMER BY ID:', error);
        return res.status(500).json({ message: 'Failed to retrieve customer' });
    }
}

async function getCurrentCustomer(req, res) {
    const pool = req.app.get('dbPool');
    const auth = await getOptionalAuthenticatedCustomer(req);
    if (!auth) {
        return res.status(401).json({ message: 'Authentication required.' });
    }

    const customer = await customerModel.findById(pool, auth.customer.id);
    if (!customer) {
        return res.status(404).json({ message: 'Customer not found.' });
    }

    return res.json(serializeCustomer(customer));
}

async function updateProfile(req, res) {
    const pool = req.app.get('dbPool');
    const auth = await getOptionalAuthenticatedCustomer(req);
    if (!auth) {
        return res.status(401).json({ message: 'Authentication required.' });
    }

    const { fullName, email, phoneNumber } = req.body || {};
    const trimmedName = String(fullName || '').trim();
    const trimmedEmail = sanitizeEmail(email);
    const trimmedPhone = sanitizePhone(phoneNumber);

    if (!trimmedName) {
        return res.status(400).json({ message: 'Full name is required.' });
    }

    if (!trimmedEmail || !validateEmail(trimmedEmail)) {
        return res.status(400).json({ message: 'Please enter a valid email address.' });
    }

    if (trimmedPhone && !validatePhone(trimmedPhone)) {
        return res.status(400).json({ message: 'Please enter a valid phone number.' });
    }

    try {
        if (auth.customer.is_guest) {
            return res.status(403).json({ message: 'Guest accounts use a temporary profile and cannot update email-based account details.' });
        }

        const existingEmailOwner = await customerModel.findByEmail(pool, trimmedEmail);
        if (existingEmailOwner && existingEmailOwner.id !== auth.customer.id) {
            return res.status(409).json({ message: 'That email address is already in use.' });
        }

        const updated = await customerModel.updateCustomerProfile(pool, auth.customer.id, {
            fullName: trimmedName,
            email: trimmedEmail,
            phoneNumber: trimmedPhone
        });

        if (!updated) {
            return res.status(404).json({ message: 'Customer not found.' });
        }

        return res.json({
            success: true,
            message: 'Profile updated successfully.',
            customer: serializeCustomer(updated)
        });
    } catch (error) {
        console.error('UPDATE PROFILE:', error);
        return res.status(500).json({ message: 'Failed to update profile.' });
    }
}

async function changePassword(req, res) {
    const pool = req.app.get('dbPool');
    const auth = await getOptionalAuthenticatedCustomer(req);
    if (!auth) {
        return res.status(401).json({ message: 'Authentication required.' });
    }

    const { currentPassword, newPassword, confirmPassword } = req.body || {};
    const customer = auth.customer;

    if (customer.is_guest || !customer.password_hash) {
        return res.status(403).json({ message: 'Password management is unavailable for guest accounts.' });
    }

    if (!currentPassword || !newPassword || !confirmPassword) {
        return res.status(400).json({ message: 'Current password, new password, and confirmation are required.' });
    }

    try {
        const currentMatches = await bcrypt.compare(currentPassword, customer.password_hash);
        if (!currentMatches) {
            return res.status(401).json({ message: 'Current password is incorrect.' });
        }

        if (newPassword.length < 8) {
            return res.status(400).json({ message: 'New password must be at least 8 characters long.' });
        }

        if (newPassword !== confirmPassword) {
            return res.status(400).json({ message: 'New password and confirmation do not match.' });
        }

        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(newPassword, salt);
        await customerModel.updatePassword(pool, customer.id, hash);
        return res.json({ success: true, message: 'Password updated successfully.' });
    } catch (error) {
        console.error('CHANGE PASSWORD:', error);
        return res.status(500).json({ message: 'Failed to change password.' });
    }
}

async function getPreferences(req, res) {
    const pool = req.app.get('dbPool');
    const auth = await getOptionalAuthenticatedCustomer(req);
    if (!auth) {
        return res.status(401).json({ message: 'Authentication required.' });
    }

    try {
        const customer = await customerModel.findById(pool, auth.customer.id);
        if (!customer) {
            return res.status(404).json({ message: 'Customer not found.' });
        }

        return res.json({
            customerId: customer.id,
            notificationsEnabled: customer.notifications_enabled !== false,
            eventRemindersEnabled: customer.event_reminders_enabled !== false,
            privacyProfileVisible: customer.privacy_profile_visible !== false,
            privacyMarketingOptIn: !!customer.privacy_marketing_opt_in
        });
    } catch (error) {
        console.error('GET PREFERENCES:', error);
        return res.status(500).json({ message: 'Failed to load preferences.' });
    }
}

async function updatePreferences(req, res) {
    const pool = req.app.get('dbPool');
    const auth = await getOptionalAuthenticatedCustomer(req);
    if (!auth) {
        return res.status(401).json({ message: 'Authentication required.' });
    }

    const incoming = req.body || {};
    try {
        const customer = await customerModel.findById(pool, auth.customer.id);
        if (!customer) {
            return res.status(404).json({ message: 'Customer not found.' });
        }

        const next = {
            notificationsEnabled: incoming.notificationsEnabled !== undefined ? Boolean(incoming.notificationsEnabled) : customer.notifications_enabled,
            eventRemindersEnabled: incoming.eventRemindersEnabled !== undefined ? Boolean(incoming.eventRemindersEnabled) : customer.event_reminders_enabled,
            privacyProfileVisible: incoming.privacyProfileVisible !== undefined ? Boolean(incoming.privacyProfileVisible) : customer.privacy_profile_visible,
            privacyMarketingOptIn: incoming.privacyMarketingOptIn !== undefined ? Boolean(incoming.privacyMarketingOptIn) : customer.privacy_marketing_opt_in
        };

        const updated = await customerModel.updatePreferences(pool, auth.customer.id, next);
        return res.json({
            success: true,
            message: 'Preferences updated successfully.',
            preferences: {
                notificationsEnabled: updated.notifications_enabled !== false,
                eventRemindersEnabled: updated.event_reminders_enabled !== false,
                privacyProfileVisible: updated.privacy_profile_visible !== false,
                privacyMarketingOptIn: !!updated.privacy_marketing_opt_in
            }
        });
    } catch (error) {
        console.error('UPDATE PREFERENCES:', error);
        return res.status(500).json({ message: 'Failed to update preferences.' });
    }
}

async function requestEmailVerification(req, res) {
    const pool = req.app.get('dbPool');
    const auth = await getOptionalAuthenticatedCustomer(req);
    if (!auth) {
        return res.status(401).json({ message: 'Authentication required.' });
    }

    const customer = auth.customer;
    if (customer.is_guest) {
        return res.status(403).json({ message: 'Guest accounts do not require email verification.' });
    }

    const { token, expiresAt } = await customerModel.createVerificationToken(pool, customer.id, customer.email, 'email_verification', 1000 * 60 * 60 * 24 * 2);
    const devLink = process.env.NODE_ENV === 'production' ? null : `http://localhost:3000/api/customers/email/verify?token=${token}`;
    return res.json({ success: true, token: process.env.NODE_ENV === 'production' ? undefined : token, expiresAt, devLink, message: 'Verification token created.' });
}

async function verifyEmail(req, res) {
    const pool = req.app.get('dbPool');
    const token = String(req.body?.token || req.query?.token || '').trim();

    if (!token) {
        return res.status(400).json({ message: 'Verification token is required.' });
    }

    try {
        const record = await customerModel.findValidVerificationToken(pool, token);
        if (!record) {
            return res.status(400).json({ message: 'Verification token is invalid or expired.' });
        }

        await customerModel.markVerificationTokenUsed(pool, token);
        await customerModel.markCustomerVerified(pool, record.customer_id);
        return res.json({ success: true, message: 'Email verified successfully.' });
    } catch (error) {
        console.error('VERIFY EMAIL:', error);
        return res.status(500).json({ message: 'Failed to verify email.' });
    }
}

async function requestPasswordReset(req, res) {
    const pool = req.app.get('dbPool');
    const email = sanitizeEmail(req.body?.email || req.query?.email);

    if (!email) {
        return res.status(400).json({ message: 'Email is required.' });
    }

    try {
        const customer = await customerModel.findByEmail(pool, email);
        if (!customer || customer.is_guest) {
            return res.json({ success: true, message: 'If an account exists, a reset link has been prepared.' });
        }

        const { token, expiresAt } = await customerModel.createPasswordResetToken(pool, customer.id, 1000 * 60 * 60 * 2);
        const devLink = process.env.NODE_ENV === 'production' ? null : `http://localhost:3000/api/customers/password-reset/confirm?token=${token}`;
        return res.json({ success: true, token: process.env.NODE_ENV === 'production' ? undefined : token, expiresAt, devLink, message: 'If an account exists, a reset link has been prepared.' });
    } catch (error) {
        console.error('PASSWORD RESET REQUEST:', error);
        return res.status(500).json({ message: 'Failed to request password reset.' });
    }
}

async function resetPassword(req, res) {
    const pool = req.app.get('dbPool');
    const { token, newPassword, confirmPassword } = req.body || {};
    const trimmedToken = String(token || '').trim();

    if (!trimmedToken) {
        return res.status(400).json({ message: 'Reset token is required.' });
    }

    if (!newPassword || String(newPassword).length < 8) {
        return res.status(400).json({ message: 'New password must be at least 8 characters long.' });
    }

    if (newPassword !== confirmPassword) {
        return res.status(400).json({ message: 'Passwords do not match.' });
    }

    try {
        const record = await customerModel.findValidPasswordResetToken(pool, trimmedToken);
        if (!record) {
            return res.status(400).json({ message: 'Reset token is invalid or expired.' });
        }

        const customer = await customerModel.findById(pool, record.customer_id);
        if (!customer) {
            return res.status(404).json({ message: 'Customer not found.' });
        }

        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(newPassword, salt);
        await customerModel.updatePassword(pool, customer.id, hash);
        await customerModel.markPasswordResetUsed(pool, trimmedToken);
        return res.json({ success: true, message: 'Password reset successfully.' });
    } catch (error) {
        console.error('RESET PASSWORD:', error);
        return res.status(500).json({ message: 'Failed to reset password.' });
    }
}


const { google } = require('googleapis');

function getGoogleOAuthClient() {
    return new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_CALLBACK_URL
    );
}

async function googleStart(req, res) {
    try {
        const oauth2Client = getGoogleOAuthClient();

        const authUrl = oauth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: [
                'openid',
                'email',
                'profile'
            ],
            prompt: 'select_account'
        });

        return res.redirect(authUrl);
    } catch (error) {
        console.error('GOOGLE OAUTH START:', error);
        return res.status(500).json({
            message: 'Unable to start Google sign-in.'
        });
    }
}

async function googleCallback(req, res) {
    const pool = req.app.get('dbPool');
    const code = String(req.query.code || '').trim();

    if (!code) {
        return res.status(400).json({
            message: 'Google authorization code is missing.'
        });
    }

    try {
        const oauth2Client = getGoogleOAuthClient();

        const { tokens } = await oauth2Client.getToken(code);
        oauth2Client.setCredentials(tokens);

        const oauth2 = google.oauth2({
            auth: oauth2Client,
            version: 'v2'
        });

        const { data } = await oauth2.userinfo.get();

        const googleId = String(data.id || '').trim();
        const email = sanitizeEmail(data.email);
        const displayName =
            String(data.name || '').trim() ||
            email.split('@')[0] ||
            'Vault Customer';

        if (!googleId || !email) {
            return res.status(400).json({
                message: 'Google did not provide the required account information.'
            });
        }

        let customer = await customerModel.findByEmail(pool, email);

        if (customer) {
            if (
                customer.provider &&
                customer.provider !== 'google'
            ) {
                return res.status(409).send(`
                    <h2>VAULT</h2>
                    <p>This email is already registered using another sign-in method.</p>
                    <p><a href="/login.html">Return to login</a></p>
                `);
            }

            await pool.query(
                `UPDATE customers
                 SET provider = 'google',
                     provider_user_id = $2,
                     display_name = COALESCE(display_name, $3),
                     full_name = COALESCE(full_name, $3),
                     email_verified = true,
                     updated_at = NOW()
                 WHERE id = $1`,
                [customer.id, googleId, displayName]
            );

            customer = await customerModel.findById(pool, customer.id);
        } else {
            const id = require('crypto').randomUUID();

            const result = await pool.query(
                `INSERT INTO customers
                (
                    id,
                    email,
                    provider,
                    provider_user_id,
                    display_name,
                    full_name,
                    is_guest,
                    email_verified,
                    notifications_enabled,
                    event_reminders_enabled,
                    privacy_profile_visible
                )
                VALUES
                (
                    $1,
                    $2,
                    'google',
                    $3,
                    $4,
                    $4,
                    false,
                    true,
                    true,
                    true,
                    true
                )
                RETURNING *`,
                [id, email, googleId, displayName]
            );

            customer = result.rows[0];
        }

        const session = await customerModel.createSession(
            pool,
            customer.id,
            false,
            1000 * 60 * 60 * 24 * 7
        );

        setSessionCookie(res, session.sessionId);

        return res.redirect('/home.html');

    } catch (error) {
        console.error('GOOGLE OAUTH CALLBACK:', error);

        return res.status(500).send(`
            <h2>VAULT</h2>
            <p>Google sign-in failed.</p>
            <p>Please try again.</p>
            <p><a href="/login.html">Return to login</a></p>
        `);
    }
}
module.exports = {
    postGuest,
    postRegister,
    postEmailSignIn,
    googleStart,
    googleCallback,
    getSession,
    logout,
    getCustomerById,
    getCurrentCustomer,
    updateProfile,
    changePassword,
    getPreferences,
    updatePreferences,
    requestEmailVerification,
    verifyEmail,
    requestPasswordReset,
    resetPassword
};






