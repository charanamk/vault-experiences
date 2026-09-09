"use strict";

/*==================================
VAULT SETTINGS
==================================*/


/*==================================
DOM
==================================*/

const settingsSaveBtn =
    document.getElementById(
        "settingsSaveBtn"
    );


/*==================================
ADMIN MANAGEMENT
==================================*/

const newAdminName =
document.getElementById(
"newAdminName"
);

const newAdminEmail =
document.getElementById(
"newAdminEmail"
);

const newAdminPassword =
document.getElementById(
"newAdminPassword"
);

const newAdminRole =
document.getElementById(
"newAdminRole"
);

const addAdminBtn =
document.getElementById(
"addAdminBtn"
);
const logoutBtn =
    document.getElementById(
        "logoutBtn"
    );




/*==================================
SETTINGS FIELDS
==================================*/

const adminName =
    document.getElementById(
        "adminName"
    );

const adminEmail =
    document.getElementById(
        "adminEmail"
    );

const vaultName =
    document.getElementById(
        "vaultName"
    );

const vaultSlogan =
    document.getElementById(
        "vaultSlogan"
    );

const vaultCurrency =
    document.getElementById(
        "vaultCurrency"
    );

const defaultEventStatus =
    document.getElementById(
        "defaultEventStatus"
    );

const defaultTicketStatus =
    document.getElementById(
        "defaultTicketStatus"
    );


/*==================================
NOTIFICATION SETTINGS
==================================*/

const notifyBookings =
    document.getElementById(
        "notifyBookings"
    );

const notifyTickets =
    document.getElementById(
        "notifyTickets"
    );

const notifyLowTickets =
    document.getElementById(
        "notifyLowTickets"
    );

const notifyVerification =
    document.getElementById(
        "notifyVerification"
    );


/*==================================
STORAGE KEY
==================================*/

const SETTINGS_KEY =
    "vaultAdminSettings";


/*==================================
DEFAULT SETTINGS
==================================*/

const defaultSettings = {

    adminName:
        "Vault Admin",

    adminEmail:
        "",

    vaultName:
        "VAULT",

    vaultSlogan:
        "For Moments Worth Keeping.",

    vaultCurrency:
        "KES",

    defaultEventStatus:
        "draft",

    defaultTicketStatus:
        "available",

    notifyBookings:
        true,

    notifyTickets:
        true,

    notifyLowTickets:
        true,

    notifyVerification:
        false

};


/*==================================
LOAD SETTINGS
==================================*/

function loadSettings(){

    const saved =
        localStorage.getItem(
            SETTINGS_KEY
        );


    if(!saved){

        applySettings(
            defaultSettings
        );

        return;

    }


    try{

        const settings =
            JSON.parse(saved);


        applySettings({
            ...defaultSettings,
            ...settings
        });

    }

    catch(error){

        console.error(
            "VAULT SETTINGS LOAD ERROR:",
            error
        );


        applySettings(
            defaultSettings
        );

    }

}


/*==================================
APPLY SETTINGS
==================================*/

function applySettings(
    settings
){

    if(adminName){

        adminName.value =
            settings.adminName;

    }


    if(adminEmail){

        adminEmail.value =
            settings.adminEmail;

    }


    if(vaultName){

        vaultName.value =
            settings.vaultName;

    }


    if(vaultSlogan){

        vaultSlogan.value =
            settings.vaultSlogan;

    }


    if(vaultCurrency){

        vaultCurrency.value =
            settings.vaultCurrency;

    }


    if(defaultEventStatus){

        defaultEventStatus.value =
            settings.defaultEventStatus;

    }


    if(defaultTicketStatus){

        defaultTicketStatus.value =
            settings.defaultTicketStatus;

    }


    if(notifyBookings){

        notifyBookings.checked =
            settings.notifyBookings;

    }


    if(notifyTickets){

        notifyTickets.checked =
            settings.notifyTickets;

    }


    if(notifyLowTickets){

        notifyLowTickets.checked =
            settings.notifyLowTickets;

    }


    if(notifyVerification){

        notifyVerification.checked =
            settings.notifyVerification;

    }

}


