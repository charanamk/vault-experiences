"use strict";

(function (window, document) {

    const state = {
        wishlistItems: [],
        savedIds: new Set()
    };


    const wishlistList =
        document.getElementById("wishlistList");

    const wishlistEmpty =
        document.getElementById("wishlistEmpty");

    const wishlistExploreBtn =
        document.getElementById("wishlistExploreBtn");


    /*==================================================
      LOCAL CUSTOMER ID
    ==================================================*/

    function generateLocalCustomerId() {

        if (
            window.crypto &&
            typeof window.crypto.randomUUID === "function"
        ) {

            return window.crypto.randomUUID();

        }


        return `vault-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

    }


    /*==================================================
      CUSTOMER ID
    ==================================================*/

    function getCustomerId() {

        /*
         * Prefer the centralized CustomerSession API
         * when available so we don't duplicate
         * customer/session logic.
         *
         * Fall back to a localStorage-backed guest ID
         * for compatibility and for pages that haven't
         * initialized a CustomerSession.
         */

        try {

            if (
                window.CustomerSession &&
                typeof window.CustomerSession.getCustomerId === "function"
            ) {

                const id =
                    window.CustomerSession.getCustomerId();


                if (id) {

                    return id;

                }

            }

        } catch (err) {

            console.error(
                "VAULT WISHLIST: Error accessing CustomerSession.",
                err
            );

        }


        /*
         * Legacy/local fallback:
         * keep the previously-used storage key so
         * existing guest IDs remain stable across
         * page loads.
         */

        const storageKey =
            "vault:customer-id";


        try {

            const existing =
                localStorage.getItem(storageKey);


            if (existing) {

                return existing;

            }


            const generated =
                generateLocalCustomerId();


            localStorage.setItem(
                storageKey,
                generated
            );


            return generated;

        } catch (error) {

            console.error(
                "VAULT WISHLIST: Unable to read customer ID.",
                error
            );

            return "guest";

        }

    }


    /*==================================================
      API BASE
    ==================================================*/

    function getApiBase() {

        const configured =
            window.VAULT_API_BASE_URL || "";


        if (configured) {

            return configured.replace(
                /\/+$/,
                ""
            );

        }


        if (
            window.location.hostname === "localhost" ||
            window.location.hostname === "127.0.0.1"
        ) {

            return window.location.port === "3000"
                ? ""
                : "http://localhost:3000";

        }


        return "https://vault-experiences.onrender.com";

    }


    function getWishlistEndpoint(pathname) {

        const base =
            getApiBase();


        return `${base}${pathname}`;

    }


    /*==================================================
      IMAGE URL
    ==================================================*/

    function resolveImageUrl(rawUrl) {

        if (!rawUrl) {

            return "";

        }


        const value =
            String(rawUrl).trim();


        if (!value) {

            return "";

        }


        /*
         * Absolute URLs and data URLs are already
         * usable as-is.
         */

        if (
            /^https?:\/\//i.test(value) ||
            value.startsWith("data:") ||
            value.startsWith("//")
        ) {

            return value;

        }


        const path =
            value.startsWith("/")
                ? value
                : `/${value}`;


        const base =
            window.VAULT_API_BASE_URL ||
            "https://vault-experiences.onrender.com";


        return `${base}${path}`;

    }


    /*==================================================
      TOAST
    ==================================================*/

    function showToast(message) {

        const toast =
            document.createElement("div");


        toast.id =
            "vault-wishlist-toast";


        toast.textContent =
            message;


        toast.setAttribute(
            "role",
            "status"
        );


        Object.assign(
            toast.style,
            {
                position: "fixed",
                right: "20px",
                bottom: "20px",
                zIndex: "9999",
                maxWidth: "260px",
                padding: "10px 12px",
                borderRadius: "12px",
                background: "rgba(24, 18, 13, 0.94)",
                color: "#f7f1ea",
                fontFamily: "Inter, sans-serif",
                fontSize: "0.72rem",
                lineHeight: "1.4",
                boxShadow: "0 12px 30px rgba(0, 0, 0, 0.18)",
                border: "1px solid rgba(200, 169, 107, 0.35)"
            }
        );


        document.body.appendChild(
            toast
        );


        window.setTimeout(
            () => {

                toast.remove();

            },
            2500
        );

    }


    /*==================================================
      FETCH JSON
    ==================================================*/

    async function fetchJson(
        url,
        options = {}
    ) {

        const {
            headers: customHeaders = {},
            ...restOptions
        } = options;


        const response =
            await fetch(
                url,
                {
                    credentials: "same-origin",
                    ...restOptions,
                    headers: {
                        "Content-Type":
                            "application/json",
                        ...customHeaders
                    }
                }
            );


        if (!response.ok) {

            let message =
                `Request failed (${response.status})`;


            try {

                const payload =
                    await response.json();


                if (
                    payload &&
                    payload.message
                ) {

                    message =
                        payload.message;

                }

            } catch (error) {

                console.error(
                    "VAULT WISHLIST: Failed to parse error payload.",
                    error
                );

            }


            throw new Error(
                message
            );

        }


        return response.json();

    }


    /*==================================================
      EVENT ID
    ==================================================*/

    function normalizeEventId(eventId) {

        return String(
            eventId || ""
        ).trim();

    }


    /*==================================================
      BUTTON STATE
    ==================================================*/

    function syncButtonsState() {

        const activeButtons =
            document.querySelectorAll(
                '[data-action="save-event"]'
            );


        activeButtons.forEach(
            (button) => {

                const eventId =
                    normalizeEventId(
                        button.closest(
                            "[data-event-id]"
                        )?.dataset.eventId ||
                        button.dataset.eventId
                    );


                if (!eventId) {

                    return;

                }


                const isSaved =
                    state.savedIds.has(
                        eventId
                    );


                button.classList.toggle(
                    "is-saved",
                    isSaved
                );


                button.setAttribute(
                    "aria-pressed",
                    String(isSaved)
                );


                button.setAttribute(
                    "aria-label",
                    isSaved
                        ? "Remove from wishlist"
                        : "Add to wishlist"
                );


                button.title =
                    isSaved
                        ? "Remove from wishlist"
                        : "Add to wishlist";

            }
        );

    }


    /*==================================================
      RENDER WISHLIST
    ==================================================*/

    function renderWishlist() {

        if (!wishlistList) {

            return state.wishlistItems;

        }

wishlistList.innerHTML = "";
wishlistList.classList.add("is-loading");

  wishlistList.classList.remove("is-loading");
        if (!state.wishlistItems.length) {

            if (wishlistEmpty) {

                wishlistEmpty.hidden =
                    false;

            }


            return state.wishlistItems;

        }


        if (wishlistEmpty) {

            wishlistEmpty.hidden =
                true;

        }


        state.wishlistItems.forEach(
            (eventData) => {

                const card =
                    document.createElement(
                        "article"
                    );


                const eventId =
                    normalizeEventId(
                        eventData.id ||
                        eventData.event_id
                    );


                card.className =
                    "wishlist-card";


                card.innerHTML = `

                    <img
                        class="wishlist-image"
                        src="${eventData.image || ""}"
                        alt="${eventData.title || "Experience"}"
                    >

                    <div
                        class="wishlist-overlay">
                    </div>

                    <div
                        class="wishlist-content">

                        <button
                            class="wishlist-remove"
                            type="button"
                            aria-label="Remove from wishlist"
                            data-event-id="${eventId}"
                        >

                            <img
                                src="assets/icons/bookmark.svg"
                                alt=""
                                aria-hidden="true"
                            >

                        </button>


                        <span
                            class="wishlist-theme">

                            ${eventData.theme || ""}

                        </span>


                        <h3
                            class="wishlist-title">

                            ${eventData.title || "Untitled Experience"}

                        </h3>


                        <div
                            class="wishlist-meta">

                            <div
                                class="wishlist-meta-item">

                                <img
                                    src="assets/icons/calendar.svg"
                                    alt=""
                                    aria-hidden="true"
                                >

                                <span>

                                    ${eventData.date || "Date TBA"}

                                </span>

                            </div>


                            <div
                                class="wishlist-meta-item">

                                <img
                                    src="assets/icons/location.svg"
                                    alt=""
                                    aria-hidden="true"
                                >

                                <span>

                                    ${eventData.location || "Location TBA"}

                                </span>

                            </div>

                        </div>


                        <button
                            class="wishlist-view"
                            type="button"
                            data-event-id="${eventId}"
                        >

                            View Experience

                        </button>

                    </div>

                `;


                wishlistList.appendChild(
                    card
                );

            }
        );


        return state.wishlistItems;

    }


    /*==================================================
      CUSTOMER SESSION
    ==================================================*/

    async function ensureCustomerSession() {

        const sessionCustomerId =
            window.CustomerSession &&
            typeof window.CustomerSession.getCustomerId === "function"
                ? window.CustomerSession.getCustomerId()
                : null;


        if (sessionCustomerId) {

            return sessionCustomerId;

        }


        if (
            window.CustomerSession &&
            typeof window.CustomerSession.createGuest === "function"
        ) {

            try {

                await window.CustomerSession.createGuest();


                return window.CustomerSession.getCustomerId();

            } catch (error) {

                console.warn(
                    "VAULT WISHLIST: Unable to create guest session automatically.",
                    error
                );

            }

        }


        return getCustomerId();

    }


    /*==================================================
      REFRESH
    ==================================================*/

    async function refresh() {

        const customerId =
            await ensureCustomerSession();


        const url =
            `${getWishlistEndpoint("/api/wishlist")}?customerId=${encodeURIComponent(customerId)}`;


        try {

            const items =
                await fetchJson(url);


            state.wishlistItems =
                Array.isArray(items)
                    ? items.map(
                        (item) => ({
                            ...item,
                            image:
                                resolveImageUrl(
                                    item.image
                                )
                        })
                    )
                    : [];


            state.savedIds =
                new Set(
                    state.wishlistItems.map(
                        (item) =>
                            normalizeEventId(
                                item.id ||
                                item.event_id
                            )
                    )
                );


            syncButtonsState();


            renderWishlist();


            return state.wishlistItems;

        } catch (error) {

            console.error(
                "VAULT WISHLIST: Failed to refresh wishlist.",
                error
            );


            showToast(
                "Could not load your wishlist right now."
            );


            return state.wishlistItems;

        }

    }


    /*==================================================
      ADD
    ==================================================*/

    async function add(eventId) {

        const nextEventId =
            normalizeEventId(
                eventId
            );


        if (!nextEventId) {

            return null;

        }


        const customerId =
            await ensureCustomerSession();


        try {

            const payload =
                await fetchJson(
                    getWishlistEndpoint(
                        "/api/wishlist"
                    ),
                    {
                        method: "POST",
                        headers: {
                            "X-Customer-Id":
                                customerId
                        },
                        body: JSON.stringify({
                            customerId,
                            eventId:
                                nextEventId
                        })
                    }
                );


            if (
                payload &&
                payload.wishlisted
            ) {

                state.savedIds.add(
                    nextEventId
                );


                await refresh();


                return payload;

            }


            return payload;

        } catch (error) {

            console.error(
                "VAULT WISHLIST: Unable to add item.",
                error
            );


            showToast(
                "Could not save this experience. Please try again."
            );


            syncButtonsState();


            return null;

        }

    }


    /*==================================================
      REMOVE
    ==================================================*/

    async function remove(eventId) {

        const nextEventId =
            normalizeEventId(
                eventId
            );


        if (!nextEventId) {

            return null;

        }


        const customerId =
            await ensureCustomerSession();


        try {

            const payload =
                await fetchJson(
                    `${getWishlistEndpoint("/api/wishlist")}/${encodeURIComponent(nextEventId)}?customerId=${encodeURIComponent(customerId)}`,
                    {
                        method: "DELETE",
                        headers: {
                            "X-Customer-Id":
                                customerId
                        }
                    }
                );


            state.savedIds.delete(
                nextEventId
            );


            await refresh();


            return payload;

        } catch (error) {

            console.error(
                "VAULT WISHLIST: Unable to remove item.",
                error
            );


            showToast(
                "Could not remove this experience. Please try again."
            );


            syncButtonsState();


            return null;

        }

    }


    /*==================================================
      TOGGLE
    ==================================================*/

    async function toggle(eventId) {

        const nextEventId =
            normalizeEventId(
                eventId
            );


        if (!nextEventId) {

            return false;

        }


        const isSaved =
            state.savedIds.has(
                nextEventId
            );


        if (isSaved) {

            const result =
                await remove(
                    nextEventId
                );


            return !!result;

        }


        const result =
            await add(
                nextEventId
            );


        return !!result;

    }


    /*==================================================
      HAS
    ==================================================*/

    function has(eventId) {

        return state.savedIds.has(
            normalizeEventId(eventId)
        );

    }


    /*==================================================
      OPEN EXPERIENCE
    ==================================================*/

    function openExperience(eventId) {

        const normalized =
            normalizeEventId(
                eventId
            );


        if (!normalized) {

            return;

        }


        const event =
            window.VaultEvents?.getEvent?.(
                normalized
            ) ||
            state.wishlistItems.find(
                (item) =>
                    normalizeEventId(
                        item.id ||
                        item.event_id
                    ) === normalized
            ) ||
            null;


        if (!event) {

            return;

        }


        window.dispatchEvent(
            new CustomEvent(
                "vault:book-event",
                {
                    detail: event
                }
            )
        );

    }


    /*==================================================
      REMOVE FROM WISHLIST
    ==================================================*/

    function removeFromWishlist(eventId) {

        return remove(
            eventId
        );

    }


    /*==================================================
      WISHLIST EVENTS
    ==================================================*/

    if (wishlistList) {

        wishlistList.addEventListener(
            "click",
            (event) => {

                const removeButton =
                    event.target.closest(
                        ".wishlist-remove"
                    );


                if (removeButton) {

                    const eventId =
                        removeButton.dataset.eventId;


                    removeFromWishlist(
                        eventId
                    );


                    return;

                }


                const viewButton =
                    event.target.closest(
                        ".wishlist-view"
                    );


                if (viewButton) {

                    openExperience(
                        viewButton.dataset.eventId
                    );

                }

            }
        );

    }


    /*==================================================
      EXPLORE EXPERIENCES
    ==================================================*/

    if (wishlistExploreBtn) {

        wishlistExploreBtn.addEventListener(
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

    async function init() {

        syncButtonsState();


        await refresh();

    }


    /*==================================================
      PUBLIC API
    ==================================================*/

    window.VaultWishlist = {

        init,

        add,

        remove,

        toggle,

        has,

        refresh,

        render:
            renderWishlist,

        get:
            () => [
                ...state.wishlistItems
            ],

        removeFromWishlist,

        openExperience

    };


    /*==================================================
      START
    ==================================================*/

    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            init,
            {
                once: true
            }
        );

    } else {

        init();

    }

})(window, document);