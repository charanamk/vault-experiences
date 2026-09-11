"use strict";

/* ==================================================
   VAULT AI
   Opens a chat interface. No AI model — every answer
   is built by matching keywords in the question
   against real Vault data (events, a user's own
   reservations, and the existing FAQ content).

   ------------------------------------------------
   DEPENDENCIES — this file is NOT fully standalone.
   It expects the following to already exist, as they
   do in help.js:

     - helpModuleContent   (DOM element, the panel
                            this content is rendered into)
     - helpModuleTitle     (DOM element, used by
                            setModuleTitle())
     - setModuleTitle(title)   (function)
     - FAQ_CONTENT             (object, used as the
                                fallback answer source)

   Load this file AFTER help.js, or merge it in where
   the old showVaultAI() placeholder used to be.
   ------------------------------------------------
================================================== */


/* ==================================================
   BACKEND
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


/* ==================================================
   ENTRY POINT
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
   MESSAGE RENDERING
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
   DATA FETCHING
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
   TEXT HELPERS
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
   INTENT + ANSWERS
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