/*==================================
COLLECT SETTINGS
==================================*/

function collectSettings(){

    return {

        adminName:
            adminName
                ? adminName.value.trim()
                : "",

        adminEmail:
            adminEmail
                ? adminEmail.value.trim()
                : "",

        vaultName:
            vaultName
                ? vaultName.value.trim()
                : "",

        vaultSlogan:
            vaultSlogan
                ? vaultSlogan.value.trim()
                : "",

        vaultCurrency:
            vaultCurrency
                ? vaultCurrency.value
                : "KES",

        defaultEventStatus:
            defaultEventStatus
                ? defaultEventStatus.value
                : "draft",

        defaultTicketStatus:
            defaultTicketStatus
                ? defaultTicketStatus.value
                : "available",

        notifyBookings:
            notifyBookings
                ? notifyBookings.checked
                : false,

        notifyTickets:
            notifyTickets
                ? notifyTickets.checked
                : false,

        notifyLowTickets:
            notifyLowTickets
                ? notifyLowTickets.checked
                : false,

        notifyVerification:
            notifyVerification
                ? notifyVerification.checked
                : false

    };

}


/*==================================
SAVE SETTINGS
==================================*/

function saveSettings(){

    const settings =
        collectSettings();


    localStorage.setItem(
        SETTINGS_KEY,
        JSON.stringify(settings)
    );


    showSaveFeedback();

}


/*==================================
SAVE FEEDBACK
==================================*/

function showSaveFeedback(){

    if(!settingsSaveBtn){

        return;

    }


    const originalText =
        settingsSaveBtn.textContent;


    settingsSaveBtn.textContent =
        "Saved";


    settingsSaveBtn.classList.add(
        "saved"
    );


    setTimeout(
        () => {

            settingsSaveBtn.textContent =
                originalText;

            settingsSaveBtn.classList.remove(
                "saved"
            );

        },
        1800
    );

}


/*==================================
PASSWORD MODAL
==================================*/

const passwordModal =
    document.getElementById(
        "passwordModal"
    );

const changePasswordBtn =
document.getElementById(
"changePasswordBtn"
);

const passwordModalClose =
    document.getElementById(
        "passwordModalClose"
    );

const passwordModalCancel =
    document.getElementById(
        "passwordModalCancel"
    );

const passwordModalConfirm =
    document.getElementById(
        "passwordModalConfirm"
    );

const newPassword =
    document.getElementById(
        "newPassword"
    );

const confirmPassword =
    document.getElementById(
        "confirmPassword"
    );

const passwordModalError =
    document.getElementById(
        "passwordModalError"
    );


/*==================================
OPEN MODAL
==================================*/

function openPasswordModal(){

    if(!passwordModal){

        return;

    }


    passwordModal.classList.add(
        "active"
    );

    passwordModal.setAttribute(
        "aria-hidden",
        "false"
    );


    newPassword.value = "";
    confirmPassword.value = "";

    passwordModalError.textContent = "";


    setTimeout(
        () => {

            newPassword.focus();

        },
        150
    );

}


/*==================================
CLOSE MODAL
==================================*/

function closePasswordModal(){

    if(!passwordModal){

        return;

    }


    passwordModal.classList.remove(
        "active"
    );

    passwordModal.setAttribute(
        "aria-hidden",
        "true"
    );

}


/*==================================
VALIDATE PASSWORD
==================================*/

