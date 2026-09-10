"use strict";

(function () {
    const savedKey = "vault:saved-events";

    let events = [];
    let upcomingEvents = [];
    let archivedEvents = [];

    function getSavedEvents() {
        try {
            return new Set(
                JSON.parse(localStorage.getItem(savedKey) || "[]")
            );
        } catch {
            return new Set();
        }
    }

    function formatDate(value) {
        const date = new Date(`${value}T12:00:00`);

        if (Number.isNaN(date.getTime())) {
            return {
                month: "",
                day: "",
                full: value || ""
            };
        }

        return {
            month: new Intl.DateTimeFormat("en", {
                month: "short"
            }).format(date),
            day: new Intl.DateTimeFormat("en", {
                day: "2-digit"
            }).format(date),
            full: new Intl.DateTimeFormat("en", {
                weekday: "long",
                month: "long",
                day: "numeric",
                year: "numeric"
            }).format(date)
        };
    }

    function fillUpcomingCard(event, savedEvents) {
        const template = document.getElementById(
            "experienceCardTemplate"
        );

        if (!template) return null;

        const card =
            template.content.firstElementChild.cloneNode(true);

        const date = formatDate(event.date);

        card.dataset.eventId = event.id || "";

        const image = card.querySelector(".event-image");

        if (image) {
            image.src = getImageUrl(event.image);
            image.alt = event.title || "";
        }

        const month = card.querySelector(".date-month");
        const day = card.querySelector(".date-day");
        const title = card.querySelector(".event-title");
        const theme = card.querySelector(".event-theme");
        const description =
            card.querySelector(".event-description p");
        const location = card.querySelector(".event-location");
        const time = card.querySelector(".event-time");

        if (month) month.textContent = date.month;
        if (day) day.textContent = date.day;
        if (title) title.textContent = event.title || "";
        if (theme) theme.textContent = event.theme || "";
        if (description) {
            description.textContent = event.description || "";
        }
        if (location) location.textContent = event.location || "";
        if (time) time.textContent = event.time || "";

        const saveButton = card.querySelector(
            '[data-action="save-event"]'
        );

        if (saveButton) {
            // Ensure the save button itself carries the event id so delegated
            // handlers can retrieve it reliably even if DOM structures change.
            saveButton.dataset.eventId = event.id || "";

            const isSaved = savedEvents.has(event.id);

            saveButton.classList.toggle("is-saved", isSaved);
            saveButton.setAttribute(
                "aria-pressed",
                String(isSaved)
            );
            saveButton.setAttribute(
                "aria-label",
                isSaved
                    ? "Remove saved event"
                    : "Save event"
            );
        }

        return card;
    }

    function fillArchivedCard(event) {
        const template = document.getElementById(
            "vaultExperienceCardTemplate"
        );

        if (!template) return null;

        const card =
            template.content.firstElementChild.cloneNode(true);

        card.dataset.eventId = event.id || "";

        const image =
            card.querySelector(".vault-event-image");

        if (image) {
            image.src = getImageUrl(event.image);
            image.alt = event.title || "";
        }

        const title =
            card.querySelector(".vault-event-title");

        const theme =
            card.querySelector(".vault-event-theme");

        const location =
            card.querySelector(".vault-event-location");

        const date =
            card.querySelector(".vault-event-date");

        if (title) title.textContent = event.title || "";
        if (theme) theme.textContent = event.theme || "";
        if (location) location.textContent = event.location || "";

        if (date) {
            date.textContent = formatDate(event.date).full;
        }

        return card;
    }

    function renderEvents() {
        const upcomingTrack =
            document.getElementById("experiencesTrack");

        const archivedTrack =
            document.getElementById("vaultExperiencesTrack");

        const savedEvents = window.VaultWishlist && typeof window.VaultWishlist.get === "function"
            ? new Set(window.VaultWishlist.get().map((item) => String(item.id || item.event_id)))
            : getSavedEvents();

        if (upcomingTrack) {
            upcomingTrack.replaceChildren();

            upcomingEvents.forEach((event) => {
                const card =
                    fillUpcomingCard(event, savedEvents);

                if (card) {
                    upcomingTrack.appendChild(card);
                }
            });
        }

        if (archivedTrack) {
            archivedTrack.replaceChildren();

            archivedEvents.forEach((event) => {
                const card = fillArchivedCard(event);

                if (card) {
                    archivedTrack.appendChild(card);
                }
            });
        }
    }

function getApiUrl(pathname) {
    const base =
        window.VAULT_API_BASE_URL ||
        "https://vault-experiences.onrender.com";

    return `${base}${pathname}`;
}

function getImageUrl(imagePath) {
    if (!imagePath) {
        return "";
    }

    if (
        imagePath.startsWith("http://") ||
        imagePath.startsWith("https://")
    ) {
        return imagePath;
    }

    const base =
        window.VAULT_API_BASE_URL ||
        "https://vault-experiences.onrender.com";

    return `${base}${imagePath}`;
}

function getImageUrl(imagePath) {
    if (!imagePath) return "";

    if (
        imagePath.startsWith("http://") ||
        imagePath.startsWith("https://")
    ) {
        return imagePath;
    }

    const base = window.VAULT_API_BASE_URL || "";

    return `${base}${imagePath}`;
}

async function loadEvents() {
    try {
        const response = await fetch(getApiUrl("/api/events"));

        if (!response.ok) {
            throw new Error(
                `Failed to load events: ${response.status}`
            );
        }

        events = await response.json();  upcomingEvents = events.filter(
(event) =>
    event.status === "upcoming" ||
    event.status === "scheduled" ||
    event.status === "on-sale"
);

            archivedEvents = events.filter(
                (event) => event.status === "archived"
            );

            renderEvents();

        } catch (error) {
            console.error(
                "VAULT events failed to load:",
                error
            );
        }
    }

    function getEvent(id, archived = false) {
        const source = archived
            ? archivedEvents
            : upcomingEvents;

        return source.find(
            (event) => String(event.id) === String(id)
        );
    }

    document.addEventListener("click", (event) => {
        const button =
            event.target.closest("[data-action]");

        if (!button) return;

        const card =
            button.closest("[data-event-id]");

        const resolvedCardId =
            card && card.dataset && card.dataset.eventId
                ? String(card.dataset.eventId).trim()
                : "";

        const resolvedButtonId =
            button.dataset && button.dataset.eventId
                ? String(button.dataset.eventId).trim()
                : "";

        const eventId =
            resolvedCardId || resolvedButtonId || undefined;

        if (button.dataset.action === "book-event") {
            const selectedEvent = getEvent(eventId);

            if (selectedEvent) {
                window.dispatchEvent(
                    new CustomEvent("vault:book-event", {
                        detail: selectedEvent
                    })
                );
            }
        }

        if (button.dataset.action === "save-event") {
            if (window.VaultWishlist && typeof window.VaultWishlist.toggle === "function") {
                event.preventDefault();
                window.VaultWishlist.toggle(eventId);
                return;
            }

            const savedEvents = getSavedEvents();

            if (savedEvents.has(eventId)) {
                savedEvents.delete(eventId);
            } else {
                savedEvents.add(eventId);
            }

            localStorage.setItem(
                savedKey,
                JSON.stringify([...savedEvents])
            );

            renderEvents();
        }

        if (
            button.dataset.action ===
            "view-experience"
        ) {
            const selectedEvent =
                getEvent(eventId, true);

            if (selectedEvent) {
                window.dispatchEvent(
                    new CustomEvent(
                        "vault:view-experience",
                        {
                            detail: selectedEvent
                        }
                    )
                );
            }
        }
    });

    window.VaultEvents = {
        render: renderEvents,
        load: loadEvents,
        getEvent: getEvent
    };

    loadEvents();
})();
