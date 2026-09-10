"use strict";

/*==================================
VAULT — LOGIN
Shared customer + admin login
==================================*/

(function (window, document) {

    const emailBtn =
        document.querySelector(".email-btn");

    const emailInput =
        document.getElementById("loginEmail");

    const passwordInput =
        document.getElementById("password");

    const toastContainer =
        document.getElementById("vaultToastContainer");

    const EMAIL_PATTERN =
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    function showToast(message, type = "success") {

        if (!toastContainer) {
            window.alert(message);
            return;
        }

        const toast =
            document.createElement("div");

        toast.className =
            `vault-toast ${type}`;

        toast.textContent =
            message;

        toast.setAttribute(
            "role",
            "status"
        );

        toastContainer.appendChild(
            toast
        );

        window.setTimeout(
            () => {
                toast.remove();
            },
            2600
        );
    }

    function clearLoginFormState() {
        if (emailInput) {
            emailInput.value = "";
            emailInput.setAttribute("autocomplete", "off");
        }

        if (passwordInput) {
            passwordInput.value = "";
            passwordInput.setAttribute("autocomplete", "new-password");
        }

        if (document.body) {
            document.body.classList.remove("email-mode");
        }

        if (emailBtn) {
            emailBtn.textContent = "Sign in with Email";
            emailBtn.disabled = false;
        }
    }

    function normalizeEmail(value) {
        return String(value || "").trim().toLowerCase();
    }

    function isValidEmail(value) {
        return EMAIL_PATTERN.test(normalizeEmail(value));
    }

    /*==================================
    ADMIN LOGIN
    ==================================*/

    async function tryAdminLogin(email, password) {

        const apiBase =
            window.VAULT_API_BASE_URL || "";

        const response = await fetch(
            `${apiBase}/api/admin/login`,
            {
                method: "POST",
                credentials: "include",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    email,
                    password
                })
            }
        );

        if (response.ok) {

            const data =
                await response.json();

            return {
                success: true,
                admin: data.admin || null
            };
        }

        return {
            success: false
        };
    }


    /*==================================
    EMAIL LOGIN
    ==================================*/

    if (emailBtn) {

        emailBtn.addEventListener(
            "click",
            async () => {

                const emailMode =
                    document.body.classList.contains(
                        "email-mode"
                    );


                /*--------------------------------
                FIRST CLICK — OPEN EMAIL FORM
                --------------------------------*/

                if (!emailMode) {

                    document.body.classList.add(
                        "email-mode"
                    );

                    emailBtn.textContent =
                        "Continue";

                    emailInput?.focus();

                    return;
                }


                /*--------------------------------
                VALIDATE
                --------------------------------*/

                const email =
                    normalizeEmail(
                        emailInput?.value
                    );

                const password =
                    passwordInput?.value || "";


                if (!email || !isValidEmail(email)) {
                    emailInput?.focus();
                    emailInput?.setCustomValidity(
                        "Please enter a valid email address."
                    );
                    emailInput?.reportValidity();
                    emailInput?.setCustomValidity("");
                    return;
                }

                if (!password.trim()) {
                    passwordInput?.focus();
                    passwordInput?.setCustomValidity(
                        "Password is required."
                    );
                    passwordInput?.reportValidity();
                    passwordInput?.setCustomValidity("");
                    return;
                }


                /*--------------------------------
                AUTHENTICATING
                --------------------------------*/

                emailBtn.disabled = true;
                emailBtn.textContent =
                    "Signing in…";


                try {

                    /*================================
                    ADMIN FIRST

                    Important:
                    The customer endpoint can create
                    an account when the email doesn't
                    already exist.

                    Therefore admin authentication
                    MUST happen first.
                    =================================*/

                    const adminResult =
                        await tryAdminLogin(
                            email,
                            password
                        );


                    if (adminResult.success) {

                        console.log(
                            "VAULT ADMIN: authenticated",
                            adminResult.admin
                        );

                        showToast(
                            "Admin login successful.",
                            "success"
                        );

                        window.location.assign(
                            "/admin"
                        );

                        return;
                    }


                    /*================================
                    CUSTOMER LOGIN
                    =================================*/

                    await window.CustomerSession.emailSignIn(
                        email,
                        password
                    );

                    showToast(
                        "Signed in successfully.",
                        "success"
                    );

                    window.VaultApp?.navigate(
                        "home"
                    );

                } catch (error) {

                    console.error(
                        "VAULT LOGIN:",
                        error
                    );

                    const message =
                        error?.message ||
                        "Sign in failed. Please check your details and try again.";

                    showToast(
                        message,
                        "error"
                    );

                    emailBtn.textContent =
                        "Continue";

                } finally {

                    emailBtn.disabled = false;

                }

            }
        );

    }


    if (emailInput) {
        emailInput.value = "";
        emailInput.autocomplete = "off";
    }

    if (passwordInput) {
        passwordInput.value = "";
        passwordInput.autocomplete = "new-password";
    }

    if (
        window.performance &&
        window.performance.getEntriesByType
    ) {
        const navEntries =
            window.performance.getEntriesByType(
                "navigation"
            );

        const isReload =
            navEntries.some(
                (entry) => entry.type === "reload"
            );

        if (!isReload) {
            clearLoginFormState();
        }
    }


    /*==================================
    GUEST ACCESS
    ==================================*/

    const guestBtn =
        document.querySelector(".guest-btn");


    if (guestBtn) {

        guestBtn.addEventListener(
            "click",
            async (event) => {

                event.preventDefault();
                event.stopPropagation();

                try {

                    await window.CustomerSession.createGuest();

                    showToast(
                        "Guest session created.",
                        "success"
                    );

                    window.VaultApp?.navigate(
                        "home"
                    );

                } catch (error) {

                    console.error(
                        "VAULT GUEST:",
                        error
                    );

                    showToast(
                        "Failed to create guest session.",
                        "error"
                    );
                }
            }
        );

    }

})(window, document);


/*==================================
PASSWORD VISIBILITY
==================================*/

const passwordInput =
    document.getElementById("password");

const togglePassword =
    document.querySelector(".toggle-password");

const eyeIcon =
    document.getElementById("eyeIcon");


if (
    passwordInput &&
    togglePassword &&
    eyeIcon
) {

    togglePassword.addEventListener(
        "click",
        () => {

            const isHidden =
                passwordInput.type === "password";


            passwordInput.type =
                isHidden
                    ? "text"
                    : "password";


            eyeIcon.src =
                isHidden
                    ? "assets/icons/eye-off.svg"
                    : "assets/icons/eye.svg";


            eyeIcon.alt =
                isHidden
                    ? "Hide Password"
                    : "Show Password";

        }
    );

}