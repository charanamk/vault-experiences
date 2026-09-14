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


/* ==================================================
   VAULT AI — BACKEND
================================================== */

const VAULT_API_BASE =
    "https://vault-experiences.onrender.com";

const vaultAiState = {
    events: null,
    eventsLoadedAt: 0,
    reservations: null,
    reservationsLoadedAt: 0,
    reservationsAuthFailed: false
};

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
   Opens a chat interface. No AI model — every answer
   is built by matching keywords in the question
   against real Vault data (events, a user's own
   reservations, and the existing FAQ content).
================================================== */

function showVaultAI() {

    setModuleTitle("Vault AI");

    helpModuleContent.innerHTML = `

        <div class="vault-ai-chat" id="vaultAiChat">

            <div
                class="vault-ai-messages"
                id="vaultAiMessages"
                role="log"
                aria-live="polite"
            ></div>

            <form
                class="vault-ai-input-row"
                id="vaultAiForm"
            >
                <input
                    type="text"
                    id="vaultAiInput"
                    placeholder="Ask about events, bookings, tickets..."
                    autocomplete="off"
                />

                <button
                    type="submit"
                    class="vault-ai-send"
                    aria-label="Send"
                >
                    →
                </button>
            </form>

        </div>

    `;

    vaultAiPrefetch();

    (async () => {

        const greetingTyping =
            vaultAiAppendTyping();

        await vaultAiSleep(700);

        greetingTyping?.remove();

        vaultAiAppendMessage(
            "bot",
            "Hi, I'm Vault AI. I can look up events, ticket " +
            "prices, dates, and your own bookings. What do " +
            "you need?"
        );

    })();

    const vaultAiForm =
        document.getElementById("vaultAiForm");

    const vaultAiInput =
        document.getElementById("vaultAiInput");

    const vaultAiSendBtn =
        document.querySelector(
            "#vaultAiForm .vault-ai-send"
        );

    if (vaultAiForm) {

        vaultAiForm.addEventListener(
            "submit",
            (event) => {

                event.preventDefault();

                const question =
                    (vaultAiInput?.value || "").trim();

                if (!question) return;

                if (vaultAiInput) {
                    vaultAiInput.value = "";
                    vaultAiInput.disabled = true;
                }

                if (vaultAiSendBtn) {
                    vaultAiSendBtn.disabled = true;
                }

                vaultAiAppendMessage(
                    "user",
                    question
                );

                vaultAiHandleQuestion(question).finally(
                    () => {

                        if (vaultAiInput) {
                            vaultAiInput.disabled = false;
                            vaultAiInput.focus();
                        }

                        if (vaultAiSendBtn) {
                            vaultAiSendBtn.disabled = false;
                        }

                    }
                );

            }
        );

    }

    if (vaultAiInput) {
        vaultAiInput.focus();
    }

}


/* ==================================================
   VAULT AI — MESSAGE RENDERING
================================================== */

function vaultAiAppendMessage(role, html) {

    const messages =
        document.getElementById("vaultAiMessages");

    if (!messages) return;

    const bubble =
        document.createElement("div");

    bubble.className =
        role === "user"
            ? "vault-ai-message vault-ai-message-user"
            : "vault-ai-message vault-ai-message-bot";

    bubble.innerHTML = html;

    messages.appendChild(bubble);

    messages.scrollTop =
        messages.scrollHeight;

    return bubble;

}

function vaultAiAppendTyping() {

    const messages =
        document.getElementById("vaultAiMessages");

    if (!messages) return null;

    const bubble =
        document.createElement("div");

    bubble.className =
        "vault-ai-message vault-ai-message-bot vault-ai-typing";

    bubble.innerHTML =
        `<span></span><span></span><span></span>`;

    messages.appendChild(bubble);

    messages.scrollTop =
        messages.scrollHeight;

    return bubble;

}


/* ==================================================
   VAULT AI — DATA FETCHING
   Cached in memory for the life of the chat session
   so repeated questions don't re-hit the API.
================================================== */

async function vaultAiFetchEvents(force) {

    const cacheAgeMs =
        Date.now() - vaultAiState.eventsLoadedAt;

    if (
        !force &&
        vaultAiState.events &&
        cacheAgeMs < 2 * 60 * 1000
    ) {
        return vaultAiState.events;
    }

    const response =
        await fetch(
            `${VAULT_API_BASE}/api/events`
        );

    if (!response.ok) {
        throw new Error(
            "Failed to load events"
        );
    }

    const events =
        await response.json();

    vaultAiState.events =
        Array.isArray(events) ? events : [];

    vaultAiState.eventsLoadedAt =
        Date.now();

    return vaultAiState.events;

}