async function updatePassword(){

    const current =
        currentPassword
            ? currentPassword.value
            : "";

    const password =
        newPassword.value.trim();

    const confirmation =
        confirmPassword.value.trim();


    if(!current){

        passwordModalError.textContent =
            "Enter your current password.";

        return;

    }


    if(password.length < 8){

        passwordModalError.textContent =
            "New password must contain at least 8 characters.";

        return;

    }


    if(password !== confirmation){

        passwordModalError.textContent =
            "Passwords do not match.";

        return;

    }


    passwordModalError.textContent = "";


    if(passwordModalConfirm){

        passwordModalConfirm.disabled = true;
        passwordModalConfirm.textContent = "Updating...";

    }


    try{

        const response =
            await fetch(
                "/api/admin/password",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    credentials: "include",

                    body: JSON.stringify({
                        currentPassword:
                            current,

                        newPassword:
                            password
                    })
                }
            );


        const data =
            await response.json()
                .catch(
                    () => ({})
                );


        if(!response.ok){

            passwordModalError.textContent =
                data.message ||
                "Failed to update password.";

            return;

        }


        closePasswordModal();


        showSettingsMessage(
            data.message ||
            "Password updated successfully."
        );


    }catch(error){

        console.error(
            "VAULT PASSWORD UPDATE:",
            error
        );


        passwordModalError.textContent =
            "Unable to connect to the Vault server.";

    }finally{

        if(passwordModalConfirm){

            passwordModalConfirm.disabled = false;

            passwordModalConfirm.textContent =
                "Update Password";

        }

    }

}

/*==================================
SETTINGS MESSAGE
==================================*/

function showSettingsMessage(
    message,
    type = "success"
){

    const messageEl =
        document.createElement(
            "div"
        );


    messageEl.className =
        "settings-toast " +
        (
            type === "error"
                ? "error"
                : "success"
        );


    messageEl.textContent =
        message;


    document.body.appendChild(
        messageEl
    );


    requestAnimationFrame(
        () => {

            messageEl.classList.add(
                "active"
            );

        }
    );


    setTimeout(
        () => {

            messageEl.classList.remove(
                "active"
            );


            setTimeout(
                () => {

                    messageEl.remove();

                },
                250
            );

        },
        3500
    );

}



/*==================================
ADD ADMINISTRATOR
==================================*/

async function addAdministrator(){

    if(!newAdminName || !newAdminEmail || !newAdminPassword || !newAdminRole){

        return;

    }


    const fullName =
        newAdminName.value.trim();

    const email =
        newAdminEmail.value.trim();

    const password =
        newAdminPassword.value;

    const role =
        newAdminRole.value;


    if(!fullName){

        showSettingsMessage(
            "Enter the administrator name."
        );

        return;

    }


    if(!email){

        showSettingsMessage(
            "Enter the administrator email."
        );

        return;

    }


    if(password.length < 8){

        showSettingsMessage(
            "Password must contain at least 8 characters."
        );

        return;

    }


    if(!["admin", "super_admin"].includes(role)){

        showSettingsMessage(
            "Invalid administrator role."
        );

        return;

    }


    if(addAdminBtn){

        addAdminBtn.disabled = true;
        addAdminBtn.textContent = "Adding...";

    }


    try{

        const response =
            await fetch(
                "/api/admin/admins",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    credentials: "include",

                    body: JSON.stringify({
                        fullName,
                        email,
                        password,
                        role
                    })
                }
            );


        const data =
            await response.json()
                .catch(
                    () => ({})
                );


        if(!response.ok){

            throw new Error(
                data.message ||
                "Failed to create administrator."
            );

        }


        newAdminName.value = "";
        newAdminEmail.value = "";
        newAdminPassword.value = "";
        newAdminRole.value = "admin";


        showSettingsMessage(
            "Administrator created successfully."
        );


    }
    catch(error){

        console.error(
            "ADD ADMIN ERROR:",
            error
        );


        showSettingsMessage(
            error.message ||
            "Failed to create administrator."
        );

    }
    finally{

        if(addAdminBtn){

            addAdminBtn.disabled = false;
            addAdminBtn.textContent =
                "Add administrator";

        }

    }

}

