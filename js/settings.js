"use strict";

(function (window, document) {
   const notificationToggle = document.getElementById("notificationToggle");
   const reminderToggle = document.getElementById("reminderToggle");
   const logoutButton = document.getElementById("vaultLogout");
   const settingsRows = document.querySelectorAll("[data-setting]");

   function getCurrentCustomerId() {
       try {
           if (window.CustomerSession && typeof window.CustomerSession.getCustomerId === "function") {
               return window.CustomerSession.getCustomerId();
           }
       } catch (error) {
           console.error("VAULT SETTINGS: Unable to read current customer ID.", error);
       }
       return null;
   }

   function isGuestCustomer() {
       try {
           return !!(window.CustomerSession && typeof window.CustomerSession.isGuest === "function" && window.CustomerSession.isGuest());
       } catch (error) {
           console.error("VAULT SETTINGS: Unable to determine guest status.", error);
           return false;
       }
   }

   function getApiBase() {
       const configured = window.VAULT_API_BASE_URL || "";
       if (configured) {
           return configured.replace(/\/$/, "");
       }
       if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
           return window.location.port === "3000" ? "" : "http://localhost:3000";
       }
       return "";
   }

   async function requestJson(url, options = {}) {
       const response = await fetch(url, {
           headers: {
               "Content-Type": "application/json",
               ...(options.headers || {})
           },
           ...options
       });

       const payload = response.status === 204 ? null : await response.json().catch(() => null);

       if (!response.ok) {
           throw new Error((payload && payload.message) || "Request failed");
       }

       return payload;
    }

   function buildPanel() {
       let panel = document.getElementById("vault-settings-panel");

       if (panel) {
           return panel;
       }

       panel = document.createElement("aside");
       panel.id = "vault-settings-panel";
       panel.className = "vault-settings-panel";
       panel.setAttribute("aria-hidden", "true");
       panel.innerHTML = `
           <div class="vault-settings-backdrop" data-close-settings="true"></div>
           <div class="vault-settings-sheet" role="dialog" aria-modal="true" aria-labelledby="vault-settings-title">
               <div class="vault-settings-header">
                   <div>
                       <p class="vault-settings-kicker">VAULT</p>
                       <h3 id="vault-settings-title">Account Settings</h3>
                   </div>
                   <button type="button" class="vault-settings-close" data-close-settings="true" aria-label="Close settings">Close</button>
               </div>
               <div class="vault-settings-body" id="vault-settings-body"></div>
           </div>
       `;

       document.body.appendChild(panel);
       panel.addEventListener("click", (event) => {
           if (event.target.dataset.closeSettings === "true") {
               closePanel();
           }
       });

       return panel;
   }

   function openPanel() {
       const panel = buildPanel();
       panel.classList.add("is-open");
       panel.setAttribute("aria-hidden", "false");
   }

   function closePanel() {
       const panel = document.getElementById("vault-settings-panel");
       if (!panel) {
           return;
       }
       panel.classList.remove("is-open");
       panel.setAttribute("aria-hidden", "true");
    }

   function setPanelBody(html) {
       const body = document.getElementById("vault-settings-body");
       if (!body) {
           return;
       }
       body.innerHTML = html;
   }

   function setStatus(node, message, type = "success") {
       if (!node) {
           return;
       }
       node.textContent = message;
       node.className = `vault-settings-form-status ${type}`;
   }

   function renderGuestNotice(message) {
       return `
           <div class="vault-settings-notice">
               <p>${message}</p>
           </div>
       `;
   }

   function renderProfileModule() {
       const customerId = getCurrentCustomerId();
       const guest = isGuestCustomer();
       const form = guest
           ? `
               <div class="vault-settings-form">
                   ${renderGuestNotice("Guest accounts use a temporary profile. Sign in with email to unlock name, email, and phone editing.")}
                   <div class="vault-settings-readonly-card">
                       <p><strong>Guest account</strong></p>
                       <p>Customer ID: <span class="vault-settings-code">${customerId || "Not available"}</span></p>
                   </div>
               </div>
             `
           : `
               <form class="vault-settings-form" id="vault-profile-form">
                   <div class="vault-settings-field">
                       <label for="profileFullName">Full name</label>
                       <input id="profileFullName" name="fullName" type="text" placeholder="Your full name" required>
                   </div>

                   <div class="vault-settings-field">
                       <label for="profileEmail">Email</label>
                       <input id="profileEmail" name="email" type="email" placeholder="name@example.com" required>
                   </div>

                   <div class="vault-settings-field">
                       <label for="profilePhone">Phone number</label>
                       <input id="profilePhone" name="phoneNumber" type="tel" placeholder="+254 700 000000">
                   </div>

                   <div id="profile-status" class="vault-settings-form-status" aria-live="polite"></div>

                   <button class="vault-settings-primary" type="submit" id="profileSaveButton">Save changes</button>
               </form>
             `;

       setPanelBody(`
           <div class="vault-settings-panel-section">
               <p class="vault-settings-section-label">Profile</p>
               <h4>Personal Information</h4>
               ${form}
           </div>
       `);

       if (!guest) {
           const profileForm = document.getElementById("vault-profile-form");
           const statusNode = document.getElementById("profile-status");

           profileForm.addEventListener("submit", async (event) => {
               event.preventDefault();
               const formData = new FormData(profileForm);
               const payload = {
                   customerId: getCurrentCustomerId(),
                   fullName: (formData.get("fullName") || "").toString().trim(),
                   email: (formData.get("email") || "").toString().trim(),
                   phoneNumber: (formData.get("phoneNumber") || "").toString().trim()
               };

               if (!payload.customerId) {
                   setStatus(statusNode, "Your customer session is missing. Please sign in again.", "error");
                   return;
                }

               if (!payload.fullName) {
                   setStatus(statusNode, "Full name is required.", "error");
                   return;
               }

               if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) {
                   setStatus(statusNode, "Please enter a valid email address.", "error");
                   return;
               }

               if (payload.phoneNumber && !/^[+()\d\s-]{7,20}$/.test(payload.phoneNumber)) {
                   setStatus(statusNode, "Please enter a valid phone number.", "error");
                   return;
               }

               try {
                   const saveButton = document.getElementById("profileSaveButton");
                   saveButton.disabled = true;
                   saveButton.textContent = "Saving...";
                   setStatus(statusNode, "Saving profile...", "pending");

                   await requestJson(`${getApiBase()}/api/customers/me/profile`, {
                       method: "PATCH",
                       headers: {
                           "X-Customer-Id": payload.customerId
                       },
                       body: JSON.stringify(payload)
                   });

                   setStatus(statusNode, "Profile saved successfully.", "success");
                   await loadCustomerProfile();
               } catch (error) {
                   setStatus(statusNode, error.message || "Unable to save profile. Please try again.", "error");
               } finally {
                   const saveButton = document.getElementById("profileSaveButton");
                   if (saveButton) {
                       saveButton.disabled = false;
                       saveButton.textContent = "Save changes";
                   }
               }
           });
       }

       loadCustomerProfile();
   }

   async function loadCustomerProfile() {
       const customerId = getCurrentCustomerId();
       if (!customerId) {
           return;
       }

       const fullNameInput = document.getElementById("profileFullName");
       const emailInput = document.getElementById("profileEmail");
       const phoneInput = document.getElementById("profilePhone");

       if (!fullNameInput && !emailInput && !phoneInput) {
           return;
       }

       try {
           const customer = await requestJson(`${getApiBase()}/api/customers/me?customerId=${encodeURIComponent(customerId)}`);

           if (fullNameInput) {
               fullNameInput.value = customer.fullName || customer.full_name || "";
           }
           if (emailInput) {
               emailInput.value = customer.email || "";
           }
           if (phoneInput) {
               phoneInput.value = customer.phoneNumber || customer.phone_number || "";
           }
       } catch (error) {
           console.error("VAULT SETTINGS: Unable to load profile.", error);
           if (document.getElementById("profile-status")) {
               setStatus(document.getElementById("profile-status"), "Unable to load your profile right now.", "error");
           }
       }
   }

   function renderPasswordModule() {
       const guest = isGuestCustomer();
       const body = guest
           ? renderGuestNotice("Password management is only available for email account customers. Guest accounts do not have a password.")
           : `
               <form class="vault-settings-form" id="vault-password-form">
                   <div class="vault-settings-field">
                       <label for="currentPassword">Current password</label>
                       <div class="vault-settings-password-wrap">
                           <input id="currentPassword" name="currentPassword" type="password" placeholder="Current password" required>
                           <button type="button" class="vault-settings-toggle-password" data-password-toggle="currentPassword">Show</button>
                       </div>
                   </div>

                   <div class="vault-settings-field">
                       <label for="newPassword">New password</label>
                       <div class="vault-settings-password-wrap">
                           <input id="newPassword" name="newPassword" type="password" placeholder="New password" required>
                           <button type="button" class="vault-settings-toggle-password" data-password-toggle="newPassword">Show</button>
                       </div>
                   </div>

                   <div class="vault-settings-field">
                       <label for="confirmPassword">Confirm new password</label>
                       <div class="vault-settings-password-wrap">
                           <input id="confirmPassword" name="confirmPassword" type="password" placeholder="Confirm password" required>
                           <button type="button" class="vault-settings-toggle-password" data-password-toggle="confirmPassword">Show</button>
                       </div>
                   </div>

                   <div id="password-status" class="vault-settings-form-status" aria-live="polite"></div>

                   <button class="vault-settings-primary" type="submit" id="passwordSaveButton">Update password</button>
               </form>
           `;

       setPanelBody(`
           <div class="vault-settings-panel-section">
               <p class="vault-settings-section-label">Security</p>
               <h4>Password &amp; Security</h4>
               ${body}
           </div>
       `);

       if (!guest) {
           const passwordForm = document.getElementById("vault-password-form");
           const statusNode = document.getElementById("password-status");

           passwordForm.addEventListener("submit", async (event) => {
               event.preventDefault();
               const formData = new FormData(passwordForm);
               const payload = {
                   customerId: getCurrentCustomerId(),
                   currentPassword: (formData.get("currentPassword") || "").toString(),
                   newPassword: (formData.get("newPassword") || "").toString(),
                   confirmPassword: (formData.get("confirmPassword") || "").toString()
               };

               if (!payload.customerId) {
                   setStatus(statusNode, "Your customer session is missing. Please sign in again.", "error");
                   return;
               }

               if (payload.newPassword.length < 8) {
                   setStatus(statusNode, "New password must be at least 8 characters long.", "error");
                   return;
               }

               if (payload.newPassword !== payload.confirmPassword) {
                   setStatus(statusNode, "Passwords do not match.", "error");
                   return;
               }

               try {
                   const saveButton = document.getElementById("passwordSaveButton");
                   saveButton.disabled = true;
                   saveButton.textContent = "Updating...";
                   setStatus(statusNode, "Updating your password...", "pending");

                   await requestJson(`${getApiBase()}/api/customers/me/password`, {
                       method: "PATCH",
                       headers: {
                           "X-Customer-Id": payload.customerId
                       },
                       body: JSON.stringify(payload)
                   });

                   setStatus(statusNode, "Password updated successfully.", "success");
                   passwordForm.reset();
               } catch (error) {
                   setStatus(statusNode, error.message || "Unable to update password.", "error");
               } finally {
                   const saveButton = document.getElementById("passwordSaveButton");
                   if (saveButton) {
                       saveButton.disabled = false;
                       saveButton.textContent = "Update password";
                   }
               }
           });

           document.querySelectorAll(".vault-settings-toggle-password").forEach((button) => {
               button.addEventListener("click", () => {
                   const input = document.getElementById(button.dataset.passwordToggle);
                   if (!input) {
                       return;
                   }
                   const isHidden = input.type === "password";
                   input.type = isHidden ? "text" : "password";
                   button.textContent = isHidden ? "Hide" : "Show";
               });
           });
       }
   }

   function renderAppearanceModule() {
       const currentTheme = window.VAULT_THEME && typeof window.VAULT_THEME.getCurrentTheme === "function"
           ? window.VAULT_THEME.getCurrentTheme()
           : "light";

       setPanelBody(`
           <div class="vault-settings-panel-section">
               <p class="vault-settings-section-label">Preferences</p>
               <h4>Appearance</h4>
               <form class="vault-settings-form" id="vault-appearance-form">
                   <div class="vault-settings-theme-group" role="radiogroup" aria-label="Choose a theme">
                       <label class="vault-settings-theme-option">
                           <input type="radio" name="appearanceTheme" value="light" ${currentTheme === "light" ? "checked" : ""}>
                           <span>Light Theme</span>
                       </label>
                       <label class="vault-settings-theme-option">
                           <input type="radio" name="appearanceTheme" value="dark" ${currentTheme === "dark" ? "checked" : ""}>
                           <span>Dark Theme</span>
                       </label>
                   </div>
                   <div id="appearance-status" class="vault-settings-form-status" aria-live="polite"></div>
               </form>
           </div>
       `);

       const appearanceForm = document.getElementById("vault-appearance-form");
       if (!appearanceForm) {
           return;
       }

       appearanceForm.addEventListener("change", (event) => {
           if (!event.target || !event.target.name || event.target.name !== "appearanceTheme") {
               return;
           }

           const selectedTheme = event.target.value;
           if (window.VAULT_THEME && typeof window.VAULT_THEME.setTheme === "function") {
               window.VAULT_THEME.setTheme(selectedTheme);
           }

           setStatus(document.getElementById("appearance-status"), selectedTheme === "dark" ? "Dark Theme enabled." : "Light Theme enabled.", "success");
       });
   }

   function renderPaymentsModule() {
       setPanelBody(`
           <div class="vault-settings-panel-section">
               <p class="vault-settings-section-label">Account</p>
               <h4>Payment Methods</h4>
               <div class="vault-settings-placeholder">
                   <p>VAULT payment methods are not yet available in this stage of the product.</p>
                   <p>Saved cards and payment details will be introduced when VAULT payments are launched. Until then, no card information is collected or stored.</p>
               </div>
           </div>
       `);
   }

