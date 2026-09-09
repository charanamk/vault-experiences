/*==================================
  VAULT â€” CUSTOMER SESSION
  Frontend API for customer identity and backend-backed sessions.
==================================*/

(function (window, document) {
    const STORAGE_KEY = 'vault:session';

   async function getJson(url, options = {}) {
        const res = await fetch(url, {
           credentials: 'same-origin',
           ...options,
           headers: {
               'Content-Type': 'application/json',
               ...(options.headers || {})
           }
       });

       if (!res.ok) {
           const text = await res.text().catch(() => '');
           throw new Error(text || 'Request failed');
       }

       const text = await res.text();
       return text ? JSON.parse(text) : null;
   }

   function saveSession(obj) {
       const session = Object.assign({}, obj, { signedInAt: new Date().toISOString() });
       localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
       return session;
   }

   function readSession() {
       const raw = localStorage.getItem(STORAGE_KEY);
       if (!raw) return null;
       try {
           return JSON.parse(raw);
       } catch (e) {
           console.warn('VAULT SESSION: malformed cached session');
           localStorage.removeItem(STORAGE_KEY);
           return null;
       }
   }

   function clearSession() {
       localStorage.removeItem(STORAGE_KEY);
       return fetch('/api/customers/logout', {
           method: 'POST',
           credentials: 'same-origin'
       }).catch(() => null);
   }

   async function refresh() {
       try {
           const data = await getJson('/api/customers/session');
           if (!data || !data.customer) {
               clearSession();
               return null;
           }
           const session = saveSession({
               customerId: data.customer.customerId || data.customer.id,
               email: data.customer.email || null,
               isGuest: !!data.customer.isGuest,
               emailVerified: !!data.customer.emailVerified,
               fullName: data.customer.fullName || null,
               customer: data.customer
           });
           return session;
       } catch (error) {
           console.warn('VAULT SESSION: refresh failed', error);
           return readSession();
       }
   }

   async function createGuest() {
       const data = await getJson('/api/customers/guest', { method: 'POST' });
       const sess = saveSession({ customerId: data.customerId, isGuest: true, email: null });
       return sess;
   }

   async function emailSignIn(email, password) {
       const data = await getJson('/api/customers/email-signin', {
           method: 'POST',
           body: JSON.stringify({ email, password })
       });
       const sess = saveSession({
           customerId: data.customerId,
           email: data.email || null,
           isGuest: !!data.isGuest,
           emailVerified: !!data.emailVerified,
           fullName: data.fullName || null
       });
       return sess;
   }

   async function register(payload) {
       const data = await getJson('/api/customers/register', {
           method: 'POST',
           body: JSON.stringify(payload)
       });
       const sess = saveSession({
           customerId: data.customerId,
           email: data.email || null,
           isGuest: false,
           emailVerified: !!data.emailVerified
       });
       return sess;
   }

   async function requestPasswordReset(email) {
       const data = await getJson('/api/customers/password-reset/request', {
           method: 'POST',
           body: JSON.stringify({ email })
       });
       return data;
   }

   async function resetPassword(token, newPassword, confirmPassword) {
       const data = await getJson('/api/customers/password-reset/confirm', {
           method: 'POST',
           body: JSON.stringify({ token, newPassword, confirmPassword })
       });
       return data;
   }

   async function verifyEmail(token) {
       const data = await getJson('/api/customers/email/verify', {
           method: 'POST',
           body: JSON.stringify({ token })
       });
       return data;
   }

   function getCurrentCustomer() {
       return readSession();
   }

   function getCustomerId() {
       const s = readSession();
       return s?.customerId || null;
   }

   function isGuest() {
       const s = readSession();
       return !!s?.isGuest;
   }

   function isAuthenticated() {
       const s = readSession();
       return !!s?.customerId && !s?.isGuest;
   }

   window.CustomerSession = {
       createGuest,
       emailSignIn,
       register,
       getCurrentCustomer,
       getCustomerId,
       isGuest,
       isAuthenticated,
       refresh,
       logout: clearSession,
       requestPasswordReset,
       verifyEmail,
       resetPassword,
       clearSession
   };

})(window, document);

