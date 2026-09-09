"use strict";

/* ==================================================
   VAULT — HELP
   Help Module + Assistance + FAQs
================================================== */


/* ==================================================
   CONFIGURATION
================================================== */

const HELP_CONFIG = {

    whatsapp: {
        number: "", 
        message: "Hi Vault, I need some assistance."
    },

    phone: {
        number: ""
    },

    instagram: {
        url: ""
    },

    email: {
        address: "",
        subject: "Vault Assistance",
        body: "Hi Vault,\n\nI need some assistance with:"
    }

};


/* ==================================================
   DOM
================================================== */

const getHelpBtn =
    document.getElementById("getHelpBtn");

const helpModule =
    document.getElementById("helpModule");

const helpModuleContent =
    document.getElementById("helpModuleContent");

const helpModuleTitle =
    document.getElementById("helpModuleTitle");

const helpModuleEyebrow =
    document.getElementById("helpModuleEyebrow");

const helpModuleCloseButtons =
    document.querySelectorAll(
        '[data-action="close-help-module"]'
    );

const helpOptions =
    document.querySelectorAll(
        "[data-help-module]"
    );

const faqItems =
    document.querySelectorAll(
        "[data-faq]"
    );


/* ==================================================
   STATE
================================================== */

let helpModuleOpen = false;

let helpModuleHistory = [];


/* ==================================================
   FAQ CONTENT
================================================== */

const FAQ_CONTENT = {

    booking: {
        title: "How do I book an experience?",
        content: `
            <p>
                Choose an experience from the upcoming experiences
                section and select <strong>Book Now</strong>.
            </p>

            <p>
                Follow the booking steps, select your ticket category,
                enter your details and complete the payment process.
            </p>

            <p>
                Once your booking is confirmed, your ticket will be
                available through <strong>My Vault</strong>.
            </p>
        `
    },


    tickets: {
        title: "How do I receive my ticket?",
        content: `
            <p>
                After your reservation and payment have been successfully
                completed, your ticket is generated automatically.
            </p>

            <p>
                You can access your ticket from
                <strong>My Vault</strong>.
            </p>

            <p>
                Save your ticket to your device before heading to the
                experience.
            </p>
        `
    },


    payments: {
        title: "What happens after payment?",
        content: `
            <p>
                Your payment is verified by Vault before your reservation
                is confirmed.
            </p>

            <p>
                Once the payment is successfully confirmed, your booking
                status changes and your ticket becomes available.
            </p>

            <p>
                If your payment was completed but your booking has not
                updated, contact Vault support.
            </p>
        `
    },


    cancellation: {
        title: "Can I cancel my booking?",
        content: `
            <p>
                Cancellation depends on the specific experience and its
                stated booking policy.
            </p>

            <p>
                Check the experience information before booking.
            </p>

            <p>
                If you need help with a cancellation, contact Vault
                support and include your booking details.
            </p>
        `
    },


    "my-vault": {
        title: "Where are my bookings?",
        content: `
            <p>
                Your confirmed experiences are available in
                <strong>My Vault</strong>.
            </p>

            <p>
                From there you can view your bookings and access your
                available tickets.
            </p>

            <p>
                Make sure you are signed into the account used when
                making the booking.
            </p>
        `
    },


    account: {
        title: "How does my account work?",
        content: `
            <p>
                Your Vault account keeps your experiences, bookings and
                tickets connected to you.
            </p>

            <p>
                Use <strong>My Vault</strong> to access your personal
                booking history and saved experiences.
            </p>
        `
    },


    refunds: {
        title: "How do refunds work?",
        content: `
            <p>
                Refund eligibility depends on the experience's
                cancellation and refund policy.
            </p>

            <p>
                If you believe you are entitled to a refund, contact
                Vault support with your booking information.
            </p>

            <p>
                Our team will review the request and guide you through
                the next steps.
            </p>
        `
    },


    experience: {
        title: "What should I know before an experience?",
        content: `
            <p>
                Check the experience details carefully before attending.
            </p>

            <p>
                Pay attention to the date, time, venue, ticket category
                and any specific instructions provided by Vault.
            </p>

            <p>
                Keep your ticket accessible when arriving at the venue.
            </p>
        `
    }

};