function renderPrivacyModule() {
    const customerId = getCurrentCustomerId();

    const body = !customerId
        ? renderGuestNotice("No active customer session found.")
        : `
            <div class="vault-privacy-content">

                <div class="vault-privacy-intro">
                    <span class="vault-settings-section-label">
                        YOUR PRIVACY
                    </span>

                    <p>
                        VAULT uses your information to manage your account,
                        reservations, tickets, and important service
                        communications.
                    </p>
                </div>


                <!--==================================
                INFORMATION WE STORE
                ==================================-->

                <div class="vault-privacy-block">

                    <h5>Information VAULT Stores</h5>

                    <p>
                        Depending on how you use VAULT, your account may
                        contain information such as your name, email address,
                        phone number, customer ID, reservations, tickets,
                        and saved preferences.
                    </p>

                </div>


                <!--==================================
                HOW YOUR INFORMATION IS USED
                ==================================-->

                <div class="vault-privacy-block">

                    <h5>How We Use Your Information</h5>

                    <p>
                        Your information is used to provide and operate
                        VAULT, manage your account, process reservations,
                        generate tickets, maintain your booking history,
                        provide support, and send important service
                        communications.
                    </p>

                </div>


                <!--==================================
                SERVICE COMMUNICATIONS
                ==================================-->

                <div class="vault-privacy-block">

                    <h5>Service Communications</h5>

                    <p>
                        VAULT may send essential communications relating to
                        your account, reservations, tickets, security, or
                        changes to an experience. These messages are required
                        to provide the service and cannot be disabled through
                        marketing preferences.
                    </p>

                </div>


                <!--==================================
                MARKETING PREFERENCE
                ==================================-->

                <div class="vault-privacy-block">

                    <h5>Marketing & Product Updates</h5>

                    <p>
                        You can choose whether VAULT may send you optional
                        marketing messages, product updates, announcements,
                        and other non-essential communications.
                    </p>

                    <form
                        class="vault-settings-form"
                        id="vault-privacy-form"
                    >

                        <div class="vault-settings-checkbox-row">

                            <label for="privacyMarketingOptIn">
                                Receive marketing & product updates
                            </label>

                            <input
                                id="privacyMarketingOptIn"
                                type="checkbox"
                            >

                        </div>

                        <div
                            id="privacy-status"
                            class="vault-settings-form-status"
                            aria-live="polite"
                        ></div>

                        <button
                            type="submit"
                            class="vault-settings-primary"
                        >
                            Save privacy preference
                        </button>

                    </form>

                </div>


                <!--==================================
                BOOKINGS & TICKETS
                ==================================-->

                <div class="vault-privacy-block">

                    <h5>Bookings & Tickets</h5>

                    <p>
                        Reservation and ticket information is associated
                        with your VAULT account so that you can access your
                        bookings, tickets, attended experiences, and related
                        account history.
                    </p>

                </div>


                <!--==================================
                PAYMENT INFORMATION
                ==================================-->

                <div class="vault-privacy-block">

                    <h5>Payment Information</h5>

                    <p>
                        Payment functionality is not currently active on
                        this version of VAULT. No payment card information
                        is collected or stored through the current platform.
                    </p>

                </div>


                <!--==================================
                YOUR DATA
                ==================================-->

                <div class="vault-privacy-block">

                    <h5>Your Data</h5>

                    <p>
                        You may request correction of inaccurate personal
                        information associated with your account. You may
                        also request deletion of your account and personal
                        information, subject to information VAULT may be
                        required to retain for legal, security, or legitimate
                        operational purposes.
                    </p>

                </div>


                <!--==================================
                DATA SHARING
                ==================================-->

                <div class="vault-privacy-block">

                    <h5>Data Sharing</h5>

                    <p>
                        VAULT does not sell your personal information.
                        Information may be shared with service providers or
                        other parties only when reasonably necessary to
                        operate VAULT, provide requested services, comply
                        with legal obligations, or protect the security and
                        rights of VAULT and its users.
                    </p>

                </div>


                <!--==================================
                POLICY
                ==================================-->

                <div class="vault-privacy-block">

                    <h5>Privacy Policy</h5>

                    <p>
                        VAULT's Privacy Policy explains how personal
                        information is collected, used, stored, and
                        protected. By continuing to use VAULT, you
                        acknowledge the current Privacy Policy.
                    </p>

                </div>


                <div class="vault-settings-legal-note">

                    <p>
                        <strong>Privacy note:</strong>
                        VAULT's privacy practices may change as new
                        features and services are introduced. Updated
                        policies will be made available through the
                        platform.
                    </p>

                </div>

            </div>
        `;

    setPanelBody(`
        <div class="vault-settings-panel-section">

            <p class="vault-settings-section-label">
                Account
            </p>

            <h4>Privacy</h4>

            ${body}

        </div>
    `);


    const privacyForm = document.getElementById("vault-privacy-form");

    if (!privacyForm) {
        return;
    }


    const statusNode =
        document.getElementById("privacy-status");

    const marketingOptInInput =
        document.getElementById("privacyMarketingOptIn");


    /*==================================
    LOAD SAVED PRIVACY PREFERENCE
    ==================================*/

    (async function loadPrivacyPreferences() {

        try {

            const prefs = await requestJson(
                `${getApiBase()}/api/customers/me/preferences?customerId=${encodeURIComponent(customerId)}`
            );

            marketingOptInInput.checked =
                !!prefs.privacyMarketingOptIn;

        } catch (error) {

            console.error(
                "VAULT SETTINGS: Unable to load privacy preferences.",
                error
            );

            setStatus(
                statusNode,
                "Unable to load your privacy preference right now.",
                "error"
            );
        }

    })();


    /*==================================
    SAVE PRIVACY PREFERENCE
    ==================================*/

    privacyForm.addEventListener("submit", async (event) => {

        event.preventDefault();

        const payload = {
            customerId,
            privacyMarketingOptIn:
                marketingOptInInput.checked
        };


        try {

            setStatus(
                statusNode,
                "Saving privacy preference...",
                "pending"
            );


            await requestJson(
                `${getApiBase()}/api/customers/me/preferences`,
                {
                    method: "PATCH",

                    headers: {
                        "X-Customer-Id": customerId
                    },

                    body: JSON.stringify(payload)
                }
            );


            setStatus(
                statusNode,
                "Privacy preference saved.",
                "success"
            );


        } catch (error) {

            setStatus(
                statusNode,
                error.message ||
                "Unable to save your privacy preference.",
                "error"
            );

        }

    });
}
    
