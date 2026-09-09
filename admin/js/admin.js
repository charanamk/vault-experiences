"use strict";

(function (window, document) {

const adminRoutes = {
    dashboard: "/admin",
    events: "/admin/events",
    tickets: "/admin/tickets",
    bookings: "/admin/bookings",
    customers: "/admin/customers",
    equipment: "/admin/equipment",
    analytics: "/admin/analytics",
    settings: "/admin/settings",
    verification: "/admin/verification",
    "ticket-verification": "/admin/verification"
};

const adminMenuBtn =
    document.getElementById("adminMenuBtn");

const adminSidebar =
    document.getElementById("adminSidebar");

const adminSidebarOverlay =
    document.getElementById("adminSidebarOverlay");

let activeAdminSection = null;


/*==================================
ACTIVE SECTION
==================================*/

function getCurrentPageRoute() {
    return window.location.pathname.replace(/\/+$/, "") || "/admin";
}

function getAdminSectionFromRoute(route) {
    const normalized =
        String(route || "").replace(/\/+$/, "") || "/admin";

    return Object.keys(adminRoutes).find(
        (key) => {
            const mapped =
                String(adminRoutes[key] || "")
                    .replace(/\/+$/, "") || "/admin";

            return mapped === normalized;
        }
    ) || null;
}

function setActiveAdminSection(section) {
    if (!section) return;

    activeAdminSection = section;

    document.querySelectorAll(".admin-nav-item").forEach((navItem) => {

        const navSection =
            navItem.dataset.section;

        const isActive =
            navSection === section;

        navItem.classList.toggle(
            "active",
            isActive
        );

        if (isActive) {
            navItem.setAttribute(
                "aria-current",
                "page"
            );
        } else {
            navItem.removeAttribute(
                "aria-current"
            );
        }
    });
}

function getActiveAdminSection() {
    return activeAdminSection;
}


/*==================================
SIDEBAR
==================================*/

function openAdminSidebar() {
    if (!adminSidebar) return;

    adminSidebar.classList.add("is-open");

    if (adminSidebarOverlay) {
        adminSidebarOverlay.classList.add(
            "is-visible"
        );
    }

    if (adminMenuBtn) {
        adminMenuBtn.classList.add("is-open");

        adminMenuBtn.setAttribute(
            "aria-expanded",
            "true"
        );
    }

    adminSidebar.setAttribute(
        "aria-hidden",
        "false"
    );

    document.body.classList.add(
        "admin-sidebar-open"
    );
}

function closeAdminSidebar() {
    if (!adminSidebar) return;

    adminSidebar.classList.remove(
        "is-open"
    );

    if (adminSidebarOverlay) {
        adminSidebarOverlay.classList.remove(
            "is-visible"
        );
    }

    if (adminMenuBtn) {
        adminMenuBtn.classList.remove(
            "is-open"
        );

        adminMenuBtn.setAttribute(
            "aria-expanded",
            "false"
        );
    }

    adminSidebar.setAttribute(
        "aria-hidden",
        "true"
    );

    document.body.classList.remove(
        "admin-sidebar-open"
    );
}

function toggleAdminSidebar() {
    if (!adminSidebar) return;

    if (
        adminSidebar.classList.contains(
            "is-open"
        )
    ) {
        closeAdminSidebar();
    } else {
        openAdminSidebar();
    }
}


/*==================================
ADMIN NAVIGATION
==================================*/

function navigateAdmin(section) {

    const routeSection =
        section || "dashboard";

    const route =
        adminRoutes[routeSection] ||
        adminRoutes.dashboard;

    const currentRoute =
        getCurrentPageRoute();

    if (currentRoute === route) {
        setActiveAdminSection(
            routeSection
        );
        return;
    }

    window.location.assign(route);
}


/*==================================
EVENT LISTENERS
==================================*/

if (adminMenuBtn) {

    adminMenuBtn.addEventListener(
        "click",
        toggleAdminSidebar
    );
}

if (adminSidebarOverlay) {

    adminSidebarOverlay.addEventListener(
        "click",
        closeAdminSidebar
    );
}


document.addEventListener(
    "click",
    (event) => {

        const navItem =
            event.target.closest(
                ".admin-nav-item"
            );

        if (!navItem) return;

        const section =
            navItem.dataset.section;

        if (
            !section ||
            !adminRoutes[section]
        ) {
            closeAdminSidebar();
            return;
        }

        event.preventDefault();

        navigateAdmin(section);

        closeAdminSidebar();
    }
);


document.addEventListener(
    "keydown",
    (event) => {

        if (event.key === "Escape") {
            closeAdminSidebar();
        }
    }
);


window.addEventListener(
    "resize",
    () => {

        if (window.innerWidth >= 900) {
            closeAdminSidebar();
        }
    }
);


/*==================================
INITIAL ACTIVE SECTION
==================================*/

const initialActiveItem =
    document.querySelector(
        ".admin-nav-item.active"
    );

const currentPageSection =
    getAdminSectionFromRoute(
        getCurrentPageRoute()
    ) ||
    initialActiveItem?.dataset.section;

setActiveAdminSection(
    currentPageSection ||
    "dashboard"
);


/*==================================
VAULT ADMIN API
==================================*/

window.VaultAdmin = {

    openSidebar:
        openAdminSidebar,

    closeSidebar:
        closeAdminSidebar,

    toggleSidebar:
        toggleAdminSidebar,

    setActiveSection:
        setActiveAdminSection,

    getActiveSection:
        getActiveAdminSection,

    navigate:
        navigateAdmin,

    routes:
        adminRoutes
};

console.log(
    "VAULT ADMIN — SHELL READY"
);

/*==================================
DASHBOARD DATA
==================================*/

async function loadAdminDashboard() {

    try {

        const response = await fetch(
            "/api/admin/dashboard",
            {
                method: "GET",
                credentials: "include",
                headers: {
                    "Accept": "application/json"
                }
            }
        );

        const data =
            await response.json();

        if (!response.ok) {
            throw new Error(
                data.message ||
                "Failed to load dashboard."
            );
        }


        /*==================================
        OVERVIEW STATS
        ==================================*/

        const statEvents =
            document.getElementById(
                "statEvents"
            );

        const statBookings =
            document.getElementById(
                "statBookings"
            );

        const statTickets =
            document.getElementById(
                "statTickets"
            );

        const statRevenue =
            document.getElementById(
                "statRevenue"
            );


        if (statEvents) {
            statEvents.textContent =
                data.stats?.events ?? 0;
        }

        if (statBookings) {
            statBookings.textContent =
                data.stats?.bookings ?? 0;
        }

        if (statTickets) {
            statTickets.textContent =
                data.stats?.tickets ?? 0;
        }

        if (statRevenue) {
            statRevenue.textContent =
                `KSh ${data.stats?.revenue ?? 0}`;
        }


        /*==================================
        DASHBOARD DATE
        ==================================*/

        const dashboardDate =
            document.getElementById(
                "dashboardDate"
            );

        if (dashboardDate) {

            dashboardDate.textContent =
                new Intl.DateTimeFormat(
                    "en-KE",
                    {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                        year: "numeric"
                    }
                ).format(new Date());

        }


        /*==================================
        UPCOMING EXPERIENCES
        ==================================*/

        renderUpcomingExperiences(
            data.upcoming || []
        );


    } catch (error) {

        console.error(
            "VAULT ADMIN DASHBOARD:",
            error
        );

    }

}

/*==================================
RENDER UPCOMING EXPERIENCES
==================================*/

function renderUpcomingExperiences(events) {

    const upcomingList =
        document.getElementById(
            "upcomingList"
        );

    if (!upcomingList) return;

    upcomingList.innerHTML = "";

    if (!events.length) {

        upcomingList.innerHTML = `
            <div class="upcoming-empty">
                <p>No upcoming experiences.</p>
            </div>
        `;

        return;
    }

    events.forEach((event) => {

        const item =
            document.createElement("article");

        item.className =
            "upcoming-card";


        /*==================================
        DATE
        ==================================*/

        const date =
            event.date
                ? new Date(event.date)
                : null;

        const formattedDate =
            date &&
            !Number.isNaN(date.getTime())

                ? new Intl.DateTimeFormat(
                    "en-KE",
                    {
                        day: "numeric",
                        month: "short",
                        year: "numeric"
                    }
                ).format(date)

                : "Date TBA";


        /*==================================
        CARD
        ==================================*/

        item.innerHTML = `

            <div class="upcoming-image">

                <img
                    src="${escapeHtml(
                        event.image || "/images/default-event.jpg"
                    )}"
                    alt="${escapeHtml(
                        event.title || "Experience"
                    )}"
                >

                <span class="upcoming-date">
                    ${formattedDate}
                </span>

            </div>


            <div class="upcoming-info">

                <span class="upcoming-theme">
                    ${escapeHtml(
                        event.theme || ""
                    )}
                </span>

                <h3>
                    ${escapeHtml(
                        event.title ||
                        "Untitled Experience"
                    )}
                </h3>

                <div class="upcoming-meta">

                    <span>
                        ${escapeHtml(
                            event.location ||
                            "Location TBA"
                        )}
                    </span>

                </div>

            </div>


            <div class="upcoming-status">

                <span class="status-dot"></span>

                <span>
                    ${escapeHtml(
                        event.status || "upcoming"
                    )}
                </span>

            </div>

        `;


        upcomingList.appendChild(item);

    });

}

/*==================================
HTML ESCAPE
==================================*/

function escapeHtml(value) {

    return String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}


/*==================================
LOAD DASHBOARD
==================================*/

if (
    getCurrentPageRoute() ===
    "/admin"
) {

    loadAdminDashboard();

}

})(window, document);
