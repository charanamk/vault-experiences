"use strict";

/*==================================
VAULT TICKETS — ADMIN MANAGEMENT
===================================*/

/*==================================
DOM
===================================*/

const ts_ticketsEventSelect =
    document.getElementById("ticketsEventSelect");

const ts_ticketsEventSection =
    document.getElementById("ticketsEventSection");

const ts_ticketsEventName =
    document.getElementById("ticketsEventName");

const ts_ticketsEventTheme =
    document.getElementById("ticketsEventTheme");

const ts_ticketsEventStatus =
    document.getElementById("ticketsEventStatus");

const ticketCategories =
    document.getElementById("ticketCategories");

const ts_ticketsEmptyState =
    document.getElementById("ticketsEmptyState");


/*==================================
STATE
===================================*/

let events = [];
let selectedEventId = null;
let tickets = [];


/*==================================
API
===================================*/

function getApiUrl(pathname) {
    const base =
        window.VAULT_API_BASE_URL ||
        (
            window.location.hostname === "localhost" ||
            window.location.hostname === "127.0.0.1"
        )
            ? (
                window.location.port === "3000"
                    ? ""
                    : "http://localhost:3000"
            )
            : "";

    return `${base}${pathname}`;
}


/*==================================
HTML ESCAPE
===================================*/

function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


/*==================================
PRICE
===================================*/

function formatPriceForCard(value) {
    const price = Number(value) || 0;

    return "KSh " +
        price.toLocaleString("en-KE", {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
        });
}


/*==================================
PERCENTAGE
===================================*/

function calcPercent(sold, capacity) {
    const c = Number(capacity) || 0;
    const s = Number(sold) || 0;

    if (c <= 0) {
        return 0;
    }

    return Math.min(
        100,
        Math.round((s / c) * 100)
    );
}


/*==================================
EVENT SELECTOR
===================================*/

function populateEventSelector() {
    if (!ts_ticketsEventSelect) {
        return;
    }

    ts_ticketsEventSelect.innerHTML = "";

    const emptyOption =
        document.createElement("option");

    emptyOption.value = "";
    emptyOption.textContent =
        "Select an experience";

    ts_ticketsEventSelect.appendChild(
        emptyOption
    );

    events.forEach(event => {
        const option =
            document.createElement("option");

        option.value = event.id;
        option.textContent =
            event.title || "Untitled experience";

        ts_ticketsEventSelect.appendChild(
            option
        );
    });
}


/*==================================
LOAD EVENTS
===================================*/

async function loadEvents() {
    try {
        const response =
            await fetch(
                getApiUrl("/api/events")
            );

        if (!response.ok) {
            throw new Error(
                `Failed to load experiences (${response.status})`
            );
        }

        const result =
            await response.json();

        events =
            Array.isArray(result)
                ? result
                : [];

        populateEventSelector();

        if (selectedEventId) {
            const stillExists =
                events.some(
                    event =>
                        String(event.id) ===
                        String(selectedEventId)
                );

            if (stillExists) {
                await loadTicketsForEvent(
                    selectedEventId
                );
            }
        }

    } catch (error) {
        console.error(
            "VAULT tickets: failed to load experiences",
            error
        );

        if (ts_ticketsEventSelect) {
            ts_ticketsEventSelect.innerHTML =
                '<option value="">Unable to load experiences</option>';
        }
    }
}


/*==================================
LOAD TICKETS
===================================*/

async function loadTicketsForEvent(eventId) {
    selectedEventId =
        eventId || null;

    const event =
        events.find(
            item =>
                String(item.id) ===
                String(eventId)
        );

    renderEventHeader(event);

    if (!eventId) {
        tickets = [];
        renderTickets();
        return;
    }

    try {
        if (ticketCategories) {
            ticketCategories.innerHTML =
                '<div class="tickets-loading">Loading tickets...</div>';
        }

        const response =
            await fetch(
                getApiUrl(
                    `/api/tickets/event/${encodeURIComponent(eventId)}`
                )
            );

        if (!response.ok) {
            throw new Error(
                `Failed to load tickets (${response.status})`
            );
        }

        const result =
            await response.json();

        tickets =
            Array.isArray(result.tickets)
                ? result.tickets
                : [];

        renderTickets();

    } catch (error) {
        console.error(
            "VAULT tickets: failed to load ticket categories",
            error
        );

        tickets = [];

        if (ticketCategories) {
            ticketCategories.innerHTML =
                '<div class="tickets-loading">Unable to load tickets.</div>';
        }

        if (ts_ticketsEmptyState) {
            ts_ticketsEmptyState.hidden = true;
        }
    }
}


/*==================================
EVENT HEADER
===================================*/