function renderTermsModule() {
    setPanelBody(`
        <div class="vault-settings-panel-section">
            <p class="vault-settings-section-label">Policies</p>
            <h4>Terms & Policies</h4>

            <div class="vault-settings-legal">

                <h5>Terms of Service</h5>

                <p>
                    Welcome to VAULT. By accessing or using VAULT, you agree to
                    these Terms of Service. If you do not agree with these terms,
                    please do not use the service.
                </p>

                <p>
                    VAULT provides a platform for discovering experiences,
                    viewing event information, making reservations, and
                    accessing related event services. VAULT may update,
                    modify, suspend, or discontinue features of the service
                    as the platform develops.
                </p>

                <p>
                    You are responsible for providing accurate information when
                    creating an account or making a reservation. You are also
                    responsible for maintaining the security of your account
                    and for activity carried out through your account.
                </p>

                <p>
                    A reservation made through VAULT does not necessarily
                    constitute a purchase or payment. Where an event is listed
                    as free, no payment is required to reserve a place unless
                    the event information specifically states otherwise.
                </p>

                <p>
                    Event details, including dates, times, venues, ticket
                    categories, availability, and other information may change.
                    VAULT will make reasonable efforts to keep event information
                    accurate, but final event arrangements remain subject to
                    the event organizer.
                </p>

                <p>
                    You agree not to misuse VAULT, interfere with the operation
                    of the platform, attempt unauthorized access, submit
                    fraudulent information, or use the service for unlawful
                    purposes.
                </p>

                <p>
                    VAULT reserves the right to restrict, suspend, or terminate
                    access to an account where there is reasonable evidence of
                    misuse, fraud, abuse, or violation of these terms.
                </p>


                <h5>Privacy Policy</h5>

                <p>
                    VAULT respects your privacy and is committed to handling
                    your information responsibly.
                </p>

                <p>
                    Depending on how you use VAULT, we may collect information
                    such as your name, email address, phone number, account
                    information, reservations, and saved preferences.
                </p>

                <p>
                    We use this information to provide and improve the VAULT
                    service, manage accounts, process reservations, communicate
                    important service information, and provide a more
                    personalized experience.
                </p>

                <p>
                    VAULT does not collect or store payment card information
                    through this version of the platform. Payment functionality
                    may be introduced in the future and will be governed by
                    additional terms and privacy provisions where applicable.
                </p>

                <p>
                    We may retain information for as long as reasonably necessary
                    to provide the service, maintain records, comply with legal
                    obligations, resolve disputes, and protect the security of
                    VAULT and its users.
                </p>

                <p>
                    VAULT does not sell your personal information. Information
                    may be shared with service providers or other parties only
                    where reasonably necessary to operate the service, comply
                    with legal requirements, or protect the rights and safety
                    of VAULT and its users.
                </p>

                <p>
                    You may request correction or deletion of personal
                    information associated with your account, subject to
                    information that VAULT may be required to retain by law.
                </p>


                <h5>Reservations & Events</h5>

                <p>
                    Reservations are subject to availability and may be limited
                    by the organizer or venue. Making a reservation does not
                    guarantee admission where the event has additional
                    entry requirements, capacity restrictions, or verification
                    procedures.
                </p>

                <p>
                    You are responsible for reviewing the event information
                    provided before making a reservation and for arriving
                    according to the event instructions.
                </p>

                <p>
                    If an event is cancelled, postponed, rescheduled, or its
                    conditions change, VAULT will make reasonable efforts to
                    communicate relevant information to affected users.
                </p>

                <p>
                    Event organizers may establish additional rules governing
                    attendance, entry, conduct, age restrictions, venue
                    requirements, or other conditions. Those rules may apply
                    alongside these VAULT terms.
                </p>


                <h5>Account & Security</h5>

                <p>
                    You must provide information that is reasonably accurate
                    when creating and maintaining your account. You should
                    keep your login credentials private and notify VAULT if
                    you believe your account has been accessed without
                    authorization.
                </p>

                <p>
                    Guest access may provide limited functionality and may not
                    include all features available to registered customers.
                </p>


                <h5>Changes to These Policies</h5>

                <p>
                    VAULT may update these Terms & Policies as the service,
                    features, or applicable legal requirements change.
                    Updated policies will be made available through the
                    platform. Continued use of VAULT after an update means
                    that you acknowledge the revised policies.
                </p>


                <h5>Contact</h5>

                <p>
                    If you have questions, concerns, or requests relating to
                    these Terms & Policies or your personal information,
                    please contact VAULT through the official support channel
                    provided on the platform.
                </p>

                <div class="vault-settings-legal-note">
                    <p>
                        <strong>Policy status:</strong>
                        These policies describe the current VAULT platform and
                        may be updated as new features and services are introduced.
                    </p>
                </div>

            </div>
        </div>
    `);
}

   function handleRowClick(event) {
       const row = event.currentTarget;
       const setting = row.dataset.setting;

       openPanel();

       switch (setting) {
           case "profile":
               renderProfileModule();
               break;
           case "password":
               renderPasswordModule();
               break;
           case "appearance":
               renderAppearanceModule();
               break;
           case "payments":
               renderPaymentsModule();
               break;
           case "privacy":
               renderPrivacyModule();
               break;
           case "terms":
               renderTermsModule();
               break;
           default:
               renderTermsModule();
       }
   }

   async function syncNotificationSettings() {
       const customerId = getCurrentCustomerId();
       if (!customerId || !notificationToggle || !reminderToggle) {
           return;
       }

       try {
           const prefs = await requestJson(`${getApiBase()}/api/customers/me/preferences?customerId=${encodeURIComponent(customerId)}`);
           notificationToggle.checked = prefs.notificationsEnabled !== false;
           reminderToggle.checked = prefs.eventRemindersEnabled !== false;
       } catch (error) {
           console.error("VAULT SETTINGS: Unable to load saved preferences.", error);
       }
   }

   function attachPreferenceHandlers() {
       if (notificationToggle) {
           notificationToggle.addEventListener("change", async () => {
               const customerId = getCurrentCustomerId();
               if (!customerId) {
                   return;
               }

               try {
                   await requestJson(`${getApiBase()}/api/customers/me/preferences`, {
                       method: "PATCH",
                       headers: {
                           "X-Customer-Id": customerId
                       },
                       body: JSON.stringify({ notificationsEnabled: notificationToggle.checked })
                   });
               } catch (error) {
                   console.error("VAULT SETTINGS: Failed to save notifications preference.", error);
                   notificationToggle.checked = !notificationToggle.checked;
               }
           });
       }

       if (reminderToggle) {
           reminderToggle.addEventListener("change", async () => {
               const customerId = getCurrentCustomerId();
               if (!customerId) {
                   return;
               }

               try {
                   await requestJson(`${getApiBase()}/api/customers/me/preferences`, {
                       method: "PATCH",
                       headers: {
                           "X-Customer-Id": customerId
                       },
                       body: JSON.stringify({ eventRemindersEnabled: reminderToggle.checked })
                   });
               } catch (error) {
                   console.error("VAULT SETTINGS: Failed to save reminder preference.", error);
                   reminderToggle.checked = !reminderToggle.checked;
               }
           });
       }
   }

   function attachLogoutHandler() {
    if (!logoutButton) {
        return;
    }

    logoutButton.addEventListener("click", async () => {
        logoutButton.disabled = true;

        try {
            if (
                window.CustomerSession &&
                typeof window.CustomerSession.clearSession === "function"
            ) {
                await window.CustomerSession.clearSession();
            }
        } catch (error) {
            console.error("VAULT SETTINGS: Logout failed.", error);
        }

        window.location.replace("login.html");
    });
}

function init() {
       settingsRows.forEach((row) => {
           row.addEventListener("click", handleRowClick);
       });

       attachPreferenceHandlers();
       attachLogoutHandler();
       syncNotificationSettings();
   }

   if (document.readyState === "loading") {
       document.addEventListener("DOMContentLoaded", init, { once: true });
   } else {
       init();
   }

   window.VaultSettings = {
       refresh: async function () {
           await syncNotificationSettings();
           await loadCustomerProfile();
       },
       close: closePanel,
       open: function (setting) {
           openPanel();
           switch (setting) {
               case "profile":
                   renderProfileModule();
                   break;
               case "password":
                   renderPasswordModule();
                   break;
               case "appearance":
                   renderAppearanceModule();
                   break;
               case "payments":
                   renderPaymentsModule();
                   break;
               case "privacy":
                   renderPrivacyModule();
                   break;
               case "terms":
               default:
                   renderTermsModule();
                   break;
           }
       }
   };
})(window, document);