/* ==================================================
   OPEN HELP MODULE
================================================== */

function openHelpModule() {

    if (!helpModule) return;

    helpModuleOpen = true;

    helpModuleHistory = [];

    showHelpHome();

    helpModule.setAttribute(
        "aria-hidden",
        "false"
    );

    document.body.classList.add(
        "help-module-open"
    );

}


/* ==================================================
   CLOSE HELP MODULE
================================================== */

function closeHelpModule() {

    if (!helpModule) return;

    helpModuleOpen = false;

    helpModuleHistory = [];

    helpModule.setAttribute(
        "aria-hidden",
        "true"
    );

    document.body.classList.remove(
        "help-module-open"
    );

}


/* ==================================================
   SHOW HELP HOME
================================================== */

function showHelpHome() {

    helpModuleHistory = [];

    if (helpModuleTitle) {
        helpModuleTitle.textContent =
            "How Can We Help?";
    }

    if (helpModuleEyebrow) {
        helpModuleEyebrow.textContent =
            "VAULT SUPPORT";
    }

    if (helpModuleContent) {
        helpModuleContent.innerHTML = "";
    }

    /*
        The main assistance options and FAQs already exist
        inside the module HTML.

        Nothing needs to be rendered here.
    */

    const moduleSections =
        document.querySelectorAll(
            ".help-module-section"
        );

    moduleSections.forEach(section => {
        section.hidden = false;
    });

}


/* ==================================================
   SHOW ASSISTANCE MODULE
================================================== */

function openAssistance(type) {

    if (!helpModuleContent) return;

    const moduleSections =
        document.querySelectorAll(
            ".help-module-section"
        );

    moduleSections.forEach(section => {
        section.hidden = true;
    });

    helpModuleHistory.push("home");

    if (helpModuleEyebrow) {
        helpModuleEyebrow.textContent =
            "VAULT ASSISTANCE";
    }

    switch (type) {

        case "vault-ai":
            showVaultAI();
            break;

        case "whatsapp":
            showWhatsApp();
            break;

        case "phone":
            showPhone();
            break;

        case "instagram":
            showInstagram();
            break;

        case "email":
            showEmail();
            break;

        default:
            return;
    }

}


/* ==================================================
   VAULT AI
================================================== */

function showVaultAI() {

    setModuleTitle("Vault AI");

    helpModuleContent.innerHTML = `

        <div class="help-detail">

            <span class="help-detail-icon">✦</span>

            <h3>Meet Vault AI</h3>

            <p>
                Your instant Vault assistant for questions about
                experiences, bookings, tickets and more.
            </p>

            <button
                type="button"
                class="help-primary-action"
                id="launchVaultAI"
            >
                Start With Vault AI
                <span>→</span>
            </button>

        </div>

    `;

    const launchButton =
        document.getElementById("launchVaultAI");

    if (launchButton) {

        launchButton.addEventListener(
            "click",
            () => {

                /*
                    Vault AI integration will be connected here.
                */

                console.log(
                    "Vault AI requested"
                );

            }
        );

    }

}


/* ==================================================
   WHATSAPP
================================================== */

function showWhatsApp() {

    setModuleTitle("WhatsApp");

    const number =
        HELP_CONFIG.whatsapp.number;

    const message =
        encodeURIComponent(
            HELP_CONFIG.whatsapp.message
        );

    const hasNumber =
        Boolean(number);

    helpModuleContent.innerHTML = `

        <div class="help-detail">

            <span class="help-detail-icon">◌</span>

            <h3>Chat With Vault</h3>

            <p>
                Reach the Vault team directly on WhatsApp for
                assistance with your booking or experience.
            </p>

            ${
                hasNumber
                    ? `
                        <a
                            class="help-primary-action"
                            href="https://wa.me/${number}?text=${message}"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            Open WhatsApp
                            <span>→</span>
                        </a>
                    `
                    : `
                        <p class="help-unavailable">
                            WhatsApp contact details are currently
                            unavailable.
                        </p>
                    `
            }

        </div>

    `;

}