function renderEventHeader(event) {
    if (!event) {
        if (ts_ticketsEventName) {
            ts_ticketsEventName.textContent =
                "Select an experience";
        }

        if (ts_ticketsEventTheme) {
            ts_ticketsEventTheme.textContent =
                "—";
        }

        if (ts_ticketsEventStatus) {
            ts_ticketsEventStatus.textContent =
                "—";
        }

        if (ts_ticketsEventSection) {
            ts_ticketsEventSection.removeAttribute(
                "data-event-id"
            );
        }

        return;
    }

    if (ts_ticketsEventName) {
        ts_ticketsEventName.textContent =
            event.title || "Untitled experience";
    }

    if (ts_ticketsEventTheme) {
        ts_ticketsEventTheme.textContent =
            event.theme || "—";
    }

    if (ts_ticketsEventStatus) {
        ts_ticketsEventStatus.textContent =
            event.status || "—";
    }

    if (ts_ticketsEventSection) {
        ts_ticketsEventSection.setAttribute(
            "data-event-id",
            event.id
        );
    }
}


/*==================================
RENDER TICKET CARDS
===================================*/

function renderTickets() {
    if (!ticketCategories) {
        return;
    }

    ticketCategories.innerHTML = "";

    if (!selectedEventId) {
        if (ts_ticketsEmptyState) {
            ts_ticketsEmptyState.hidden = false;
        }

        return;
    }

    if (!tickets.length) {
        if (ts_ticketsEmptyState) {
            ts_ticketsEmptyState.hidden = false;
        }

        return;
    }

    if (ts_ticketsEmptyState) {
        ts_ticketsEmptyState.hidden = true;
    }

    tickets.forEach(ticket => {
        const card =
            createTicketCardDOM(ticket);

        ticketCategories.appendChild(card);
    });

    updateOverview();
}


/*==================================
CREATE CARD
===================================*/

function createTicketCardDOM(ticket) {
    const card =
        document.createElement("div");

    card.className =
        "ticket-management-card";

    card.dataset.ticketId =
        ticket.id;

    const sold =
        Number(ticket.sold) || 0;

    const capacity =
        Number(ticket.capacity) || 0;

    const remaining =
        Math.max(
            capacity - sold,
            0
        );

    const percentage =
        calcPercent(
            sold,
            capacity
        );

    card.innerHTML = `
        <div class="ticket-management-top">
            <div>
                <span class="ticket-category-label">
                    Category
                </span>

                <h3>
                    ${escapeHtml(ticket.name || "Untitled Ticket")}
                </h3>
            </div>

            <div class="ticket-card-actions">
                <button
                    class="ticket-edit-btn"
                    type="button"
                    data-ticket-action="edit"
                >
                    Edit
                </button>

                <button
                    class="ticket-delete-btn"
                    type="button"
                    data-ticket-action="delete"
                >
                    Delete
                </button>
            </div>
        </div>

        <div class="ticket-price">
            <span>Price</span>

            <strong>
                ${formatPriceForCard(ticket.price)}
            </strong>
        </div>

        <div class="ticket-sales-stats">
            <div>
                <span>Capacity</span>
                <strong>${capacity}</strong>
            </div>

            <div>
                <span>Sold</span>
                <strong>${sold}</strong>
            </div>

            <div>
                <span>Remaining</span>
                <strong>${remaining}</strong>
            </div>
        </div>

        <div class="ticket-progress">
            <div class="ticket-progress-track">
                <div
                    class="ticket-progress-bar"
                    style="width: ${percentage}%"
                ></div>
            </div>

            <div class="ticket-progress-label">
                <strong>${percentage}%</strong>
            </div>
        </div>
    `;

    const editButton =
        card.querySelector(
            '[data-ticket-action="edit"]'
        );

    if (editButton) {
        editButton.addEventListener(
            "click",
            () => {
                if (
                    window.VaultTickets &&
                    typeof window.VaultTickets.openEditor ===
                        "function"
                ) {
                    window.VaultTickets.openEditor(
                        card
                    );
                }
            }
        );
    }

    const deleteButton =
        card.querySelector(
            '[data-ticket-action="delete"]'
        );

    if (deleteButton) {
        deleteButton.addEventListener(
            "click",
            () => {
                deleteTicket(ticket.id);
            }
        );
    }

    return card;
}


/*==================================
ADD TICKET BUTTON
===================================*/

function addTicketButton() {
    const header =
        document.querySelector(
            ".tickets-event-header"
        );

    if (!header) {
        return;
    }

    if (
        document.getElementById(
            "addTicketBtn"
        )
    ) {
        return;
    }

    const button =
        document.createElement("button");

    button.type = "button";
    button.id = "addTicketBtn";
    button.className =
        "ticket-edit-btn";
    button.textContent =
        "Add Ticket";

    button.addEventListener(
        "click",
        () => {
            if (!selectedEventId) {
                alert(
                    "Please select an experience first."
                );

                return;
            }

            if (
                window.VaultTickets &&
                typeof window.VaultTickets.openEditorForCreate ===
                    "function"
            ) {
                window.VaultTickets.openEditorForCreate(
                    selectedEventId
                );
            }
        }
    );

    header.appendChild(button);
}


