"use strict";

/*==================================================
VAULT — BOOKED EXPERIENCES
My Vault / Reservation History
==================================================*/

/*==================================================
DOM
==================================================*/

const bookedList =
    document.getElementById("bookedList");

const bookedEmpty =
    document.getElementById("bookedEmpty");

const bookedHomeBtn =
    document.getElementById("bookedHomeBtn");


/*==================================================
DATA
==================================================*/

let bookedExperiences = [];


/*==================================================
LOAD RESERVATIONS
==================================================*/

async function getBookedExperiences() {

    try {

        const response =
            await fetch(
                "/api/reservations/mine",
                {
                    method: "GET",
                    credentials: "include",
                    headers: {
                        "Accept":
                            "application/json"
                    }
                }
            );


        if (response.status === 401) {

            bookedExperiences = [];

            return [];

        }


        if (!response.ok) {

            throw new Error(
                `Failed to load reservations (${response.status})`
            );

        }


        const data =
            await response.json();


const reservations =
    Array.isArray(data.reservations)
        ? data.reservations.filter(
            reservation =>
                reservation.ticket_status === "valid" &&
                reservation.ticket_reference &&
                reservation.qr_code
          )
        : [];

        /*
         * Convert backend reservations into
         * the exact structure expected by
         * the VAULT ticket module.
         */
        bookedExperiences =
            reservations.map(
                reservation => {

                    return {

                        id:
                            reservation.id,

                        reference:
                            reservation.reference,

                        quantity:
                            Number(
                                reservation.guests
                            ) || 1,

                        customerId:
                            reservation.customer_id,


                        /*==================================
                        EVENT
                        ==================================*/

                        event: {

                            id:
                                reservation.event_id,

                            title:
                                reservation.title,

                            theme:
                                reservation.theme,

                            description:
                                reservation.description,

                            image:
                                reservation.image,

                            date:
                                reservation.event_date,

                            time:
                                reservation.event_time,

                            location:
                                reservation.location

                        },


                        /*==================================
                        TICKET
                        ==================================*/

                        ticket: {

                            id:
                                reservation.ticket_id,

                            name:
                                reservation.ticket_name ||
                                reservation.ticket_category_name ||
                                "ADMISSION",

                            status:
                                reservation.ticket_status,

                            reference: reservation.ticket_reference,

                            /*
                             * IMPORTANT:
                             *
                             * vault-ticket.js reads:
                             *
                             * ticket.ticket.qr_code
                             *
                             * so the QR must live inside
                             * the ticket object.
                             */
                            qr_code:
                                reservation.qr_code || ""

                        },


                        /*==================================
                        ATTENDEE
                        ==================================*/

                        attendee: {

                            name:
                                reservation.attendee_name,

                            email:
                                reservation.attendee_email

                        }

                    };

                }
            );


        return bookedExperiences;


    } catch (error) {

        console.error(
            "Unable to load Vault bookings.",
            error
        );

        bookedExperiences = [];

        return [];

    }

}


/*==================================================
RENDER
==================================================*/

async function renderBookedExperiences() {

    if (!bookedList) {

        return;

    }


    bookedList.innerHTML = "";


    const bookings =
        await getBookedExperiences();


    if (!bookings.length) {

        if (bookedEmpty) {

            bookedEmpty.hidden = false;

        }

        return;

    }


    if (bookedEmpty) {

        bookedEmpty.hidden = true;

    }


    bookings.forEach(
        booking => {

            const event =
                booking.event || {};


            const ticket =
                booking.ticket || {};


            const quantity =
                Number(
                    booking.quantity
                ) || 1;


            const card =
                document.createElement(
                    "article"
                );


            card.className =
                "booked-card";


            card.innerHTML = `

                <img
                    class="booked-card-image"
                    src="${event.image || ""}"
                    alt="${event.title || "Vault experience"}">


                <div
                    class="booked-card-overlay">
                </div>


                <div
                    class="booked-card-content">


                    <span class="booked-status">
                        BOOKED
                    </span>


                    <div>


                        <span
                            class="booked-event-theme">

                            ${event.theme || ""}

                        </span>


                        <h3
                            class="booked-event-title">

                            ${event.title || "Untitled Experience"}

                        </h3>


                        <div
                            class="booked-meta">


                            <div
                                class="booked-meta-item">

                                <img
                                    src="assets/icons/calendar.svg"
                                    alt="">

                                <span>
                                    ${event.date || "Date TBA"}
                                </span>

                            </div>


                            <div
                                class="booked-meta-item">

                                <img
                                    src="assets/icons/clock.svg"
                                    alt="">

                                <span>
                                    ${event.time || "Time TBA"}
                                </span>

                            </div>


                            <div
                                class="booked-meta-item">

                                <img
                                    src="assets/icons/location.svg"
                                    alt="">

                                <span>
                                    ${event.location || "Location TBA"}
                                </span>

                            </div>


                        </div>


                        <div
                            class="booked-card-bottom">


                            <div
                                class="booked-ticket-info">

                                <span>
                                    ADMISSION
                                </span>


                                <strong>

                                    ${ticket.name}

                                    ·

                                    ${quantity}

                                    ${
                                        quantity === 1
                                            ? "TICKET"
                                            : "TICKETS"
                                    }

                                </strong>

                            </div>


                            <button
                                type="button"
                                class="view-ticket-btn"
                                data-reservation-reference="${booking.reference}"
                                aria-label="View ticket ${booking.reference}">

                                View Ticket

                            </button>


                        </div>


                    </div>


                </div>

            `;


            bookedList.appendChild(
                card
            );

        }
    );

}


/*==================================================
VIEW TICKET
==================================================*/

if (bookedList) {

    bookedList.addEventListener(
        "click",
        event => {

            const button =
                event.target.closest(
                    ".view-ticket-btn"
                );


            if (!button) {

                return;

            }


            /*
             * Identify the exact reservation
             * that owns the tapped button.
             */
            const reference =
                button.dataset
                    .reservationReference;


            if (!reference) {

                console.error(
                    "VAULT: ticket reference missing."
                );

                return;

            }


            /*
             * Find the exact reservation from
             * the reservations already loaded.
             */
            const booking =
                bookedExperiences.find(
                    item =>
                        item.reference ===
                        reference
                );


            if (!booking) {

                console.error(
                    "VAULT: reservation not found.",
                    reference
                );

                return;

            }


            /*
             * Make sure the ticket module
             * has been loaded.
             */
            if (
                !window.VaultTicket ||
                typeof
                    window.VaultTicket.open !==
                    "function"
            ) {

                console.error(
                    "VAULT: VaultTicket module is not loaded."
                );

                return;

            }


            /*
             * Open the exact ticket.
             *
             * The complete booking object is
             * passed, including:
             *
             * event
             * attendee
             * ticket
             * ticket.qr_code
             * reference
             * quantity
             */
            window.VaultTicket.open(
                booking
            );

        }
    );

}


/*==================================================
EXPLORE EXPERIENCES
==================================================*/

if (bookedHomeBtn) {

    bookedHomeBtn.addEventListener(
        "click",
        () => {

            const homeTab =
                document.querySelector(
                    '[data-tab="home"]'
                );


            if (homeTab) {

                homeTab.click();

            }

        }
    );

}


/*==================================================
INITIALIZE
==================================================*/

renderBookedExperiences();


/*==================================================
PUBLIC API
==================================================*/

window.VaultBooked = {

    refresh:
        renderBookedExperiences

};