/*==================================
ADMINISTRATOR ACCESS CONTROL
==================================*/

async function applyAdministratorAccess(){

    const managementSection =
        newAdminName
            ? newAdminName.closest(".settings-section")
            : null;

    if(!managementSection){
        return;
    }

    try{

        const response =
            await fetch(
                "/api/admin/session",
                {
                    method: "GET",
                    credentials: "include"
                }
            );

        const data =
            await response.json()
                .catch(
                    () => ({})
                );

        if(!response.ok || !data.admin){

            managementSection.style.display = "none";

            return;
        }

        const role =
            data.admin.role;

        if(role !== "super_admin"){

            managementSection.style.display = "none";

            return;
        }

        managementSection.style.display = "";

    }
    catch(error){

        console.error(
            "ADMIN ROLE CHECK:",
            error
        );

        managementSection.style.display = "none";
    }
}


/*==================================
ADMINISTRATOR LIST
==================================*/

const adminList =
    document.getElementById(
        "adminList"
    );

const refreshAdminsBtn =
    document.getElementById(
        "refreshAdminsBtn"
    );


async function loadAdministrators(){

    if(!adminList){
        return;
    }

    adminList.innerHTML =
        "<p class=\"admin-list-empty\">Loading administrators...</p>";

    try{

        const response =
            await fetch(
                "/api/admin/admins",
                {
                    method: "GET",
                    credentials: "include"
                }
            );

        const data =
            await response.json()
                .catch(
                    () => ({})
                );


        if(!response.ok){

            throw new Error(
                data.message ||
                "Failed to load administrators."
            );

        }


        const admins =
            Array.isArray(data.admins)
                ? data.admins
                : [];


        if(!admins.length){

            adminList.innerHTML =
                "<p class=\"admin-list-empty\">No administrators found.</p>";

            return;

        }


        adminList.innerHTML = "";


        admins.forEach(
            (admin) => {

                const item =
                    document.createElement(
                        "div"
                    );

                item.className =
                    "admin-list-item";


                const info =
                    document.createElement(
                        "div"
                    );

                info.className =
                    "admin-list-info";


                const name =
                    document.createElement(
                        "strong"
                    );

                name.textContent =
                    admin.fullName ||
                    "Unnamed administrator";


                const email =
                    document.createElement(
                        "span"
                    );

                email.textContent =
                    admin.email;


                const role =
                    document.createElement(
                        "span"
                    );

                role.textContent =
                    admin.role === "super_admin"
                        ? "Super Administrator"
                        : "Administrator";


                const status =
                    document.createElement(
                        "span"
                    );

                status.className =
                    admin.isActive
                        ? "admin-status active"
                        : "admin-status inactive";


                status.textContent =
                    admin.isActive
                        ? "Active"
                        : "Inactive";


                info.appendChild(name);
                info.appendChild(email);
                info.appendChild(role);
                info.appendChild(status);


                const actions =
                    document.createElement(
                        "div"
                    );

                actions.className =
                    "admin-list-actions";


                const statusBtn =
                    document.createElement(
                        "button"
                    );

                statusBtn.type = "button";

                statusBtn.className =
                    "settings-action";


                statusBtn.textContent =
                    admin.isActive
                        ? "Deactivate"
                        : "Activate";


                statusBtn.addEventListener(
                    "click",
                    () => updateAdministratorStatus(
                        admin.id,
                        !admin.isActive
                    )
                );


                actions.appendChild(
                    statusBtn
                );


                item.appendChild(info);
                item.appendChild(actions);


                adminList.appendChild(item);

            }
        );


    }
    catch(error){

        console.error(
            "LOAD ADMINS ERROR:",
            error
        );


        adminList.innerHTML =
            "<p class=\"admin-list-empty\">" +
            (error.message ||
            "Failed to load administrators.") +
            "</p>";

    }

}


