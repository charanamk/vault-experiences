"use strict";

/* ==================================================
   VAULT AI
   --------------------------------------------------
   A lightweight conversational assistant for VAULT.

   It does not use an external AI model yet.
   Instead, it combines:
   - conversational intent detection
   - event matching
   - reservation lookup
   - FAQ matching
   - contextual responses
   - VAULT personality

   Dependencies:
   - helpModuleContent
   - setModuleTitle()
   - FAQ_CONTENT
================================================== */


/* ==================================================
   BACKEND
================================================== */

const VAULT_API_BASE =
    window.VAULT_API_BASE_URL ||
    "https://vault-experiences.onrender.com";


const vaultAiState = {
    events: null,
    eventsLoadedAt: 0,

    reservations: null,
    reservationsLoadedAt: 0,

    reservationsAuthFailed: false,

    lastEvent: null,
    lastIntent: null
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
                    placeholder="Ask Vault AI anything..."
                    autocomplete="off"
                    aria-label="Ask Vault AI"
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


    /*
     * Prefetch public event data immediately.
     */
    vaultAiPrefetch();


    /*
     * Natural greeting.
     */
    (async () => {

        const greetingTyping =
            vaultAiAppendTyping();

        await vaultAiSleep(650);

        greetingTyping?.remove();

        vaultAiAppendMessage(
            "bot",
            `Hey, welcome to <strong>VAULT</strong>.<br><br>
             I'm Vault AI. I can help you find experiences,
             check prices and dates, look up your bookings,
             or answer questions about how VAULT works.<br><br>
             What's on your mind?`
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
            async (event) => {

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
                    vaultAiEscapeHTML(question)
                );


                try {

                    await vaultAiHandleQuestion(
                        question
                    );

                } finally {

                    if (vaultAiInput) {
                        vaultAiInput.disabled = false;
                        vaultAiInput.focus();
                    }

                    if (vaultAiSendBtn) {
                        vaultAiSendBtn.disabled = false;
                    }

                }

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
        document.getElementById(
            "vaultAiMessages"
        );

    if (!messages) return null;


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
        document.getElementById(
            "vaultAiMessages"
        );

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
================================================== */

async function vaultAiFetchEvents(force = false) {

    const cacheAgeMs =
        Date.now() -
        vaultAiState.eventsLoadedAt;


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
        Array.isArray(events)
            ? events
            : [];


    vaultAiState.eventsLoadedAt =
        Date.now();


    return vaultAiState.events;

}


async function vaultAiFetchMyReservations(
    force = false
) {

    if (
        !force &&
        vaultAiState.reservations &&
        Date.now() -
            vaultAiState.reservationsLoadedAt <
            60 * 1000
    ) {

        return vaultAiState.reservations;

    }


    const response =
        await fetch(
            `${VAULT_API_BASE}/api/reservations/mine`,
            {
                credentials: "include"
            }
        );


    if (response.status === 401) {

        vaultAiState.reservationsAuthFailed =
            true;

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


    vaultAiState.reservationsAuthFailed =
        false;


    return vaultAiState.reservations;

}


function vaultAiPrefetch() {

    vaultAiFetchEvents()
        .catch(() => {});

}


/* ==================================================
   TEXT HELPERS
================================================== */

function vaultAiNormalize(text) {

    return String(text || "")
        .toLowerCase()
        .replace(/[^\w\s+]/g, " ")
        .replace(/\s+/g, " ")
        .trim();

}


function vaultAiEscapeHTML(value) {

    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}


function vaultAiSleep(ms) {

    return new Promise(
        resolve => setTimeout(resolve, ms)
    );

}


function vaultAiTypingDelayFor(html) {

    const plainLength =
        String(html || "")
            .replace(/<[^>]+>/g, "")
            .length;


    return Math.min(
        1900,
        Math.max(
            500,
            300 + plainLength * 5
        )
    );

}


function vaultAiContainsAny(
    text,
    keywords
) {

    return keywords.some(
        word => text.includes(word)
    );

}


function vaultAiFormatDate(dateValue) {

    if (!dateValue) {
        return "TBA";
    }


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


/* ==================================================
   CONVERSATIONAL INTENTS
================================================== */

const VAULT_AI_KEYWORDS = {

    greeting: [
        "hi",
        "hello",
        "hey",
        "heyy",
        "heyyy",
        "yo",
        "sup",
        "hiya",
        "good morning",
        "good afternoon",
        "good evening"
    ],

    thanks: [
        "thanks",
        "thank you",
        "thank",
        "appreciate it",
        "appreciate that",
        "cheers"
    ],

    goodbye: [
        "bye",
        "goodbye",
        "see you",
        "later",
        "talk later",
        "gotta go"
    ],

    capabilities: [
        "what can you do",
        "what do you do",
        "how can you help",
        "help me",
        "what can you help with",
        "who are you",
        "what are you"
    ],

    booking: [
        "my booking",
        "my bookings",
        "my reservation",
        "my reservations",
        "my ticket",
        "my tickets",
        "did i book",
        "have i booked",
        "my order",
        "my purchase"
    ],

    price: [
        "price",
        "cost",
        "how much",
        "pricing",
        "fee",
        "fees",
        "ticket price",
        "tickets cost"
    ],

    date: [
        "when",
        "date",
        "what day",
        "what time",
        "time is",
        "when is",
        "when does"
    ],

    location: [
        "where",
        "venue",
        "location",
        "address",
        "where is",
        "where's"
    ],

    dressCode: [
        "dress code",
        "what to wear",
        "attire",
        "outfit",
        "wear"
    ],

    age: [
        "age",
        "18+",
        "21+",
        "age restriction",
        "how old",
        "minimum age"
    ],

    availability: [
        "sold out",
        "available",
        "tickets left",
        "any tickets",
        "spots left",
        "availability",
        "still available"
    ],

    listEvents: [
        "upcoming events",
        "what events",
        "what's on",
        "whats on",
        "show me events",
        "list events",
        "any events",
        "what experiences",
        "upcoming experiences",
        "what's happening",
        "whats happening"
    ],

    eventInfo: [
        "tell me about",
        "about the",
        "details about",
        "details for",
        "more about",
        "more info",
        "information about",
        "what is",
        "what's the"
    ]

};


/* ==================================================
   MAIN QUESTION HANDLER
================================================== */

async function vaultAiHandleQuestion(
    question
) {

    const typingBubble =
        vaultAiAppendTyping();


    try {

        const normalized =
            vaultAiNormalize(question);


        let reply = null;


        /*
         * Greetings.
         */
        if (
            vaultAiContainsAny(
                normalized,
                VAULT_AI_KEYWORDS.greeting
            )
        ) {

            reply =
                vaultAiGreetingReply(
                    normalized
                );

            vaultAiState.lastIntent =
                "greeting";

        }


        /*
         * Thanks.
         */
        else if (
            vaultAiContainsAny(
                normalized,
                VAULT_AI_KEYWORDS.thanks
            )
        ) {

            reply =
                vaultAiThanksReply();

            vaultAiState.lastIntent =
                "thanks";

        }


        /*
         * Goodbye.
         */
        else if (
            vaultAiContainsAny(
                normalized,
                VAULT_AI_KEYWORDS.goodbye
            )
        ) {

            reply =
                vaultAiGoodbyeReply();

            vaultAiState.lastIntent =
                "goodbye";

        }


        /*
         * Capabilities.
         */
        else if (
            vaultAiContainsAny(
                normalized,
                VAULT_AI_KEYWORDS.capabilities
            )
        ) {

            reply =
                vaultAiCapabilitiesReply();

            vaultAiState.lastIntent =
                "capabilities";

        }


        /*
         * User's own bookings.
         */
        else if (
            vaultAiContainsAny(
                normalized,
                VAULT_AI_KEYWORDS.booking
            )
        ) {

            reply =
                await vaultAiAnswerBooking();

            vaultAiState.lastIntent =
                "booking";

        }


        /*
         * Event list.
         */
        else if (
            vaultAiContainsAny(
                normalized,
                VAULT_AI_KEYWORDS.listEvents
            )
        ) {

            reply =
                await vaultAiAnswerEventList();

            vaultAiState.lastIntent =
                "list-events";

        }


        /*
         * Event-specific questions.
         */
        else {

            reply =
                await vaultAiAnswerEventQuestion(
                    normalized
                );


            /*
             * FAQ matching.
             */
            if (!reply) {

                reply =
                    vaultAiAnswerFromFaq(
                        normalized
                    );

            }


            /*
             * Conversational follow-up.
             */
            if (!reply) {

                reply =
                    vaultAiAnswerContextualQuestion(
                        normalized
                    );

            }


            if (reply) {

                vaultAiState.lastIntent =
                    "information";

            }

        }


        /*
         * Final fallback.
         */
        if (!reply) {

            reply =
                vaultAiFallbackReply(
                    question
                );

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
            `I hit a little snag reaching VAULT's servers.<br><br>
             Try that again in a moment. If it's urgent,
             you can also reach the VAULT team directly
             through the other support options.`
        );

    }

}


/* ==================================================
   PERSONALITY
================================================== */

function vaultAiGreetingReply(normalized) {

    if (
        normalized.includes("good morning")
    ) {

        return `
            Good morning.<br><br>
            What are we getting into today — finding an
            experience, checking a ticket, or something else?
        `;

    }


    if (
        normalized.includes("good afternoon")
    ) {

        return `
            Good afternoon.<br><br>
            I'm here. What can I help you find?
        `;

    }


    if (
        normalized.includes("good evening")
    ) {

        return `
            Good evening.<br><br>
            Perfect time to find something worth remembering.
            What are you looking for?
        `;

    }


    return `
        Hey 👋<br><br>
        Good to see you in VAULT. What can I help you
        with?
    `;

}


function vaultAiThanksReply() {

    const replies = [

        `
            Anytime. That's what I'm here for.
            <br><br>
            If you need anything else, just ask.
        `,

        `
            You're welcome.<br><br>
            Now go make some memories. That's kind of
            the whole point of VAULT.
        `,

        `
            Anytime.<br><br>
            What's next?
        `

    ];


    return replies[
        Math.floor(
            Math.random() *
            replies.length
        )
    ];

}


function vaultAiGoodbyeReply() {

    return `
        Catch you later.<br><br>
        <strong>For Moments Worth Keeping.</strong>
    `;

}


function vaultAiCapabilitiesReply() {

    return `
        Quite a few things, actually.<br><br>

        I can help you:
        <br><br>

        • Find upcoming experiences<br>
        • Check ticket prices<br>
        • Check dates and locations<br>
        • Check dress codes and age requirements<br>
        • See ticket availability<br>
        • Look up your bookings<br>
        • Explain VAULT's FAQs<br>
        • Give you more details about an experience
        <br><br>

        Try something like:
        <br><br>

        <em>
        "What's coming up?"<br>
        "How much is the picnic?"<br>
        "Where is the next event?"<br>
        "Show me my bookings."
        </em>
    `;

}


/* ==================================================
   BOOKINGS
================================================== */

async function vaultAiAnswerBooking() {

    const reservations =
        await vaultAiFetchMyReservations();


    if (
        vaultAiState.reservationsAuthFailed
    ) {

        return `
            I can check your bookings, but I need to
            know which VAULT account is yours first.<br><br>

            Please sign in, then ask me again.
        `;

    }


    if (
        !reservations ||
        reservations.length === 0
    ) {

        return `
            Your Vault is looking a little empty right now.<br><br>

            I couldn't find any bookings on your account.
            Once you reserve an experience, I'll be able
            to help you check it here.
        `;

    }


    const rows =
        reservations
            .slice(0, 5)
            .map(reservation => {

                const eventTitle =
                    vaultAiEscapeHTML(
                        reservation.title ||
                        "An experience"
                    );


                const eventDate =
                    vaultAiFormatDate(
                        reservation.event_date
                    );


                const status =
                    vaultAiEscapeHTML(
                        reservation.ticket_status ||
                        reservation.payment_status ||
                        "confirmed"
                    );


                const reference =
                    vaultAiEscapeHTML(
                        reservation.ticket_reference ||
                        reservation.reference ||
                        "TBA"
                    );


                const location =
                    vaultAiEscapeHTML(
                        reservation.location ||
                        "TBA"
                    );


                return `
                    <p>
                        <strong>${eventTitle}</strong><br>
                        ${eventDate} · ${location}<br>
                        Guests: ${
                            reservation.guests ?? "TBA"
                        } ·
                        Status: ${status}<br>
                        Ref: ${reference}
                    </p>
                `;

            })
            .join("");


    return `
        <p>
            Here's what I found in your Vault:
        </p>

        ${rows}

        ${
            reservations.length > 5
                ? `<p>
                    I found ${reservations.length} bookings
                    in total, but I'm showing the first five.
                   </p>`
                : ""
        }
    `;

}


/* ==================================================
   EVENT LIST
================================================== */

async function vaultAiAnswerEventList() {

    const events =
        await vaultAiFetchEvents();


    const upcoming =
        events.filter(
            event =>
                event.status === "upcoming"
        );


    const list =
        (upcoming.length
            ? upcoming
            : events
        )
        .slice(0, 6)
        .map(event => {

            const title =
                vaultAiEscapeHTML(
                    event.title ||
                    "Untitled experience"
                );


            const location =
                vaultAiEscapeHTML(
                    event.location ||
                    "TBA"
                );


            return `
                <p>
                    <strong>${title}</strong><br>
                    ${vaultAiFormatDate(event.date)}
                    · ${location}
                </p>
            `;

        })
        .join("");


    if (!list) {

        return `
            Nothing is on the calendar right now.<br><br>
            But that doesn't mean you should disappear —
            check back soon.
        `;

    }


    return `
        <p>
            Here's what's coming up:
        </p>

        ${list}

        <p>
            Ask me about any experience by name and
            I'll dig into the details.
        </p>
    `;

}


/* ==================================================
   EVENT MATCHING
================================================== */

function vaultAiFindEvent(
    events,
    question
) {

    const normalizedQuestion =
        vaultAiNormalize(question);


    const questionWords =
        normalizedQuestion
            .split(" ")
            .filter(
                word => word.length > 2
            );


    let bestMatch = null;
    let bestScore = 0;


    events.forEach(event => {

        const title =
            vaultAiNormalize(
                event.title
            );


        if (!title) return;


        /*
         * Exact title match.
         */
        if (
            normalizedQuestion.includes(
                title
            )
        ) {

            const score =
                title.length * 2;


            if (score > bestScore) {

                bestScore =
                    score;

                bestMatch =
                    event;

            }


            return;

        }


        /*
         * Partial title overlap.
         */
        const titleWords =
            title.split(" ");


        const overlap =
            titleWords.filter(
                word =>
                    word.length > 2 &&
                    questionWords.includes(
                        word
                    )
            ).length;


        if (
            overlap > 0 &&
            overlap > bestScore
        ) {

            bestScore =
                overlap;

            bestMatch =
                event;

        }

    });


    if (bestMatch) {

        vaultAiState.lastEvent =
            bestMatch;

    }


    return bestScore > 0
        ? bestMatch
        : null;

}


/* ==================================================
   EVENT QUESTIONS
================================================== */

async function vaultAiAnswerEventQuestion(
    normalized
) {

    const events =
        await vaultAiFetchEvents();


    const event =
        vaultAiFindEvent(
            events,
            normalized
        );


    if (!event) {
        return null;
    }


    const title =
        vaultAiEscapeHTML(
            event.title ||
            "This experience"
        );


    /*
     * Price.
     */
    if (
        vaultAiContainsAny(
            normalized,
            VAULT_AI_KEYWORDS.price
        )
    ) {

        if (
            !Array.isArray(
                event.tickets
            ) ||
            !event.tickets.length
        ) {

            return `
                I found <strong>${title}</strong>,
                but its ticket pricing hasn't been
                listed yet.
            `;

        }


        const tickets =
            event.tickets
                .map(ticket => {

                    const name =
                        vaultAiEscapeHTML(
                            ticket.name ||
                            "Ticket"
                        );


                    const soldOut =
                        ticket.available === false
                            ? " — sold out"
                            : "";


                    return `
                        <strong>${name}</strong>:
                        ${vaultAiFormatMoney(
                            ticket.price
                        )}${soldOut}
                    `;

                })
                .join("<br>");


        return `
            Here's the pricing for
            <strong>${title}</strong>:
            <br><br>
            ${tickets}
        `;

    }


    /*
     * Date / time.
     */
    if (
        vaultAiContainsAny(
            normalized,
            VAULT_AI_KEYWORDS.date
        )
    ) {

        return `
            <strong>${title}</strong> is happening on
            <strong>${vaultAiFormatDate(
                event.date
            )}</strong>
            ${
                event.time
                    ? ` at <strong>${vaultAiEscapeHTML(
                        event.time
                    )}</strong>`
                    : ""
            }.
        `;

    }


    /*
     * Location.
     */
    if (
        vaultAiContainsAny(
            normalized,
            VAULT_AI_KEYWORDS.location
        )
    ) {

        return `
            <strong>${title}</strong> is at
            <strong>${
                vaultAiEscapeHTML(
                    event.location ||
                    "a location yet to be announced"
                )
            }</strong>
            ${
                event.locationNote
                    ? `<br><br>${vaultAiEscapeHTML(
                        event.locationNote
                    )}`
                    : ""
            }
        `;

    }


    /*
     * Dress code.
     */
    if (
        vaultAiContainsAny(
            normalized,
            VAULT_AI_KEYWORDS.dressCode
        )
    ) {

        return `
            Dress code for
            <strong>${title}</strong>:
            <br><br>
            ${
                vaultAiEscapeHTML(
                    event.dressCode ||
                    "No dress code has been listed yet."
                )
            }
        `;

    }


    /*
     * Age.
     */
    if (
        vaultAiContainsAny(
            normalized,
            VAULT_AI_KEYWORDS.age
        )
    ) {

        return `
            Age requirement for
            <strong>${title}</strong>:
            <br><br>
            ${
                vaultAiEscapeHTML(
                    event.ageRestriction ||
                    "No age restriction has been listed."
                )
            }
        `;

    }


    /*
     * Availability.
     */
    if (
        vaultAiContainsAny(
            normalized,
            VAULT_AI_KEYWORDS.availability
        )
    ) {

        if (
            !Array.isArray(
                event.tickets
            ) ||
            !event.tickets.length
        ) {

            return `
                I found <strong>${title}</strong>,
                but ticket availability isn't listed yet.
            `;

        }


        const availability =
            event.tickets
                .map(ticket => {

                    const name =
                        vaultAiEscapeHTML(
                            ticket.name ||
                            "Ticket"
                        );


                    return `
                        ${name}:
                        ${
                            ticket.available === false
                                ? "Sold out"
                                : "Available"
                        }
                    `;

                })
                .join("<br>");


        return `
            Here's the current availability for
            <strong>${title}</strong>:
            <br><br>
            ${availability}
        `;

    }


    /*
     * General event information.
     */
    return `
        <strong>${title}</strong>
        <br><br>

        ${vaultAiFormatDate(event.date)}
        ${
            event.time
                ? ` · ${vaultAiEscapeHTML(
                    event.time
                )}`
                : ""
        }

        <br>

        ${
            vaultAiEscapeHTML(
                event.location ||
                "Location TBA"
            )
        }

        ${
            event.shortDescription ||
            event.description
                ? `<br><br>${vaultAiEscapeHTML(
                    event.shortDescription ||
                    event.description
                )}`
                : ""
        }

        <br><br>

        Want to know the price, location,
        dress code, availability or date?
        Just ask.
    `;

}


/* ==================================================
   FAQ MATCHING
================================================== */

function vaultAiAnswerFromFaq(
    normalized
) {

    const questionWords =
        normalized
            .split(" ")
            .filter(
                word => word.length > 2
            );


    let bestKey = null;
    let bestScore = 0;


    Object.keys(
        FAQ_CONTENT
    ).forEach(key => {

        const faq =
            FAQ_CONTENT[key];


        const titleWords =
            vaultAiNormalize(
                faq.title
            ).split(" ");


        const overlap =
            titleWords.filter(
                word =>
                    word.length > 2 &&
                    questionWords.includes(
                        word
                    )
            ).length;


        if (
            overlap > bestScore
        ) {

            bestScore =
                overlap;

            bestKey =
                key;

        }

    });


    if (
        !bestKey ||
        bestScore < 1
    ) {

        return null;

    }


    const faq =
        FAQ_CONTENT[bestKey];


    return `
        <p>
            <strong>${vaultAiEscapeHTML(
                faq.title
            )}</strong>
        </p>

        ${faq.content}
    `;

}


/* ==================================================
   CONTEXTUAL QUESTIONS
================================================== */

function vaultAiAnswerContextualQuestion(
    normalized
) {

    const event =
        vaultAiState.lastEvent;


    /*
     * Example:
     *
     * User: "Tell me about the picnic"
     * AI: gives picnic information
     *
     * User: "how much?"
     *
     * This remembers the picnic.
     */
    if (event) {

        const contextQuestion =
            vaultAiContainsAny(
                normalized,
                [
                    "how much",
                    "price",
                    "cost",
                    "where",
                    "when",
                    "what time",
                    "dress",
                    "wear",
                    "age",
                    "available",
                    "tickets"
                ]
            );


        if (contextQuestion) {

            return vaultAiAnswerEventQuestion(
                normalized
            );

        }

    }


    /*
     * Natural small talk.
     */
    if (
        vaultAiContainsAny(
            normalized,
            [
                "how are you",
                "how are you doing",
                "you good",
                "are you good"
            ]
        )
    ) {

        return `
            I'm good — fully charged and hanging around
            the Vault.<br><br>
            More importantly, what experience are we
            looking at?
        `;

    }


    /*
     * Compliments / personality.
     */
    if (
        vaultAiContainsAny(
            normalized,
            [
                "you're cool",
                "you are cool",
                "you're smart",
                "you are smart",
                "nice ai",
                "good bot"
            ]
        )
    ) {

        return `
            I'll take that.<br><br>
            Now let's put the intelligence to work —
            ask me about an experience.
        `;

    }


    return null;

}


/* ==================================================
   FALLBACK
================================================== */

function vaultAiFallbackReply() {

    return `
        Hmm... I don't quite have that one yet.<br><br>

        Try asking me something like:
        <br><br>

        <em>
        "What's coming up?"<br>
        "Tell me about the picnic."<br>
        "How much is it?"<br>
        "Where is it?"<br>
        "Are there tickets left?"<br>
        "Show me my bookings."
        </em>

        <br><br>

        Or just talk to me normally — I'll do my best
        to figure out what you mean.
    `;

}


/* ==================================================
   GLOBAL ACCESS
================================================== */

window.showVaultAI =
    showVaultAI;

window.vaultAiFetchEvents =
    vaultAiFetchEvents;

window.vaultAiState =
    vaultAiState;


console.log(
    "[VAULT] Vault AI ready."
);