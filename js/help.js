"use strict";

/* =========================================================
   VAULT HELP CONFIG
========================================================= */

const HELP_CONFIG = {
  whatsapp: {
    number: "254707562995",
    message: "Hi Vault, I need some assistance."
  },

  phone: {
    number: "+254707562995"
  },

  instagram: {
    url: "https://instagram.com/vault.moment.s"
  },

  email: {
    address: "charanamk2@gmail.com",
    subject: "Vault Assistance",
    body: "Hi Vault,\n\nI need some assistance with:"
  }
};


/* =========================================================
   DOM
========================================================= */

const getHelpBtn = document.getElementById("getHelpBtn");
const helpModule = document.getElementById("helpModule");
const helpModuleContent = document.getElementById("helpModuleContent");
const helpModuleTitle = document.getElementById("helpModuleTitle");

const helpModuleEyebrow = document.querySelector(
  "#helpModule .help-module-header .help-eyebrow"
);

const helpModuleCloseButtons = document.querySelectorAll(
  '[data-action="close-help-module"]'
);

const helpOptions = document.querySelectorAll("[data-help-module]");
const faqItems = document.querySelectorAll("[data-faq]");


/* =========================================================
   STATE
========================================================= */

let helpModuleOpen = false;


/*
 * These are the original Help home sections:
 *
 * 1. Assistance Options
 * 2. FAQs
 *
 * We keep the actual DOM nodes so event listeners remain intact.
 */
const helpHomeSections = helpModuleContent
  ? Array.from(
      helpModuleContent.querySelectorAll(":scope > .help-module-section")
    )
  : [];


/* =========================================================
   FAQ CONTENT
========================================================= */

const FAQ_CONTENT = {
  booking: {
    title: "How do I book an experience?",
    eyebrow: "BOOKING",
    content: `
      <p>
        Choose an upcoming experience from VAULT and select the ticket
        option that works for you.
      </p>

      <p>
        Follow the booking flow, enter your details and complete payment
        where required.
      </p>

      <p>
        Once your reservation is confirmed, your ticket and booking
        information will be available through your VAULT account.
      </p>
    `
  },

  tickets: {
    title: "Where can I find my tickets?",
    eyebrow: "TICKETS",
    content: `
      <p>
        Your confirmed tickets are stored inside <strong>My Vault</strong>.
      </p>

      <p>
        Open your account and check your bookings to view your ticket
        details and reference information.
      </p>
    `
  },

  payments: {
    title: "How do payments work?",
    eyebrow: "PAYMENTS",
    content: `
      <p>
        Paid experiences use the available payment options shown during
        checkout.
      </p>

      <p>
        After a successful payment, your reservation will be updated and
        your ticket can be accessed from your VAULT account.
      </p>

      <p>
        If your payment has gone through but your reservation has not
        updated, contact VAULT support.
      </p>
    `
  },

  cancellation: {
    title: "Can I cancel my booking?",
    eyebrow: "CANCELLATIONS",
    content: `
      <p>
        Cancellation availability depends on the specific experience
        and its booking terms.
      </p>

      <p>
        If you need to cancel a reservation, contact VAULT support as soon
        as possible with your booking reference.
      </p>
    `
  },

  "my-vault": {
    title: "What is My Vault?",
    eyebrow: "MY VAULT",
    content: `
      <p>
        <strong>My Vault</strong> is your personal space for keeping track
        of your VAULT experiences.
      </p>

      <p>
        Depending on the experience, you can use it to view bookings,
        tickets, saved experiences and other personal VAULT activity.
      </p>
    `
  },

  account: {
    title: "How do I manage my account?",
    eyebrow: "ACCOUNT",
    content: `
      <p>
        Your VAULT account keeps your personal details and experience
        activity connected to you.
      </p>

      <p>
        Sign in to access your bookings and other account features.
      </p>

      <p>
        If you are having trouble signing in, use the available account
        recovery options or contact VAULT support.
      </p>
    `
  },

  refunds: {
    title: "How do refunds work?",
    eyebrow: "REFUNDS",
    content: `
      <p>
        Refund eligibility depends on the experience, booking terms and
        circumstances surrounding the cancellation.
      </p>

      <p>
        If you believe you are entitled to a refund, contact VAULT support
        with your booking reference and payment information.
      </p>
    `
  },

  experience: {
    title: "What should I know before an experience?",
    eyebrow: "YOUR EXPERIENCE",
    content: `
      <p>
        Experience details such as location, date, time, dress code,
        ticket type and age requirements can vary.
      </p>

      <p>
        Check the individual experience page before booking so you know
        exactly what to expect.
      </p>
    `
  }
};