async function updateAdministratorStatus(
    id,
    isActive
){

    try{

        const response =
            await fetch(
                `/api/admin/admins/${id}/status`,
                {
                    method: "PATCH",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    credentials: "include",

                    body: JSON.stringify({
                        isActive
                    })
                }
            );


        const data =
            await response.json()
                .catch(
                    () => ({})
                );


        if(!response.ok){

            throw new Error(
                data.message ||
                "Failed to update administrator status."
            );

        }


        showSettingsMessage(
            data.message ||
            (
                isActive
                    ? "Administrator activated."
                    : "Administrator deactivated."
            )
        );


    }

    catch(error){

        console.error(
            "ADMIN STATUS ERROR:",
            error
        );


        showSettingsMessage(
            error.message ||
            "Failed to update administrator status."
        );

    }

}


if(refreshAdminsBtn){

    refreshAdminsBtn.addEventListener(
        "click",
        loadAdministrators
    );

}

/*==================================
ADMINISTRATOR EVENTS
==================================*/

if(addAdminBtn){

    addAdminBtn.addEventListener(
        "click",
        addAdministrator
    );

}

applyAdministratorAccess();

if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", loadAdministrators);
}else{
    loadAdministrators();
}




/*==================================
RESET DEMO DATA
==================================*/

function resetDemoData(){

    const confirmed =
        window.confirm(
            "Reset all Vault demo settings?"
        );


    if(!confirmed){

        return;

    }


    localStorage.removeItem(
        SETTINGS_KEY
    );


    applySettings(
        defaultSettings
    );


    window.alert(
        "Vault demo settings have been reset."
    );

}


/*==================================
LOGOUT
==================================*/

function closeLogoutModal(){

    if(!logoutModal){
        return;
    }

    logoutModal.classList.remove(
        "active"
    );

    logoutModal.setAttribute(
        "aria-hidden",
        "true"
    );

}


async function logoutAdministrator(){

    if(logoutModalConfirm){

        logoutModalConfirm.disabled = true;

        logoutModalConfirm.textContent =
            "Logging out...";
    }

    try{

        const response =
            await fetch(
                "/api/admin/logout",
                {
                    method: "POST",
                    credentials: "include"
                }
            );

        if(!response.ok){

            const data =
                await response.json()
                    .catch(
                        () => ({})
                    );

            throw new Error(
                data.message ||
                "Failed to log out."
            );

        }

        window.location.href =
        "/login.html";

    }
    catch(error){

        console.error(
            "ADMIN LOGOUT ERROR:",
            error
        );

        closeLogoutModal();

        showSettingsMessage(
            error.message ||
            "Unable to log out."
        );

        if(logoutModalConfirm){

            logoutModalConfirm.disabled = false;

            logoutModalConfirm.textContent =
                "Log out";
        }

    }

}
/*==================================
EVENT LISTENERS
==================================*/

if(settingsSaveBtn){

    settingsSaveBtn.addEventListener(
        "click",
        saveSettings
    );

}




if(logoutBtn && logoutModal){

    logoutBtn.addEventListener(
        "click",
        () => {

            logoutModal.classList.add("active");
            logoutModal.setAttribute(
                "aria-hidden",
                "false"
            );

        }
    );

}

if(logoutModalClose){

    logoutModalClose.addEventListener(
        "click",
        closeLogoutModal
    );

}

if(logoutModalCancel){

    logoutModalCancel.addEventListener(
        "click",
        closeLogoutModal
    );

}

if(logoutModalConfirm){

    logoutModalConfirm.addEventListener(
        "click",
        logoutAdministrator
    );

}


/*==================================
INITIALIZE
==================================*/

loadSettings();


/*==================================
VAULT SETTINGS API
==================================*/

window.VaultSettings = {

    save:
        saveSettings,

    load:
        loadSettings,

    reset:
        resetDemoData

};


console.log(
    "VAULT SETTINGS MODULE LOADED"
);





























