"use strict";

(function () {


/*==================================
DOM
==================================*/

const bookingSheet =
    document.getElementById("bookingSheet");

const bookingClose =
    document.getElementById("bookingClose");

const bookingContinue =
    document.getElementById("bookingContinue");


/*==================================
RESERVATION FIELDS
==================================*/

const reservationName =
    document.getElementById("reservationName");

const reservationEmail =
    document.getElementById("reservationEmail");

const reservationPhone =
    document.getElementById("reservationPhone");

const reservationPhoneWrap =
    document.getElementById("reservationPhoneWrap");

const reservationGuests =
    document.getElementById("reservationGuests");


/*==================================
BOOKING EVENT FIELDS
==================================*/

const bookingImage =
    document.getElementById("bookingImage");

const bookingTheme =
    document.getElementById("bookingTheme");

const bookingTitle =
    document.getElementById("bookingTitle");

const bookingShortDescription =
    document.getElementById(
        "bookingShortDescription"
    );

const bookingDescription =
    document.getElementById("bookingDescription");

const bookingDate =
    document.getElementById("bookingDate");

const bookingVenue =
    document.getElementById("bookingVenue");

const bookingTime =
    document.getElementById("bookingTime");

const bookingLocationNote =
    document.getElementById(
        "bookingLocationNote"
    );


/*==================================
EXPERIENCE SETTINGS FIELDS
==================================*/

const bookingCapacityWrap =
    document.getElementById(
        "bookingCapacityWrap"
    );

const bookingCapacity =
    document.getElementById(
        "bookingCapacity"
    );

const bookingAgeWrap =
    document.getElementById(
        "bookingAgeWrap"
    );

const bookingAge =
    document.getElementById(
        "bookingAge"
    );

const bookingDressCodeWrap =
    document.getElementById(
        "bookingDressCodeWrap"
    );

const bookingDressCode =
    document.getElementById(
        "bookingDressCode"
    );

const bookingDeadlineWrap =
    document.getElementById(
        "bookingDeadlineWrap"
    );

const bookingDeadline =
    document.getElementById(
        "bookingDeadline"
    );


/*==================================
TICKETING FIELDS
==================================*/

const bookingTicketList =
    document.getElementById(
        "bookingTicketList"
    );

const bookingTicketSection =
    document.getElementById(
        "bookingTicketSection"
    );


/*==================================
FEATURED
==================================*/

const bookingFeatured =
    document.getElementById(
        "bookingFeatured"
    );


/*==================================
STATE
==================================*/

let selectedEvent = null;
let selectedTicket = null;
let previousFocus = null;
let activePaymentPoller = null;
let activePaymentReservationId = null;
const PENDING_PAYMENT_RESERVATION_KEY = "vault:pending-payment-reservation";

function persistPendingPaymentReservationId(reservationId) {
    if (!reservationId) {
        sessionStorage.removeItem(PENDING_PAYMENT_RESERVATION_KEY);
        return;
    }

    sessionStorage.setItem(PENDING_PAYMENT_RESERVATION_KEY, String(reservationId));
}

function getPersistedPendingPaymentReservationId() {
    try {
        return sessionStorage.getItem(PENDING_PAYMENT_RESERVATION_KEY) || null;
    } catch (error) {
        return null;
    }
}

function restorePendingPaymentReservationState() {
    const reservationId = getPersistedPendingPaymentReservationId();
    if (!reservationId) {
        return;
    }

    if (bookingContinue) {
        bookingContinue.disabled = true;
        bookingContinue.textContent = "Refreshing payment…";
    }

    pollPaymentStatus(Number(reservationId));
}


/*==================================
DATE
==================================*/

function formatDate(value) {

    if (!value) {
        return "";
    }

    const date =
        new Date(`${value}T12:00:00`);

    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return new Intl.DateTimeFormat(
        "en-KE",
        {
            weekday: "long",
            month: "long",
            day: "numeric",
            year: "numeric"
        }
    ).format(date);
}


/*==================================
TIME
==================================*/

function formatTime(value) {

    if (!value) {
        return "";
    }

    /*
     * PostgreSQL TIME may arrive as:
     *
     * 20:00:00
     * 20:00
     *
     * Keep it simple and format locally.
     */

    const match =
        String(value).match(
            /^(\d{1,2}):(\d{2})/
        );

    if (!match) {
        return String(value);
    }

    const hours =
        Number(match[1]);

    const minutes =
        match[2];

    const suffix =
        hours >= 12 ? "PM" : "AM";

    const displayHour =
        hours % 12 || 12;

    return `${displayHour}:${minutes} ${suffix}`;
}


/*==================================
DATETIME
==================================*/

function formatDateTime(value) {

    if (!value) {
        return "";
    }

    const date =
        new Date(value);

    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return new Intl.DateTimeFormat(
        "en-KE",
        {
            weekday: "long",
            month: "long",
            day: "numeric",
            year: "numeric",
            hour: "numeric",
            minute: "2-digit"
        }
    ).format(date);
}


/*==================================
MONEY
==================================*/

function formatMoney(value) {

    const amount =
        Number(value);

    if (
        !Number.isFinite(amount) ||
        amount <= 0
    ) {
        return "FREE";
    }

    return `KSh ${amount.toLocaleString("en-KE")}`;
}


/*==================================
HTML ESCAPE
==================================*/

function escapeHtml(value) {

    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


/*==================================
GET TICKETS
==================================*/

function getEventTickets(event) {

    if (!event) {
        return [];
    }

    return (
        event.tickets ||
        event.ticketTypes ||
        event.ticket_types ||
        []
    );
}


/*==================================
NORMALIZE EVENT
==================================*/

function normalizeEvent(event) {

    if (!event) {
        return null;
    }

    return {

        id:
            event.id ??
            event.eventId ??
            event.event_id ??
            null,

        image:
            event.image ??
            event.coverImage ??
            event.cover_image ??
            "",

        title:
            event.title ??
            "Untitled Experience",

        theme:
            event.theme ??
            "",

        shortDescription:
            event.shortDescription ??
            event.short_description ??
            "",

        description:
            event.description ??
            event.about ??
            "",

        date:
            event.date ??
            event.eventDate ??
            event.event_date ??
            "",

        time:
            event.time ??
            event.eventTime ??
            event.event_time ??
            "",

        location:
            event.location ??
            event.venue ??
            "",

        locationNote:
            event.locationNote ??
            event.location_note ??
            "",

        capacity:
            event.capacity ??
            event.guestCapacity ??
            event.guest_capacity ??
            "",

        age:
            event.age ??
            event.ageRestriction ??
            event.age_restriction ??
            "",

        dressCode:
            event.dressCode ??
            event.dress_code ??
            "",

        bookingDeadline:
            event.bookingDeadline ??
            event.booking_deadline ??
            "",

        status:
            event.status ??
            "draft",

        featured:
            Boolean(
                event.featured ??
                event.isFeatured ??
                event.is_featured ??
                false
            ),

        tickets:
            getEventTickets(event)

    };
}


/*==================================
CLEAR EXPERIENCE SETTINGS
==================================*/

function clearExperienceSettings() {

    if (bookingCapacity) {
        bookingCapacity.textContent = "";
    }

    if (bookingAge) {
        bookingAge.textContent = "";
    }

    if (bookingDressCode) {
        bookingDressCode.textContent = "";
    }

    if (bookingDeadline) {
        bookingDeadline.textContent = "";
    }

    if (bookingCapacityWrap) {
        bookingCapacityWrap.hidden = true;
    }

    if (bookingAgeWrap) {
        bookingAgeWrap.hidden = true;
    }

    if (bookingDressCodeWrap) {
        bookingDressCodeWrap.hidden = true;
    }

    if (bookingDeadlineWrap) {
        bookingDeadlineWrap.hidden = true;
    }
}


/*==================================
RENDER EXPERIENCE SETTINGS
==================================*/

function renderExperienceSettings(event) {

    clearExperienceSettings();

    if (!event) {
        return;
    }


    /*==================================
    CAPACITY
    ==================================*/

    if (
        event.capacity !== "" &&
        event.capacity !== null &&
        event.capacity !== undefined
    ) {

        if (bookingCapacity) {

            bookingCapacity.textContent =
                String(event.capacity);

        }

        if (bookingCapacityWrap) {
            bookingCapacityWrap.hidden = false;
        }
    }


    /*==================================
    AGE
    ==================================*/

    if (event.age) {

        let ageLabel =
            String(event.age);

        if (
            ageLabel.toLowerCase() ===
            "all"
        ) {

            ageLabel = "All ages";

        } else if (
            /^\d+$/.test(ageLabel)
        ) {

            ageLabel =
                `${ageLabel}+`;

        }

        if (bookingAge) {
            bookingAge.textContent =
                ageLabel;
        }

        if (bookingAgeWrap) {
            bookingAgeWrap.hidden = false;
        }
    }


    /*==================================
    DRESS CODE
    ==================================*/

    if (event.dressCode) {

        if (bookingDressCode) {

            bookingDressCode.textContent =
                event.dressCode;

        }

        if (bookingDressCodeWrap) {
            bookingDressCodeWrap.hidden = false;
        }
    }


    /*==================================
    BOOKING DEADLINE
    ==================================*/

    if (event.bookingDeadline) {

        if (bookingDeadline) {

            bookingDeadline.textContent =
                formatDateTime(
                    event.bookingDeadline
                );

        }

        if (bookingDeadlineWrap) {
            bookingDeadlineWrap.hidden = false;
        }
    }
}


/*==================================
RENDER EXPERIENCE DETAILS
==================================*/

function renderExperienceDetails(event) {

    if (!event) {
        return;
    }


    /*==================================
    SHORT DESCRIPTION
    ==================================*/

    if (bookingShortDescription) {

        bookingShortDescription.textContent =
            event.shortDescription || "";

        bookingShortDescription.hidden =
            !event.shortDescription;
    }


    /*==================================
    LOCATION NOTE
    ==================================*/

    if (bookingLocationNote) {

        bookingLocationNote.textContent =
            event.locationNote || "";

        bookingLocationNote.hidden =
            !event.locationNote;
    }


    /*==================================
    GOOD TO KNOW
    ==================================*/

    renderExperienceSettings(event);
}


/*==================================
RENDER TICKETS
==================================*/

function isFreeEvent(event) {

    const tickets =
        getEventTickets(event);

    if (
        !Array.isArray(tickets) ||
        !tickets.length
    ) {
        return false;
    }

    const hasExplicitPricing =
        tickets.every(
            (ticket) =>
                ticket &&
                (
                    Object.prototype.hasOwnProperty.call(
                        ticket,
                        "price"
                    ) ||
                    Object.prototype.hasOwnProperty.call(
                        ticket,
                        "amount"
                    )
                )
        );

    if (!hasExplicitPricing) {
        return false;
    }

    return tickets.every(
        (ticket) => {
            const price =
                Number(
                    ticket.price ??
                    ticket.amount ??
                    0
                );

            return Number.isFinite(price) &&
                price <= 0;
        }
    );
}


function renderTickets(tickets, event = null) {

    if (!bookingTicketList) {
        return;
    }

    bookingTicketList.innerHTML = "";

    selectedTicket = null;

    const isFree =
        isFreeEvent(event ?? { tickets });


    if (
        bookingTicketSection
    ) {
        bookingTicketSection.hidden = isFree;
    }


    /*
     * No tickets supplied by backend.
     *
     * We do NOT create another ticket
     * section here. The existing static
     * section remains untouched.
     */

    if (
        !Array.isArray(tickets) ||
        !tickets.length ||
        isFree
    ) {

        bookingTicketList.hidden = true;

        updateBookingFooter(0);

        return;
    }


    bookingTicketList.hidden = false;


    tickets.forEach(
        (ticket, index) => {

            const ticketName =
                ticket.name ??
                ticket.title ??
                `Ticket ${index + 1}`;

            const ticketPrice =
                Number(
                    ticket.price ??
                    ticket.amount ??
                    0
                );

            const ticketQuantity =
                Number(
                    ticket.quantity ??
                    ticket.available ??
                    ticket.capacity ??
                    0
                );

            const ticketDescription =
                ticket.description ??
                "";


            const ticketCard =
                document.createElement(
                    "button"
                );

            ticketCard.type =
                "button";

            ticketCard.className =
                "booking-ticket-card";

            ticketCard.dataset.ticketIndex =
                String(index);


            ticketCard.innerHTML = `

                <div
                    class="booking-ticket-card-top"
                >

                    <div>

                        <span
                            class="booking-ticket-label"
                        >
                            TICKET
                            ${String(
                                index + 1
                            ).padStart(2, "0")}
                        </span>

                        <h4>
                            ${escapeHtml(
                                ticketName
                            )}
                        </h4>

                    </div>

                    <strong>
                        ${escapeHtml(
                            formatMoney(
                                ticketPrice
                            )
                        )}
                    </strong>

                </div>


                ${
                    ticketDescription
                        ? `
                            <p>
                                ${escapeHtml(
                                    ticketDescription
                                )}
                            </p>
                        `
                        : ""
                }


                <span
                    class="booking-ticket-availability"
                >

                    ${
                        ticketQuantity > 0
                            ? `${ticketQuantity} available`
                            : "Availability not specified"
                    }

                </span>

            `;


            ticketCard.addEventListener(
                "click",
                () => {

                    bookingTicketList
                        .querySelectorAll(
                            ".booking-ticket-card"
                        )
                        .forEach(
                            (card) => {

                                card.classList.remove(
                                    "selected"
                                );

                            }
                        );


                    ticketCard.classList.add(
                        "selected"
                    );


                    selectedTicket =
                        ticket;

                    updateReservationPhoneState();
                    updateBookingFooter(
                        ticketPrice
                    );

                }
            );


            bookingTicketList.appendChild(
                ticketCard
            );

        }
    );


    /*
     * Automatically select the first
     * ticket when only one exists.
     */

    if (tickets.length === 1) {

        const firstCard =
            bookingTicketList.querySelector(
                ".booking-ticket-card"
            );

        if (firstCard) {
            firstCard.click();
        }
    }
}


/*==================================
FEATURED
==================================*/

function renderFeatured(event) {

    if (!bookingFeatured) {
        return;
    }

    if (event?.featured) {

        bookingFeatured.hidden = false;

        bookingFeatured.setAttribute(
            "aria-hidden",
            "false"
        );

    } else {

        bookingFeatured.hidden = true;

        bookingFeatured.setAttribute(
            "aria-hidden",
            "true"
        );
    }
}


/*==================================
UPDATE FOOTER
==================================*/

function updateBookingFooter(price) {

    const status =
        bookingSheet?.querySelector(
            ".booking-status"
        );

    if (!status) {
        return;
    }

    status.innerHTML = `

        <span>
            Entry
        </span>

        <strong>
            ${escapeHtml(
                formatMoney(price)
            )}
        </strong>

    `;
}


/*==================================
RESET BOOKING UI
==================================*/

function resetBookingUI() {

    if (bookingImage) {
        bookingImage.src = "";
        bookingImage.alt = "";
    }

    if (bookingTheme) {
        bookingTheme.textContent = "";
    }

    if (bookingTitle) {
        bookingTitle.textContent = "";
    }

    if (bookingShortDescription) {
        bookingShortDescription.textContent = "";
        bookingShortDescription.hidden = true;
    }

    if (bookingDescription) {
        bookingDescription.textContent = "";
    }

    if (bookingDate) {
        bookingDate.textContent = "";
    }

    if (bookingVenue) {
        bookingVenue.textContent = "";
    }

    if (bookingTime) {
        bookingTime.textContent = "";
    }

    if (bookingLocationNote) {
        bookingLocationNote.textContent = "";
        bookingLocationNote.hidden = true;
    }

    clearExperienceSettings();

    if (bookingTicketList) {
        bookingTicketList.innerHTML = "";
        bookingTicketList.hidden = true;
    }

    if (bookingTicketSection) {
        bookingTicketSection.hidden = true;
    }

    if (reservationPhoneWrap) {
        reservationPhoneWrap.hidden = true;
    }

    if (reservationPhone) {
        reservationPhone.value = "";
        reservationPhone.required = false;
        reservationPhone.disabled = true;
    }

    if (bookingFeatured) {
        bookingFeatured.hidden = true;

        bookingFeatured.setAttribute(
            "aria-hidden",
            "true"
        );
    }

    updateBookingFooter(0);
}


/*==================================
OPEN BOOKING
==================================*/

function openBooking(event) {

    if (
        !bookingSheet ||
        !event
    ) {
        return;
    }


    selectedEvent =
        normalizeEvent(event);

    selectedTicket = null;

    previousFocus =
        document.activeElement;


    /*==================================
    RESET
    ==================================*/

    resetBookingUI();


    /*==================================
    HERO
    ==================================*/

    if (bookingImage) {

        bookingImage.src =
            selectedEvent.image || "";

        bookingImage.alt =
            selectedEvent.title || "";

    }


    /*==================================
    THEME
    ==================================*/

    if (bookingTheme) {

        bookingTheme.textContent =
            selectedEvent.theme || "";

    }


    /*==================================
    TITLE
    ==================================*/

    if (bookingTitle) {

        bookingTitle.textContent =
            selectedEvent.title || "";

    }


    /*==================================
    SHORT DESCRIPTION
    ==================================*/

    if (bookingShortDescription) {

        bookingShortDescription.textContent =
            selectedEvent.shortDescription || "";

        bookingShortDescription.hidden =
            !selectedEvent.shortDescription;

    }


    /*==================================
    DESCRIPTION
    ==================================*/

    if (bookingDescription) {

        bookingDescription.textContent =
            selectedEvent.description ||
            selectedEvent.shortDescription ||
            "";

    }


    /*==================================
    DATE
    ==================================*/

    if (bookingDate) {

        bookingDate.textContent =
            formatDate(
                selectedEvent.date
            );

    }


    /*==================================
    VENUE
    ==================================*/

    if (bookingVenue) {

        bookingVenue.textContent =
            selectedEvent.location || "";

    }


    /*==================================
    TIME
    ==================================*/

    if (bookingTime) {

        bookingTime.textContent =
            formatTime(
                selectedEvent.time
            );

    }


    /*==================================
    LOCATION NOTE
    ==================================*/

    if (bookingLocationNote) {

        bookingLocationNote.textContent =
            selectedEvent.locationNote || "";

        bookingLocationNote.hidden =
            !selectedEvent.locationNote;

    }


    /*==================================
    EXPERIENCE DETAILS
    ==================================*/

    renderExperienceSettings(
        selectedEvent
    );


    /*==================================
    TICKETS
    ==================================*/

    renderTickets(
        selectedEvent.tickets,
        selectedEvent
    );
    updateReservationPhoneState();

    /*==================================
    FEATURED
    ==================================*/

    renderFeatured(
        selectedEvent
    );


    /*==================================
    DEFAULT FOOTER
    ==================================*/

    const tickets =
        selectedEvent.tickets;

    if (
        !Array.isArray(tickets) ||
        !tickets.length
    ) {

        updateBookingFooter(0);

    }


    /*==================================
    OPEN
    ==================================*/

    document.body.classList.add(
        "booking-open"
    );

    bookingSheet.classList.add(
        "is-open"
    );

    bookingSheet.setAttribute(
        "aria-hidden",
        "false"
    );


    /*==================================
    FOCUS
    ==================================*/

    reservationName?.focus();
}


/*==================================
CLOSE BOOKING
==================================*/

function closeBooking() {

    document.body.classList.remove(
        "booking-open"
    );

    bookingSheet?.classList.remove(
        "is-open"
    );

    bookingSheet?.setAttribute(
        "aria-hidden",
        "true"
    );


    selectedEvent = null;
    selectedTicket = null;


    previousFocus?.focus?.();

    previousFocus = null;
}


/*==================================
VALIDATION
==================================*/

function isPaidTicketSelection(event = selectedEvent) {
    if (!event) {
        return false;
    }

    const tickets = getEventTickets(event);
    if (!Array.isArray(tickets) || !tickets.length) {
        return false;
    }

    const hasExplicitPricing =
        tickets.every(
            (ticket) =>
                ticket &&
                (
                    Object.prototype.hasOwnProperty.call(
                        ticket,
                        "price"
                    ) ||
                    Object.prototype.hasOwnProperty.call(
                        ticket,
                        "amount"
                    )
                )
        );

    if (!hasExplicitPricing) {
        return false;
    }

    if (selectedTicket) {
        const price = Number(selectedTicket.price ?? selectedTicket.amount ?? 0);
        return Number.isFinite(price) && price > 0;
    }

    return tickets.some((ticket) => {
        const price = Number(ticket.price ?? ticket.amount ?? 0);
        return Number.isFinite(price) && price > 0;
    });
}

function updateReservationPhoneState() {
    const requiresPayment = isPaidTicketSelection();

    if (reservationPhoneWrap) {
        reservationPhoneWrap.hidden = !requiresPayment;
    }

    if (reservationPhone) {
        reservationPhone.required = requiresPayment;
        reservationPhone.disabled = !requiresPayment;
        if (!requiresPayment) {
            reservationPhone.value = "";
        }
    }

    if (bookingContinue) {
        bookingContinue.textContent = requiresPayment ? "Continue to Payment" : "Reserve Now";
    }
}

function isValid() {

    const fields = [
        reservationName,
        reservationEmail,
        reservationGuests
    ];

    if (isPaidTicketSelection()) {
        fields.push(reservationPhone);
    }

    for (const field of fields) {

        if (
            !field ||
            !field.checkValidity()
        ) {

            field?.reportValidity();

            return false;
        }
    }


    return true;
}


/*==================================
API URL
==================================*/

function getApiUrl(pathname) {

    const base =
        window.VAULT_API_BASE_URL ||
        (
            window.location.hostname ===
                "localhost" ||
            window.location.hostname ===
                "127.0.0.1"

                ? (
                    window.location.port ===
                    "3000"

                        ? ""

                        : "http://localhost:3000"
                )

                : ""
        );


    return `${base}${pathname}`;
}


/*==================================
RESERVATION REQUEST
==================================*/

async function saveReservation(payload) {

    const response =
        await fetch(

            window.VAULT_RESERVATIONS_URL ||
            getApiUrl(
                "/api/reservations"
            ),

            {
                method: "POST",
                
                credentials: "include",

                headers: {
                    "Content-Type":
                        "application/json"
                },

                body:
                    JSON.stringify(
                        payload
                    )
            }
        );


    let data = null;


    try {

        data =
            await response.json();

    } catch {

        data = null;

    }


    if (!response.ok) {

        const error =
            new Error(

                data?.message ||
                "Reservation request failed."

            );


        error.status =
            response.status;

        error.code =
            data?.code || null;

        error.data =
            data;


        throw error;
    }


    return data;
}


function normalizeTicketPayloadFromReservation(reservation) {
    if (!reservation) {
        return null;
    }

    const event = {
        id: reservation.event_id || reservation.event?.id || null,
        title: reservation.title || reservation.event?.title || "",
        theme: reservation.theme || reservation.event?.theme || "",
        description: reservation.description || reservation.event?.description || "",
        image: reservation.image || reservation.event?.image || "",
        date: reservation.event_date || reservation.event?.date || reservation.date || "",
        time: reservation.event_time || reservation.event?.time || reservation.time || "",
        location: reservation.location || reservation.event?.location || reservation.venue || ""
    };

    const ticketName = reservation.ticket_name || reservation.ticket_category_name || "ADMISSION";
    const ticketReference = reservation.ticket_reference || reservation.reference;

    const ticketPayload = {
        id: reservation.id,
        reference: reservation.reference,
        guests: Number(reservation.guests || 1),
        attendee: {
            name: reservation.attendee_name || "",
            email: reservation.attendee_email || ""
        },
        event,
        date: event.date,
        ticket: {
            id: reservation.ticket_id || null,
            name: ticketName,
            status: reservation.ticket_status || "valid",
            reference: ticketReference,
            qr_code: reservation.qr_code || ""
        },
        ticketCategory: {
            name: ticketName
        },
        ticketName,
        ticketReference,
        qr_code: reservation.qr_code || ""
    };

    return ticketPayload;
}

async function fetchPaidReservationTicket(reservationId) {
    if (!reservationId) {
        return null;
    }

    try {
        const response = await fetch(getApiUrl("/api/reservations/mine"), {
            method: "GET",
            headers: {
                "Accept": "application/json",
                "Content-Type": "application/json"
            },
            credentials: "include"
        });

        if (!response.ok) {
            return null;
        }

        const data = await response.json();
        const reservations = Array.isArray(data?.reservations) ? data.reservations : [];
        const reservation = reservations.find((item) => Number(item.id) === Number(reservationId));

        if (!reservation) {
            return null;
        }

        const hasTicket = Boolean(
            reservation.ticket_id ||
            reservation.ticket_reference ||
            reservation.qr_code ||
            reservation.ticket_name ||
            reservation.ticket_category_name
        );

        if (!hasTicket) {
            return null;
        }

        return normalizeTicketPayloadFromReservation(reservation);
    } catch (error) {
        console.warn("VAULT PAID TICKET FETCH:", error);
        return null;
    }
}

async function waitForPaidReservationTicket(reservationId, attempts = 8, delayMs = 2000) {
    for (let attempt = 0; attempt < attempts; attempt += 1) {
        const ticket = await fetchPaidReservationTicket(reservationId);
        if (ticket) {
            return ticket;
        }

        if (attempt < attempts - 1) {
            await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
    }

    return null;
}

async function pollPaymentStatus(reservationId) {
    if (!reservationId) {
        return;
    }

    if (activePaymentPoller) {
        clearInterval(activePaymentPoller);
    }

    activePaymentReservationId = reservationId;
    persistPendingPaymentReservationId(reservationId);

    const poll = async () => {
        try {
            const response = await fetch(getApiUrl(`/api/payments/reservation/${reservationId}`), {
                method: "GET",
                headers: { "Content-Type": "application/json" }
            });

            if (!response.ok) {
                return;
            }

            const data = await response.json();
            const payment = data?.payment;
            const status = String(payment?.status || "pending").toLowerCase();

            const statusNode = bookingSheet?.querySelector(".booking-status");
            if (statusNode) {
                const label = status === "paid" ? "Payment confirmed" : status === "failed" ? "Payment failed" : status === "cancelled" ? "Payment cancelled" : status === "expired" ? "Payment expired" : "Payment initiated";
                statusNode.innerHTML = `
                    <span>${label}</span>
                    <strong>${escapeHtml(payment?.amount ? `KSh ${Number(payment.amount).toLocaleString("en-KE")}` : "M-Pesa")}</strong>
                `;
            }

            if (status === "paid") {
                clearInterval(activePaymentPoller);
                activePaymentPoller = null;
                persistPendingPaymentReservationId(null);

                if (bookingContinue) {
                    bookingContinue.disabled = true;
                    bookingContinue.textContent = "Finalizing ticket…";
                }

                const completedTicket = await waitForPaidReservationTicket(reservationId);

                if (completedTicket) {
                    window.dispatchEvent(new CustomEvent("vault:reservation-created", { detail: completedTicket }));
                    return;
                }

                if (bookingContinue) {
                    bookingContinue.disabled = false;
                    bookingContinue.textContent = "Payment confirmed";
                }
                return;
            }

            if (["failed", "cancelled", "expired"].includes(status)) {
                clearInterval(activePaymentPoller);
                activePaymentPoller = null;
                persistPendingPaymentReservationId(null);
                if (bookingContinue) {
                    bookingContinue.disabled = false;
                    bookingContinue.textContent = "Retry Payment";
                }
                return;
            }
        } catch (error) {
            console.warn("VAULT PAYMENT POLL:", error);
        }
    };

    activePaymentPoller = setInterval(poll, 4000);
    await poll();
}

async function initiatePaymentForReservation(reservation) {
    if (!reservation?.id || !reservation.paymentRequired) {
        return null;
    }

    const phoneNumber = (reservationPhone?.value || "").trim();
    const response = await fetch(getApiUrl("/api/payments/initiate"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            reservationId: reservation.id,
            providerName: "mpesa",
            phoneNumber
        })
    });

    let data = null;
    try {
        data = await response.json();
    } catch (error) {
        data = null;
    }

    if (!response.ok) {
        const message = data?.message || "Payment initiation failed.";
        throw new Error(message);
    }

    const payment = data?.payment || null;
    if (payment) {
        const statusNode = bookingSheet?.querySelector(".booking-status");
        if (statusNode) {
            statusNode.innerHTML = `
                <span>Payment initiated</span>
                <strong>${escapeHtml(payment.amount ? `KSh ${Number(payment.amount).toLocaleString("en-KE")}` : "M-Pesa")}</strong>
            `;
        }
        persistPendingPaymentReservationId(reservation.id);
        if (bookingContinue) {
            bookingContinue.disabled = true;
            bookingContinue.textContent = "Waiting for confirmation…";
        }
        await pollPaymentStatus(reservation.id);
    }

    return payment;
}

async function reserve() {

    if (
        !selectedEvent ||
        !isValid()
    ) {
        return;
    }


    const tickets =
        selectedEvent.tickets;

    const allowFreeReservation =
        isFreeEvent(selectedEvent);


    if (
        Array.isArray(tickets) &&
        tickets.length &&
        !allowFreeReservation &&
        !selectedTicket
    ) {

        alert(
            "Please choose a ticket."
        );

        return;
    }


    const originalButtonText =
        bookingContinue.textContent;


    bookingContinue.disabled =
        true;

    bookingContinue.textContent =
        allowFreeReservation ? "Reserving…" : "Preparing payment…";


    try {

        const payload = {

            eventId:
                selectedEvent.id,

            attendee: {

                name:
                    reservationName.value
                        .trim(),

                email:
                    reservationEmail.value
                        .trim()

            },

            guests:
                Number(
                    reservationGuests.value
                )

        };

        if (selectedTicket) {

            payload.ticketId =
                selectedTicket.id ??
                selectedTicket.ticketId ??
                selectedTicket.ticket_id ??
                null;

            payload.ticketCategory =
                selectedTicket.name ??
                selectedTicket.title ??
                null;
        }

        if (allowFreeReservation) {
            payload.ticketCategory = "Free Entry";
            payload.ticketId = null;
        }
        
console.log("VAULT PAYMENT DEBUG", {
    selectedTicket,
    ticketId: payload.ticketId,
    ticketCategory: payload.ticketCategory
});

        const reservation =
            await saveReservation(
                payload
            );

        const reservationEvent =
            reservation.event ||
            selectedEvent;

        const paymentRequired = Boolean(reservation.paymentRequired || (!allowFreeReservation && Number(reservation?.payment?.amount || 0) > 0));

        if (paymentRequired) {
            const payment = await initiatePaymentForReservation({
                id: reservation.id,
                paymentRequired: true,
                payment: reservation.payment
            });

            if (payment) {
                if (bookingContinue) {
                    bookingContinue.disabled = false;
                    bookingContinue.textContent = "Payment initiated";
                }
            }
        } else {
            const ticket = {
                reference: reservation.reference,
                attendee: reservation.attendee || { name: reservationName.value.trim(), email: reservationEmail.value.trim() },
                name: reservation.attendee?.name || reservationName.value.trim(),
                guests: reservation.guests || Number(reservationGuests.value),
                event: reservationEvent,
                date: formatDate(reservationEvent.date),
                ticket: reservation.ticket,
                ticketCategory: reservation.ticketCategory || reservation.ticket_category || selectedTicket?.name || selectedTicket?.title || (allowFreeReservation ? "Free Entry" : null)
            };

            reservationName.value = "";
            reservationEmail.value = "";
            reservationGuests.value = "1";
            closeBooking();

            window.dispatchEvent(new CustomEvent("vault:reservation-created", { detail: ticket }));
        }

    } catch (error) {

        console.error(
            "VAULT RESERVATION:",
            error
        );

        if (
            error.code ===
                "SOLD_OUT" ||
            error.status === 409
        ) {

            alert(
                "This ticket category is sold out."
            );

            return;
        }

        if (
            error.code ===
            "NO_TICKET"
        ) {

            alert(
                "Tickets are not currently available for this experience."
            );

            return;
        }

        alert(

            error.message ||
            "We couldn't complete your reservation. Please try again."

        );

    } finally {

        if (!activePaymentReservationId && bookingContinue) {
            bookingContinue.disabled =
                false;

            bookingContinue.textContent =
                originalButtonText;
        }
    }
}


/*==================================
EVENT LISTENERS
==================================*/

bookingClose?.addEventListener(
    "click",
    closeBooking
);


bookingContinue?.addEventListener(
    "click",
    reserve
);


bookingSheet?.addEventListener(
    "click",
    (event) => {

        if (
            event.target ===
            bookingSheet
        ) {

            closeBooking();

        }

    }
);

restorePendingPaymentReservationState();


/*==================================
BOOK EVENT
==================================*/

window.addEventListener(
    "vault:book-event",
    async (event) => {

        try {

            if (
                !window.CustomerSession ||
                typeof
                window.CustomerSession.refresh !==
                "function"
            ) {

                window.location.replace(
                    "login.html"
                );

                return;
            }


            const session =
                await
                window.CustomerSession.refresh();


            if (
                !session ||
                !session.customerId ||
                session.isGuest
            ) {

                window.location.replace(
                    "login.html"
                );

                return;
            }


            openBooking(
                event.detail
            );


        } catch (error) {

            console.error(
                "VAULT BOOKING: Authentication check failed.",
                error
            );


            window.location.replace(
                "login.html"
            );

        }

    }
);


/*==================================
PUBLIC API
==================================*/

window.VaultBooking = {

    open:
        openBooking,

    close:
        closeBooking

};


})();