/*==================================
DELETE TICKET
===================================*/

async function deleteTicket(ticketId) {
    const ticket =
        tickets.find(
            item =>
                String(item.id) ===
                String(ticketId)
        );

    if (!ticket) {
        return;
    }

    if (
        !window.confirm(
            `Delete "${ticket.name}"? This cannot be undone.`
        )
    ) {
        return;
    }

    try {
        const response =
            await fetch(
                getApiUrl(
                    `/api/tickets/${encodeURIComponent(ticketId)}`
                ),
                {
                    method: "DELETE"
                }
            );

        const result =
            await response.json().catch(
                () => ({})
            );

        if (!response.ok) {
            throw new Error(
                result.message ||
                "Failed to delete ticket."
            );
        }

        await loadTicketsForEvent(
            selectedEventId
        );

    } catch (error) {
        console.error(
            "VAULT ticket deletion failed:",
            error
        );

        alert(
            error.message ||
            "Failed to delete ticket."
        );
    }
}


/*==================================
SAVE CALLBACK
===================================*/

function registerOnSave() {
    if (
        !window.VaultTickets ||
        typeof window.VaultTickets.setOnSave !==
            "function"
    ) {
        return;
    }

    window.VaultTickets.setOnSave(
        async ticketData => {
            try {
                const response =
                    await fetch(
                        getApiUrl(
                            "/api/tickets"
                        ),
                        {
                            method: "POST",
                            headers: {
                                "Content-Type":
                                    "application/json"
                            },
                            body: JSON.stringify({
                                eventId:
                                    ticketData.eventId ||
                                    selectedEventId,

                                name:
                                    ticketData.name,

                                price:
                                    ticketData.price,

                                capacity:
                                    ticketData.capacity,

                                description:
                                    ticketData.description ||
                                    ""
                            })
                        }
                    );

                const result =
                    await response.json().catch(
                        () => ({})
                    );

                if (!response.ok) {
                    throw new Error(
                        result.message ||
                        "Failed to create ticket."
                    );
                }

                await loadTicketsForEvent(
                    selectedEventId
                );

            } catch (error) {
                console.error(
                    "VAULT ticket creation failed:",
                    error
                );

                alert(
                    error.message ||
                    "Failed to create ticket."
                );
            }
        }
    );
}


/*==================================
UPDATE CARD AFTER EDIT
===================================*/

async function saveEditedTicket(
    ticketId,
    ticketData
) {
    try {
        const response =
            await fetch(
                getApiUrl(
                    `/api/tickets/${encodeURIComponent(ticketId)}`
                ),
                {
                    method: "PUT",
                    headers: {
                        "Content-Type":
                            "application/json"
                    },
                    body: JSON.stringify({
                        name:
                            ticketData.name,

                        price:
                            ticketData.price,

                        capacity:
                            ticketData.capacity,

                        description:
                            ticketData.description ||
                            ""
                    })
                }
            );

        const result =
            await response.json().catch(
                () => ({})
            );

        if (!response.ok) {
            throw new Error(
                result.message ||
                "Failed to update ticket."
            );
        }

        await loadTicketsForEvent(
            selectedEventId
        );

    } catch (error) {
        console.error(
            "VAULT ticket update failed:",
            error
        );

        alert(
            error.message ||
            "Failed to update ticket."
        );
    }
}


/*==================================
OVERVIEW
===================================*/

function updateOverview() {
    let totalCapacity = 0;
    let totalSold = 0;

    tickets.forEach(ticket => {
        totalCapacity +=
            Number(ticket.capacity) || 0;

        totalSold +=
            Number(ticket.sold) || 0;
    });

    const totalRemaining =
        Math.max(
            totalCapacity - totalSold,
            0
        );

    const overview =
        document.querySelectorAll(
            ".ticket-overview-item strong"
        );

    if (overview[0]) {
        overview[0].textContent =
            totalCapacity;
    }

    if (overview[1]) {
        overview[1].textContent =
            totalSold;
    }

    if (overview[2]) {
        overview[2].textContent =
            totalRemaining;
    }
}


/*==================================
PUBLIC API
===================================*/

window.VaultTickets =
    window.VaultTickets || {};

window.VaultTickets.saveEditedTicket =
    saveEditedTicket;


/*==================================
INITIALIZE
===================================*/

(function initTickets() {
    populateEventSelector();
    addTicketButton();
    registerOnSave();

    if (ts_ticketsEventSelect) {
        ts_ticketsEventSelect.addEventListener(
            "change",
            event => {
                loadTicketsForEvent(
                    event.target.value
                );
            }
        );
    }

    renderEventHeader(null);
    renderTickets();
    loadEvents();

    console.log(
        "VAULT TICKETS — DATABASE MODULE READY"
    );
})();