async function vaultAiFetchMyReservations(force) {

    if (
        !force &&
        vaultAiState.reservations &&
        Date.now() - vaultAiState.reservationsLoadedAt < 60 * 1000
    ) {
        return vaultAiState.reservations;
    }

    const response =
        await fetch(
            `${VAULT_API_BASE}/api/reservations/mine`,
            { credentials: "include" }
        );

    if (response.status === 401) {
        vaultAiState.reservationsAuthFailed = true;
        return null;
    }

    if (!response.ok) {
        throw new Error(
            "Failed to load reservations"
        );
    }

    const data =
        await response.json();

    vaultAiState.reservations =
        Array.isArray(data?.reservations)
            ? data.reservations
            : [];

    vaultAiState.reservationsLoadedAt =
        Date.now();

    vaultAiState.reservationsAuthFailed = false;

    return vaultAiState.reservations;

}

function vaultAiPrefetch() {

    vaultAiFetchEvents().catch(() => {});

}


/* ==================================================
   VAULT AI — TEXT HELPERS
================================================== */

function vaultAiNormalize(text) {

    return String(text || "")
        .toLowerCase()
        .replace(/[^\w\s]/g, " ")
        .replace(/\s+/g, " ")
        .trim();

}

function vaultAiSleep(ms) {

    return new Promise(
        (resolve) => setTimeout(resolve, ms)
    );

}

function vaultAiTypingDelayFor(html) {

    const plainLength =
        String(html || "")
            .replace(/<[^>]+>/g, "")
            .length;

    // Roughly simulates reading + composing time,
    // clamped so short answers aren't instant and
    // long ones don't drag.

    return Math.min(
        1900,
        Math.max(550, 320 + plainLength * 6)
    );

}

function vaultAiContainsAny(text, keywords) {

    return keywords.some(
        (word) => text.includes(word)
    );

}

function vaultAiFormatDate(dateValue) {

    if (!dateValue) return "TBA";

    const date =
        new Date(dateValue);

    if (Number.isNaN(date.getTime())) {
        return String(dateValue);
    }

    return date.toLocaleDateString(
        "en-US",
        {
            weekday: "short",
            month: "short",
            day: "numeric",
            year: "numeric"
        }
    );

}

function vaultAiFormatMoney(amount) {

    const value =
        Number(amount);

    if (!Number.isFinite(value)) {
        return "TBA";
    }

    if (value === 0) {
        return "Free";
    }

    return `KES ${value.toLocaleString("en-US")}`;

}

function vaultAiFindEvent(events, question) {

    const normalizedQuestion =
        vaultAiNormalize(question);

    const questionWords =
        normalizedQuestion
            .split(" ")
            .filter((word) => word.length > 2);

    let bestMatch = null;
    let bestScore = 0;

    events.forEach((event) => {

        const title =
            vaultAiNormalize(event.title);

        if (!title) return;

        if (normalizedQuestion.includes(title)) {

            const score = title.length * 2;

            if (score > bestScore) {
                bestScore = score;
                bestMatch = event;
            }

            return;

        }

        const titleWords =
            title.split(" ");

        const overlap =
            titleWords.filter(
                (word) =>
                    word.length > 2 &&
                    questionWords.includes(word)
            ).length;

        if (
            overlap > 0 &&
            overlap > bestScore
        ) {
            bestScore = overlap;
            bestMatch = event;
        }

    });

    return bestScore > 0 ? bestMatch : null;

}


/* ==================================================
   VAULT AI — INTENT + ANSWERS
================================================== */

const VAULT_AI_KEYWORDS = {

    booking: [
        "my booking", "my bookings", "my reservation",
        "my reservations", "my ticket", "my tickets",
        "did i book", "have i booked", "my order"
    ],

    price: [
        "price", "cost", "how much", "pricing", "fee"
    ],

    date: [
        "when", "date", "what day", "what time", "time is"
    ],

    location: [
        "where", "venue", "location", "address"
    ],

    dressCode: [
        "dress code", "what to wear", "attire", "outfit"
    ],

    age: [
        "age", "18+", "21+", "age restriction", "how old"
    ],

    availability: [
        "sold out", "available", "tickets left",
        "any tickets", "spots left"
    ],

    listEvents: [
        "upcoming events", "what events", "what's on",
        "whats on", "show me events", "list events",
        "any events", "what experiences"
    ]

};