/* ==================================================
   PHONE
================================================== */

function showPhone() {

    setModuleTitle("Phone");

    const number =
        HELP_CONFIG.phone.number;

    const hasNumber =
        Boolean(number);

    helpModuleContent.innerHTML = `

        <div class="help-detail">

            <span class="help-detail-icon">⌕</span>

            <h3>Speak With Vault</h3>

            <p>
                Prefer a conversation? Call the Vault team directly
                for assistance.
            </p>

            ${
                hasNumber
                    ? `
                        <a
                            class="help-primary-action"
                            href="tel:${number}"
                        >
                            Call Vault
                            <span>→</span>
                        </a>
                    `
                    : `
                        <p class="help-unavailable">
                            Phone contact details are currently
                            unavailable.
                        </p>
                    `
            }

        </div>

    `;

}


/* ==================================================
   INSTAGRAM
================================================== */

function showInstagram() {

    setModuleTitle("Instagram");

    const url =
        HELP_CONFIG.instagram.url;

    const hasUrl =
        Boolean(url);

    helpModuleContent.innerHTML = `

        <div class="help-detail">

            <span class="help-detail-icon">◎</span>

            <h3>Follow Vault</h3>

            <p>
                Connect with Vault on Instagram for updates,
                upcoming experiences and more.
            </p>

            ${
                hasUrl
                    ? `
                        <a
                            class="help-primary-action"
                            href="${url}"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            Open Instagram
                            <span>→</span>
                        </a>
                    `
                    : `
                        <p class="help-unavailable">
                            Instagram details are currently
                            unavailable.
                        </p>
                    `
            }

        </div>

    `;

}


/* ==================================================
   EMAIL
================================================== */

function showEmail() {

    setModuleTitle("Email");

    const address =
        HELP_CONFIG.email.address;

    const subject =
        encodeURIComponent(
            HELP_CONFIG.email.subject
        );

    const body =
        encodeURIComponent(
            HELP_CONFIG.email.body
        );

    const hasAddress =
        Boolean(address);

    helpModuleContent.innerHTML = `

        <div class="help-detail">

            <span class="help-detail-icon">✉</span>

            <h3>Email Vault</h3>

            <p>
                Send us an email and tell us how we can help.
            </p>

            ${
                hasAddress
                    ? `
                        <a
                            class="help-primary-action"
                            href="mailto:${address}?subject=${subject}&body=${body}"
                        >
                            Send Email
                            <span>→</span>
                        </a>
                    `
                    : `
                        <p class="help-unavailable">
                            Email contact details are currently
                            unavailable.
                        </p>
                    `
            }

        </div>

    `;

}


/* ==================================================
   FAQ MODULE
================================================== */

function openFAQ(faqKey) {

    const faq =
        FAQ_CONTENT[faqKey];

    if (!faq || !helpModuleContent) return;

    const moduleSections =
        document.querySelectorAll(
            ".help-module-section"
        );

    moduleSections.forEach(section => {
        section.hidden = true;
    });

    helpModuleHistory.push("home");

    setModuleTitle("FAQ");

    if (helpModuleEyebrow) {
        helpModuleEyebrow.textContent =
            "VAULT FAQ";
    }

    helpModuleContent.innerHTML = `

        <article class="help-detail faq-detail">

            <h3>${faq.title}</h3>

            <div class="faq-answer">
                ${faq.content}
            </div>

            <button
                type="button"
                class="help-secondary-action"
                id="faqBackBtn"
            >
                <span>←</span>
                Back to FAQs
            </button>

        </article>

    `;

    const faqBackBtn =
        document.getElementById("faqBackBtn");

    if (faqBackBtn) {

        faqBackBtn.addEventListener(
            "click",
            showHelpHome
        );

    }

}


/* ==================================================
   SET MODULE TITLE
================================================== */

function setModuleTitle(title) {

    if (!helpModuleTitle) return;

    helpModuleTitle.textContent =
        title;

}


/* ==================================================
   BACK TO HELP MENU
================================================== */

function goBackToHelp() {

    if (helpModuleHistory.length === 0) {

        showHelpHome();

        return;
    }

    helpModuleHistory.pop();

    showHelpHome();

}