/* =========================================================
   MODULE OPEN / CLOSE
========================================================= */

function openHelpModule() {
  if (!helpModule) return;

  helpModuleOpen = true;

  showHelpHome();

  helpModule.setAttribute("aria-hidden", "false");
  document.body.classList.add("help-module-open");

  /*
   * Give the browser a moment to update the dialog before focusing.
   */
  requestAnimationFrame(() => {
    const closeButton = helpModule.querySelector(".help-module-close");

    if (closeButton) {
      closeButton.focus();
    }
  });
}


function closeHelpModule() {
  if (!helpModule) return;

  helpModuleOpen = false;

  helpModule.setAttribute("aria-hidden", "true");
  document.body.classList.remove("help-module-open");

  /*
   * Return the Help module to its home state so the next opening
   * always starts clean.
   */
  showHelpHome();
}


/* =========================================================
   HOME VIEW
========================================================= */

function showHelpHome() {
  if (!helpModuleContent) return;

  setModuleTitle("How Can We Help?");
  setModuleEyebrow("VAULT SUPPORT");

  /*
   * Remove any dynamic content such as:
   * - WhatsApp screen
   * - Phone screen
   * - Instagram screen
   * - Email screen
   * - FAQ screen
   * - Vault AI
   *
   * Then restore the original Help sections.
   */
  helpModuleContent.innerHTML = "";

  helpHomeSections.forEach(section => {
    section.hidden = false;
    helpModuleContent.appendChild(section);
  });
}


/* =========================================================
   ASSISTANCE
========================================================= */

function openAssistance(type) {
  if (!helpModuleContent) return;

  switch (type) {
    case "vault-ai":
      showVaultAI();
      return;

    case "whatsapp":
      showWhatsApp();
      return;

    case "phone":
      showPhone();
      return;

    case "instagram":
      showInstagram();
      return;

    case "email":
      showEmail();
      return;

    default:
      console.warn("Unknown Help option:", type);
  }
}


/* =========================================================
   DYNAMIC VIEW HELPER
========================================================= */

function showDynamicView({
  title,
  eyebrow,
  content
}) {
  if (!helpModuleContent) return;

  setModuleTitle(title);
  setModuleEyebrow(eyebrow);

  helpModuleContent.innerHTML = content;

  bindBackToHelp();
}


/* =========================================================
   BACK BUTTON
========================================================= */

function getBackButtonMarkup() {
  return `
    <button
      type="button"
      class="help-secondary-action"
      data-action="back-to-help"
    >
      <span aria-hidden="true">←</span>
      <span>Back to Help</span>
    </button>
  `;
}


function bindBackToHelp() {
  const backButton = helpModuleContent?.querySelector(
    '[data-action="back-to-help"]'
  );

  if (!backButton) return;

  backButton.addEventListener("click", () => {
    showHelpHome();
  });
}


/* =========================================================
   WHATSAPP
========================================================= */