async function vaultAiHandleQuestion(question) {

    const typingBubble =
        vaultAiAppendTyping();

    try {

        const normalized =
            vaultAiNormalize(question);

        let reply;

        if (
            vaultAiContainsAny(
                normalized,
                VAULT_AI_KEYWORDS.booking
            )
        ) {

            reply =
                await vaultAiAnswerBooking();

        } else if (
            vaultAiContainsAny(
                normalized,
                VAULT_AI_KEYWORDS.listEvents
            )
        ) {

            reply =
                await vaultAiAnswerEventList();

        } else {

            reply =
                await vaultAiAnswerEventQuestion(
                    normalized
                );

            if (!reply) {
                reply =
                    vaultAiAnswerFromFaq(normalized);
            }

        }

        if (!reply) {
            reply = vaultAiFallbackReply();
        }

        await vaultAiSleep(
            vaultAiTypingDelayFor(reply)
        );

        typingBubble?.remove();

        vaultAiAppendMessage(
            "bot",
            reply
        );

    } catch (error) {

        console.error(
            "VAULT AI ERROR:",
            error
        );

        await vaultAiSleep(400);

        typingBubble?.remove();

        vaultAiAppendMessage(
            "bot",
            "I couldn't reach Vault's servers just now. " +
            "Please try again in a moment, or use the " +
            "other contact options."
        );

    }

}

async function vaultAiAnswerBooking() {

    const reservations =
        await vaultAiFetchMyReservations();

    if (vaultAiState.reservationsAuthFailed) {

        return (
            "I can't find your bookings because you're " +
            "not signed in. Please log in to your Vault " +
            "account, then ask me again."
        );

    }

    if (!reservations || reservations.length === 0) {

        return (
            "You don't have any bookings yet. Head to " +
            "Upcoming Experiences to book one."
        );

    }

    const rows = reservations
        .slice(0, 5)
        .map((reservation) => {

            const eventTitle =
                reservation.title || "An experience";

            const eventDate =
                vaultAiFormatDate(
                    reservation.event_date
                );

            const status =
                reservation.ticket_status ||
                reservation.payment_status ||
                "confirmed";

            const reference =
                reservation.ticket_reference ||
                reservation.reference;

            return (
                `<p><strong>${eventTitle}</strong> — ` +
                `${eventDate}, ${reservation.location || "TBA"}<br>` +
                `Guests: ${reservation.guests} · ` +
                `Status: ${status} · ` +
                `Ref: ${reference}</p>`
            );

        })
        .join("");

    return (
        `<p>Here's what I found on your account:</p>${rows}`
    );

}

async function vaultAiAnswerEventList() {

    const events =
        await vaultAiFetchEvents();

    const upcoming =
        events.filter(
            (event) => event.status === "upcoming"
        );

    const list =
        (upcoming.length ? upcoming : events)
            .slice(0, 6)
            .map((event) => {

                return (
                    `<p><strong>${event.title}</strong> — ` +
                    `${vaultAiFormatDate(event.date)}, ` +
                    `${event.location || "TBA"}</p>`
                );

            })
            .join("");

    if (!list) {

        return (
            "There are no events listed right now. " +
            "Check back soon."
        );

    }

    return (
        `<p>Here's what's coming up:</p>${list}` +
        `<p>Ask me about any of these by name for more ` +
        `details.</p>`
    );

}

async function vaultAiAnswerEventQuestion(normalized) {

    const events =
        await vaultAiFetchEvents();

    const event =
        vaultAiFindEvent(events, normalized);

    if (!event) return null;

    if (
        vaultAiContainsAny(
            normalized,
            VAULT_AI_KEYWORDS.price
        )
    ) {

        if (!Array.isArray(event.tickets) || !event.tickets.length) {
            return (
                `<p>Pricing for <strong>${event.title}</strong> ` +
                `isn't listed yet.</p>`
            );
        }

        const tickets = event.tickets
            .map((ticket) => {

                return (
                    `${ticket.name}: ` +
                    `${vaultAiFormatMoney(ticket.price)}` +
                    `${ticket.available ? "" : " (sold out)"}`
                );

            })
            .join("<br>");

        return (
            `<p><strong>${event.title}</strong> ticket ` +
            `prices:<br>${tickets}</p>`
        );

    }

    if (
        vaultAiContainsAny(
            normalized,
            VAULT_AI_KEYWORDS.date
        )
    ) {

        return (
            `<p><strong>${event.title}</strong> is on ` +
            `${vaultAiFormatDate(event.date)}` +
            `${event.time ? ` at ${event.time}` : ""}.</p>`
        );

    }

    if (
        vaultAiContainsAny(
            normalized,
            VAULT_AI_KEYWORDS.location
        )
    ) {

        return (
            `<p><strong>${event.title}</strong> is at ` +
            `${event.location || "a location TBA"}` +
            `${event.locationNote ? ` — ${event.locationNote}` : ""}.</p>`
        );

    }

    if (
        vaultAiContainsAny(
            normalized,
            VAULT_AI_KEYWORDS.dressCode
        )
    ) {

        return (
            `<p>Dress code for <strong>${event.title}</strong>: ` +
            `${event.dressCode || "Not specified."}</p>`
        );

    }

    if (
        vaultAiContainsAny(
            normalized,
            VAULT_AI_KEYWORDS.age
        )
    ) {

        return (
            `<p>Age restriction for <strong>${event.title}</strong>: ` +
            `${event.ageRestriction || "None listed."}</p>`
        );

    }

    if (
        vaultAiContainsAny(
            normalized,
            VAULT_AI_KEYWORDS.availability
        )
    ) {

        if (!Array.isArray(event.tickets) || !event.tickets.length) {
            return (
                `<p>Ticket availability for ` +
                `<strong>${event.title}</strong> isn't listed ` +
                `yet.</p>`
            );
        }

        const availability = event.tickets
            .map((ticket) => {

                return (
                    `${ticket.name}: ` +
                    `${ticket.available ? "Available" : "Sold out"}`
                );

            })
            .join("<br>");

        return (
            `<p><strong>${event.title}</strong> availability:` +
            `<br>${availability}</p>`
        );

    }

    // No specific sub-intent matched — give a general summary.

    return (
        `<p><strong>${event.title}</strong><br>` +
        `${vaultAiFormatDate(event.date)}` +
        `${event.time ? `, ${event.time}` : ""} · ` +
        `${event.location || "TBA"}</p>` +
        `<p>${event.shortDescription || event.description || ""}</p>`
    );

}