/* ==================================================
   EVENT LISTENERS
================================================== */


/* GET HELP */

if (getHelpBtn) {

    getHelpBtn.addEventListener(
        "click",
        openHelpModule
    );

}


/* CLOSE BUTTONS */

helpModuleCloseButtons.forEach(button => {

    button.addEventListener(
        "click",
        closeHelpModule
    );

});


/* ASSISTANCE OPTIONS */

helpOptions.forEach(button => {

    button.addEventListener(
        "click",
        () => {

            const type =
                button.dataset.helpModule;

            openAssistance(type);

        }
    );

});


/* FAQ BUTTONS */

faqItems.forEach(button => {

    button.addEventListener(
        "click",
        () => {

            const faq =
                button.dataset.faq;

            openFAQ(faq);

        }
    );

});


/* ==================================================
   BACKDROP
================================================== */

const helpBackdrop =
    document.querySelector(
        ".help-module-backdrop"
    );

if (helpBackdrop) {

    helpBackdrop.addEventListener(
        "click",
        closeHelpModule
    );

}


/* ==================================================
   ESCAPE KEY
================================================== */

document.addEventListener(
    "keydown",
    event => {

        if (
            event.key === "Escape" &&
            helpModuleOpen
        ) {

            closeHelpModule();

        }

    }
);


/* ==================================================
   BODY SCROLL LOCK
================================================== */

const helpStyle =
    document.createElement("style");

helpStyle.textContent = `

    body.help-module-open {
        overflow: hidden;
    }

    .help-detail {
        display: flex;
        flex-direction: column;
        gap: 16px;
    }

    .help-detail h3 {
        margin: 0;

        font-family: var(--font-display);
        font-size: 2rem;
        font-weight: 500;

        color: var(--text);
    }

    .help-detail p {
        margin: 0;

        font-family: var(--font-ui);
        font-size: 0.9rem;
        line-height: 1.7;

        color: var(--text-soft);
    }

    .help-detail-icon {
        display: grid;
        place-items: center;

        width: 48px;
        height: 48px;

        border: 1px solid var(--gold-border);
        border-radius: 50%;

        background: var(--gold-soft);

        color: var(--accent);

        font-size: 1.25rem;
    }

    .help-primary-action,
    .help-secondary-action {
        display: flex;
        align-items: center;
        justify-content: space-between;

        width: 100%;
        min-height: 54px;

        margin-top: 8px;
        padding: 0 18px;

        border: 1px solid var(--gold-border);
        border-radius: var(--radius-md);

        background: var(--gold-soft);

        color: var(--text);

        font-family: var(--font-ui);
        font-size: 0.76rem;
        font-weight: 600;
        letter-spacing: 0.1em;
        text-transform: uppercase;

        text-decoration: none;

        cursor: pointer;

        transition:
            background var(--transition-base),
            border-color var(--transition-base),
            transform var(--transition-base);
    }

    .help-primary-action:hover,
    .help-secondary-action:hover {
        background: rgba(201, 164, 92, 0.22);
        border-color: rgba(201, 164, 92, 0.45);
    }

    .help-primary-action span {
        color: var(--accent);
    }

    .help-secondary-action {
        justify-content: flex-start;
        gap: 10px;

        background: transparent;
    }

    .help-secondary-action span {
        color: var(--accent);
    }

    .help-unavailable {
        padding: 14px;

        border: 1px solid var(--border);
        border-radius: var(--radius-md);

        background: rgba(255, 255, 255, 0.025);

        font-size: 0.8rem !important;
    }

    .faq-answer {
        display: flex;
        flex-direction: column;
        gap: 14px;

        padding-bottom: 8px;
    }

    .faq-answer strong {
        color: var(--text);
        font-weight: 600;
    }

`;

document.head.appendChild(helpStyle);


/* ==================================================
   INITIAL STATE
================================================== */

if (helpModule) {

    helpModule.setAttribute(
        "aria-hidden",
        "true"
    );

}


/* ==================================================
   VAULT HELP READY
================================================== */

console.log(
    "VAULT Help module ready."
);