function showWhatsApp() {
  const config = HELP_CONFIG.whatsapp;

  const whatsappUrl =
    `https://wa.me/${config.number}?text=${encodeURIComponent(
      config.message
    )}`;

  showDynamicView({
    title: "WhatsApp Support",
    eyebrow: "DIRECT SUPPORT",

    content: `
      <div class="help-detail">
        <div class="help-detail-icon" aria-hidden="true">WA</div>

        <h3>Chat with VAULT</h3>

        <p>
          Need a quick answer? Start a WhatsApp conversation with the
          VAULT team.
        </p>

        <a
          class="help-primary-action"
          href="${whatsappUrl}"
          target="_blank"
          rel="noopener noreferrer"
        >
          Open WhatsApp
        </a>

        ${getBackButtonMarkup()}
      </div>
    `
  });
}


/* =========================================================
   PHONE
========================================================= */

function showPhone() {
  const config = HELP_CONFIG.phone;

  showDynamicView({
    title: "Call VAULT",
    eyebrow: "DIRECT SUPPORT",

    content: `
      <div class="help-detail">
        <div class="help-detail-icon" aria-hidden="true">TEL</div>

        <h3>Speak with VAULT</h3>

        <p>
          If you'd rather speak directly, you can call the VAULT support
          line.
        </p>

        <a
          class="help-primary-action"
          href="tel:${config.number}"
        >
          Call VAULT
        </a>

        ${getBackButtonMarkup()}
      </div>
    `
  });
}


/* =========================================================
   INSTAGRAM
========================================================= */

function showInstagram() {
  const config = HELP_CONFIG.instagram;

  showDynamicView({
    title: "Instagram",
    eyebrow: "STAY CONNECTED",

    content: `
      <div class="help-detail">
        <div class="help-detail-icon" aria-hidden="true">IG</div>

        <h3>Follow VAULT</h3>

        <p>
          Follow VAULT on Instagram for upcoming experiences,
          announcements and updates.
        </p>

        <a
          class="help-primary-action"
          href="${config.url}"
          target="_blank"
          rel="noopener noreferrer"
        >
          Open Instagram
        </a>

        ${getBackButtonMarkup()}
      </div>
    `
  });
}


/* =========================================================
   EMAIL
========================================================= */

function showEmail() {
  const config = HELP_CONFIG.email;

  const mailtoUrl =
    `mailto:${config.address}` +
    `?subject=${encodeURIComponent(config.subject)}` +
    `&body=${encodeURIComponent(config.body)}`;

  showDynamicView({
    title: "Email VAULT",
    eyebrow: "DIRECT SUPPORT",

    content: `
      <div class="help-detail">
        <div class="help-detail-icon" aria-hidden="true">@</div>

        <h3>Send us an email</h3>

        <p>
          For detailed questions or support that doesn't need an immediate
          response, send us an email.
        </p>

        <a
          class="help-primary-action"
          href="${mailtoUrl}"
        >
          Send Email
        </a>

        ${getBackButtonMarkup()}
      </div>
    `
  });
}


/* =========================================================
   VAULT AI FALLBACK
========================================================= */

/*
 * vault-ai.js loads after this file and provides the real
 * showVaultAI() implementation.
 *
 * This fallback prevents the Help module from breaking if
 * vault-ai.js fails to load.
 */
if (typeof window.showVaultAI !== "function") {
  window.showVaultAI = function () {
    showDynamicView({
      title: "Vault AI",
      eyebrow: "VAULT SUPPORT",

      content: `
        <div class="help-detail">
          <div class="help-detail-icon" aria-hidden="true">AI</div>

          <h3>Vault AI is unavailable</h3>

          <p>
            The VAULT assistant could not be loaded right now.
            Please try another support option.
          </p>

          ${getBackButtonMarkup()}
        </div>
      `
    });
  };
}


/* =========================================================
   FAQ
========================================================= */

function openFAQ(faqKey) {
  const faq = FAQ_CONTENT[faqKey];

  if (!faq) {
    console.warn("Unknown FAQ:", faqKey);
    return;
  }

  showDynamicView({
    title: faq.title,
    eyebrow: faq.eyebrow,

    content: `
      <div class="help-detail faq-answer">
        <div class="help-detail-icon" aria-hidden="true">?</div>

        <h3>${faq.title}</h3>

        <div class="faq-answer-content">
          ${faq.content}
        </div>

        ${getBackButtonMarkup()}
      </div>
    `
  });
}