function vaultAiAnswerFromFaq(normalized) {

    const questionWords =
        normalized
            .split(" ")
            .filter((word) => word.length > 2);

    let bestKey = null;
    let bestScore = 0;

    Object.keys(FAQ_CONTENT).forEach((key) => {

        const faq =
            FAQ_CONTENT[key];

        const titleWords =
            vaultAiNormalize(faq.title).split(" ");

        const overlap =
            titleWords.filter(
                (word) =>
                    word.length > 2 &&
                    questionWords.includes(word)
            ).length;

        if (overlap > bestScore) {
            bestScore = overlap;
            bestKey = key;
        }

    });

    if (!bestKey || bestScore < 2) return null;

    const faq =
        FAQ_CONTENT[bestKey];

    return (
        `<p><strong>${faq.title}</strong></p>${faq.content}`
    );

}

function vaultAiFallbackReply() {

    return (
        "I couldn't find anything matching that. Try " +
        "asking about a specific event, \"my bookings\", " +
        "or check the FAQs below — or reach Vault " +
        "directly from the other contact options."
    );

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
   FAQ ACCORDION
   Answers expand directly beneath their own question
   instead of replacing the whole panel.
================================================== */

function toggleFaqAnswer(button) {

    const faqKey =
        button.dataset.faq;

    const faq =
        FAQ_CONTENT[faqKey];

    if (!faq) return;

    const list =
        button.closest(".faq-list");

    const isOpen =
        button.getAttribute("aria-expanded") === "true";

    // Close any other open FAQ first (single-open accordion).
    if (list) {

        list.querySelectorAll(
            '.faq-item[aria-expanded="true"]'
        ).forEach(otherButton => {

            if (otherButton !== button) {
                collapseFaqAnswer(otherButton);
            }

        });

    }

    if (isOpen) {
        collapseFaqAnswer(button);
    } else {
        expandFaqAnswer(button, faq);
    }

}

function expandFaqAnswer(button, faq) {

    let panel =
        button.nextElementSibling;

    if (!panel || !panel.classList.contains("faq-answer")) {

        panel =
            document.createElement("div");

        panel.className = "faq-answer";

        panel.innerHTML =
            `<div class="faq-answer-inner">${faq.content}</div>`;

        button.insertAdjacentElement(
            "afterend",
            panel
        );

    }

    const inner =
        panel.querySelector(".faq-answer-inner");

    // Measure the real content height and animate to
    // that exact pixel value — more reliable across
    // browsers than animating an intrinsic-sized track.
    panel.style.maxHeight =
        `${inner.scrollHeight}px`;

    panel.classList.add("is-open");

    button.setAttribute("aria-expanded", "true");

}

function collapseFaqAnswer(button) {

    const panel =
        button.nextElementSibling;

    if (panel && panel.classList.contains("faq-answer")) {

        // Lock in the current rendered height first (in
        // case it was never explicitly set, or content
        // changed), then transition down to 0 on the
        // next frame so the animation actually plays.
        panel.style.maxHeight =
            `${panel.scrollHeight}px`;

        // Force a reflow so the browser registers the
        // height above before we change it again.
        void panel.offsetHeight;

        requestAnimationFrame(() => {
            panel.style.maxHeight = "0px";
        });

        panel.classList.remove("is-open");

    }

    button.setAttribute("aria-expanded", "false");

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

            toggleFaqAnswer(button);

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