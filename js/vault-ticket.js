"use strict";

(function (window, document) {

    /*==================================
      STATE
    ==================================*/

    let ticketModule = null;
    let closeButton = null;
    let doneButton = null;
    let saveButton = null;
    let ticketQr = null;

    let previousFocus = null;
    let currentTicket = null;


    /*==================================
      FIND TICKET MODULE
    ==================================*/

    function cacheTicketElements() {

        ticketModule =
            document.getElementById(
                "ticketModule"
            );

        closeButton =
            document.getElementById(
                "ticketHeaderClose"
            );

        doneButton =
            document.getElementById(
                "ticketDoneBtn"
            );

        saveButton =
            document.getElementById(
                "saveTicketBtn"
            );

        ticketQr =
            document.getElementById(
                "ticketQr"
            );

    }


    /*==================================
      HELPERS
    ==================================*/

    function findElement(...selectors) {

        return selectors
            .map(
                selector =>
                    document.querySelector(
                        selector
                    )
            )
            .find(Boolean);

    }


    function setText(selectors, value) {

        const element =
            findElement(...selectors);

        if (element) {

            element.textContent =
                value || "";

        }

    }


    function setImage(
        selectors,
        src,
        alt
    ) {

        const image =
            findElement(...selectors);

        if (image) {

            image.src =
                src || "";

            image.alt =
                alt || "";

        }

    }


    /*==================================
      LOAD EXISTING TICKET MODULE
    ==================================*/

    async function ensureTicketModule() {

        cacheTicketElements();

        if (ticketModule) {

            return true;

        }


        try {

            const response =
                await fetch(
                    "home.html",
                    {
                        headers: {
                            "X-Requested-With":
                                "VAULT-TICKET"
                        }
                    }
                );


            if (!response.ok) {

                throw new Error(
                    "Unable to load ticket module."
                );

            }


            const html =
                await response.text();


            const parser =
                new DOMParser();


            const page =
                parser.parseFromString(
                    html,
                    "text/html"
                );


            const module =
                page.getElementById(
                    "ticketModule"
                );


            if (!module) {

                throw new Error(
                    "Ticket module not found in home.html."
                );

            }


            document.body.appendChild(
                module.cloneNode(true)
            );


            cacheTicketElements();


            bindTicketEvents();


            return Boolean(
                ticketModule
            );


        } catch (error) {

            console.error(
                "VAULT TICKET MODULE:",
                error
            );

            return false;

        }

    }


    /*==================================
      REAL QR CODE
    ==================================*/

    function renderTicketCode(qrCode) {

        if (!ticketQr) {

            return;

        }


        ticketQr.replaceChildren();


        if (!qrCode) {

            const fallback =
                document.createElement(
                    "span"
                );


            fallback.textContent =
                "QR unavailable";


            ticketQr.appendChild(
                fallback
            );


            return;

        }


        const image =
            document.createElement(
                "img"
            );


        image.src =
            qrCode;


        image.alt =
            "VAULT ticket QR code";


        image.width =
            180;


        image.height =
            180;


        ticketQr.appendChild(
            image
        );

    }


    /*==================================
      OPEN TICKET
    ==================================*/

    async function openTicket(ticket) {

        if (!ticket) {

            return;

        }


        const ready =
            await ensureTicketModule();


        if (!ready) {

            return;

        }


        previousFocus =
            document.activeElement;


        const event =
            ticket.event || {};


        const attendee =
            ticket.attendee || {};


        currentTicket =
            ticket;


        setImage(
            [
                "#ticketEventImage",
                ".vault-ticket-image"
            ],
            event.image,
            event.title
        );


        setText(
            [
                "#ticketEventTitle",
                ".ticket-event-title"
            ],
            event.title
        );


        setText(
            [
                "#ticketEventTheme",
                ".ticket-event-theme"
            ],
            event.theme
        );


        setText(
            [
                "#ticketEventDate",
                ".ticket-date"
            ],
            ticket.date ||
            event.date
        );


        setText(
            [
                "#ticketEventLocation",
                ".ticket-venue"
            ],
            event.location
        );


        setText(
            [
                "#ticketEventTime",
                ".ticket-time"
            ],
            event.time
        );


        setText(
            [
                "#ticketGuestName",
                ".ticket-guest-name"
            ],
            attendee.name
        );


        setText(
            [
                "#ticketQuantity",
                ".ticket-guests"
            ],
            String(
                ticket.guests || 1
            )
        );


        setText(
            [
                "#ticketReference",
                ".ticket-reference"
            ],
            ticket.reference
        );


        setText(
            [
                "#ticketType",
                ".ticket-type"
            ],
            ticket.ticket?.name ||
            ticket.ticketCategory?.name ||
            "FREE ENTRY"
        );


        /*
         * Backend-generated QR.
         */
        renderTicketCode(
            ticket.ticket?.qr_code ||
            ticket.qr_code ||
            ""
        );


        ticketModule.classList.add(
            "is-open"
        );


        ticketModule.setAttribute(
            "aria-hidden",
            "false"
        );


        closeButton?.focus();

    }


    /*==================================
      CLOSE TICKET
    ==================================*/

    function closeTicket() {

        if (!ticketModule) {

            return;

        }


        ticketModule.classList.remove(
            "is-open"
        );


        ticketModule.setAttribute(
            "aria-hidden",
            "true"
        );


        previousFocus?.focus?.();


        previousFocus =
            null;


        currentTicket =
            null;

    }

/*==================================
  SAVE TICKET
==================================*/

async function saveTicket() {

    if (!currentTicket) {

        return;

    }


    if (
        typeof html2canvas ===
        "undefined"
    ) {

        console.error(
            "VAULT TICKET: html2canvas is not loaded."
        );

        return;

    }


    const ticketShell =
        ticketModule?.querySelector(
            ".vault-ticket-shell"
        );


    if (!ticketShell) {

        console.error(
            "VAULT TICKET: Ticket shell not found."
        );

        return;

    }


    const actions =
        ticketShell.querySelector(
            ".vault-ticket-actions"
        );


    try {

        /*
         * Hide Save Ticket / Done
         * only while creating the image.
         */
        if (actions) {

            actions.style.display =
                "none";

        }


        const canvas =
            await html2canvas(
                ticketShell,
                {
                    backgroundColor:
                        "#ffffff",

                    scale:
                        2,

                    useCORS:
                        true,

                    allowTaint:
                        false,

                    logging:
                        false
                }
            );


        /*
         * Restore the buttons
         * immediately after capture.
         */
        if (actions) {

            actions.style.display =
                "";

        }


        canvas.toBlob(
            blob => {

                if (!blob) {

                    console.error(
                        "VAULT TICKET: Could not create JPG."
                    );

                    return;

                }


                const url =
                    URL.createObjectURL(
                        blob
                    );


                const link =
                    document.createElement(
                        "a"
                    );


                link.href =
                    url;


                link.download =
                    `${
                        currentTicket.reference ||
                        "vault-ticket"
                    }.jpg`;


                document.body.appendChild(
                    link
                );


                link.click();


                link.remove();


                setTimeout(
                    () => {

                        URL.revokeObjectURL(
                            url
                        );

                    },
                    1000
                );

            },

            "image/jpeg",

            0.95

        );


    } catch (error) {

        /*
         * Make sure the buttons
         * come back even if capture fails.
         */
        if (actions) {

            actions.style.display =
                "";

        }


        console.error(
            "VAULT TICKET: Failed to save ticket.",
            error
        );

    }

}

    /*==================================
      EVENT BINDING
    ==================================*/

    function bindTicketEvents() {

        cacheTicketElements();


        if (!ticketModule) {

            return;

        }


        closeButton?.addEventListener(
            "click",
            closeTicket
        );


        doneButton?.addEventListener(
            "click",
            closeTicket
        );


        saveButton?.addEventListener(
            "click",
            saveTicket
        );


        ticketModule.addEventListener(
            "click",
            event => {

                if (
                    event.target ===
                    ticketModule
                ) {

                    closeTicket();

                }

            }
        );

    }


    /*==================================
      ESCAPE KEY
    ==================================*/

    document.addEventListener(
        "keydown",
        event => {

            if (
                event.key === "Escape" &&
                ticketModule?.classList.contains(
                    "is-open"
                )
            ) {

                closeTicket();

            }

        }
    );


    /*==================================
      RESERVATION CREATED
    ==================================*/
window.addEventListener(
    "vault:reservation-created",
    event => {

        openTicket(
            event.detail
        );

    }
);

    /*==================================
      PUBLIC API
    ==================================*/

    window.VaultTicket = {

        open:
            openTicket,

        close:
            closeTicket,

        save:
            saveTicket,

        ensure:
            ensureTicketModule

    };


    /*==================================
      INITIALIZE
    ==================================*/

    cacheTicketElements();


    if (ticketModule) {

        bindTicketEvents();

    }

})(window, document);