/* =========================================================
   MODULE TITLE / EYEBROW
========================================================= */

function setModuleTitle(title) {
  if (helpModuleTitle) {
    helpModuleTitle.textContent = title;
  }
}


function setModuleEyebrow(text) {
  if (helpModuleEyebrow) {
    helpModuleEyebrow.textContent = text;
  }
}


/* =========================================================
   EVENT LISTENERS
========================================================= */

if (getHelpBtn) {
  getHelpBtn.addEventListener("click", openHelpModule);
}


helpModuleCloseButtons.forEach(button => {
  button.addEventListener("click", closeHelpModule);
});


helpOptions.forEach(option => {
  option.addEventListener("click", () => {
    const type = option.dataset.helpModule;

    if (type) {
      openAssistance(type);
    }
  });
});


faqItems.forEach(item => {
  item.addEventListener("click", () => {
    const faqKey = item.dataset.faq;

    if (faqKey) {
      openFAQ(faqKey);
    }
  });
});


/*
 * Backdrop closes the Help module.
 */
const helpBackdrop = helpModule?.querySelector(
  ".help-module-backdrop"
);

if (helpBackdrop) {
  helpBackdrop.addEventListener("click", closeHelpModule);
}


/*
 * Escape closes the Help module.
 */
document.addEventListener("keydown", event => {
  if (
    event.key === "Escape" &&
    helpModuleOpen
  ) {
    closeHelpModule();
  }
});


/* =========================================================
   INITIAL STATE
========================================================= */

if (helpModule) {
  helpModule.setAttribute("aria-hidden", "true");
}

document.body.classList.remove("help-module-open");


/* =========================================================
   SUPPORT STYLES
========================================================= */

if (!document.getElementById("vault-help-runtime-styles")) {
  const style = document.createElement("style");

  style.id = "vault-help-runtime-styles";

  style.textContent = `
    body.help-module-open {
      overflow: hidden;
    }

    .help-detail {
      display: flex;
      flex-direction: column;
      gap: 18px;
      width: 100%;
    }

    .help-detail h3 {
      margin: 0;
    }

    .help-detail p {
      margin: 0;
      line-height: 1.7;
    }

    .help-detail-icon {
      width: 52px;
      height: 52px;
      display: grid;
      place-items: center;
      border-radius: 16px;
      border: 1px solid rgba(212, 175, 55, 0.28);
      background: rgba(212, 175, 55, 0.08);
      color: #d4af37;
      font-size: 0.78rem;
      font-weight: 700;
      letter-spacing: 0.08em;
    }

    .help-primary-action,
    .help-secondary-action {
      width: fit-content;
      min-height: 46px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 9px;
      padding: 0 20px;
      border-radius: 999px;
      text-decoration: none;
      cursor: pointer;
      font: inherit;
      transition:
        transform 180ms ease,
        border-color 180ms ease,
        background 180ms ease;
    }

    .help-primary-action {
      border: 1px solid rgba(212, 175, 55, 0.55);
      background: linear-gradient(
        135deg,
        rgba(212, 175, 55, 0.22),
        rgba(212, 175, 55, 0.08)
      );
      color: inherit;
    }

    .help-secondary-action {
      border: 1px solid rgba(255, 255, 255, 0.14);
      background: rgba(255, 255, 255, 0.04);
      color: inherit;
    }

    .help-primary-action:hover,
    .help-secondary-action:hover {
      transform: translateY(-2px);
    }

    .faq-answer-content {
      display: grid;
      gap: 14px;
    }

    .faq-answer-content p {
      margin: 0;
    }

    .faq-answer-content strong {
      color: inherit;
    }
  `;

  document.head.appendChild(style);
}


/* =========================================================
   READY
========================================================= */

console.log("[VAULT] Help module ready.");