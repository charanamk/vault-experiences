"use strict";

(function (window, document) {

    if (window.VaultApp) {
        return;
    }


    /*==================================
    ROUTES
    ==================================*/

    const routes = {
        home: "home.html",
        login: "login.html",
        "my-vault": "My-Vault.html"
    };


    /*==================================
    LOADED STYLES
    ==================================*/

    const loadedStyles = new Set(
        [
            ...document.querySelectorAll(
                'link[rel="stylesheet"]'
            )
        ].map(
            link =>
                new URL(
                    link.href,
                    window.location.href
                ).href
        )
    );


    /*==================================
    HELPERS
    ==================================*/

    function normalizeRoute(route) {

        if (!route) {
            return "home";
        }

        return String(route)
            .trim()
            .toLowerCase();
    }


    function getCurrentPageFile() {

        const path =
            window.location.pathname
                .split("/")
                .pop() ||
            "home.html";

        return path.toLowerCase();
    }


    function updateActiveRoute(route) {

        const normalized =
            normalizeRoute(route);

        document
            .querySelectorAll("[data-route]")
            .forEach(trigger => {

                const isActive =
                    normalizeRoute(
                        trigger.dataset.route
                    ) === normalized;


                trigger.classList.toggle(
                    "active",
                    isActive
                );


                if (
                    trigger.tagName === "BUTTON"
                ) {

                    trigger.setAttribute(
                        "aria-current",
                        isActive
                            ? "page"
                            : "false"
                    );

                }

            });

    }


    /*==================================
    STYLES
    ==================================*/

    function addRouteStyles(page) {

        page
            .querySelectorAll(
                'link[rel="stylesheet"]'
            )
            .forEach(link => {

                const href =
                    new URL(
                        link.getAttribute("href"),
                        window.location.href
                    ).href;


                if (
                    loadedStyles.has(href)
                ) {
                    return;
                }


                const style =
                    document.createElement("link");

                style.rel =
                    "stylesheet";

                style.href =
                    href;


                document.head.appendChild(
                    style
                );

                loadedStyles.add(href);

            });

    }


    /*==================================
    SCRIPT LOADER
    ==================================*/

    function loadScript(src) {

        return new Promise(
            (resolve, reject) => {

                const absoluteSrc =
                    new URL(
                        src,
                        window.location.href
                    ).href;


                /*
                 * Do not load the same script
                 * twice.
                 */

                const existing =
                    document.querySelector(
                        `script[src="${absoluteSrc}"]`
                    );


                if (existing) {

                    resolve();

                    return;

                }


                const script =
                    document.createElement("script");

                script.src =
                    absoluteSrc;

                script.onload =
                    resolve;

                script.onerror =
                    reject;


                document.body.appendChild(
                    script
                );

            }
        );

    }


    /*==================================
    ROUTE SCRIPTS
    ==================================*/

    async function runRouteScripts(page) {

        const scripts =
            [
                ...page.querySelectorAll(
                    "script[src]"
                )
            ]
            .map(
                script =>
                    script.getAttribute("src")
            )
            .filter(Boolean)
            .filter(
                src =>
                    !src.endsWith(
                        "/js/app-navigation.js"
                    )
            );


        for (const src of scripts) {

            await loadScript(src);

        }

    }


    /*==================================
    TICKET MODULE
    ==================================*/

    async function loadTicketModule() {

        /*
         * If the ticket module already exists,
         * there is nothing to do.
         */

        if (
            document.getElementById(
                "ticketModule"
            )
        ) {

            /*
             * Make sure the script exists too.
             */

            if (
                !window.VaultTicket
            ) {

                await loadScript(
                    "js/vault-ticket.js"
                );

            }

            return;

        }


        /*
         * Ticket module lives in home.html.
         * Fetch the existing home page and
         * extract ONLY the ticket module.
         */

        const response =
            await fetch(
                "home.html",
                {
                    headers: {
                        "X-Requested-With":
                            "VAULT"
                    }
                }
            );


        if (!response.ok) {

            throw new Error(
                "Unable to load VAULT ticket module."
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


        const ticketModule =
            page.getElementById(
                "ticketModule"
            );


        if (!ticketModule) {

            throw new Error(
                "ticketModule was not found in home.html."
            );

        }


        /*
         * Add the existing module to the
         * current page.
         */

        document.body.appendChild(
            ticketModule
        );


        /*
         * Load the existing ticket styles.
         */

        const ticketStyles =
            page.querySelectorAll(
                'link[rel="stylesheet"]'
            );


        ticketStyles.forEach(link => {

            const href =
                link.getAttribute("href");


            if (
                !href ||
                !href.includes(
                    "vault-ticket.css"
                )
            ) {

                return;

            }


            const absoluteHref =
                new URL(
                    href,
                    window.location.href
                ).href;


            if (
                loadedStyles.has(
                    absoluteHref
                )
            ) {

                return;

            }


            const style =
                document.createElement("link");

            style.rel =
                "stylesheet";

            style.href =
                absoluteHref;


            document.head.appendChild(
                style
            );

            loadedStyles.add(
                absoluteHref
            );

        });


        /*
         * Now load the ticket JavaScript.
         */

        await loadScript(
            "js/vault-ticket.js"
        );

    }


    /*==================================
    NAVIGATION
    ==================================*/

    async function navigate(
        route,
        options = {}
    ) {

        const routeKey =
            normalizeRoute(route);


        const path =
            routes[routeKey] ||
            route;


        if (!path) {

            return;

        }


        const currentFile =
            getCurrentPageFile();


        const targetFile =
            path.toLowerCase();


        if (
            !options.fromHistory &&
            currentFile === targetFile
        ) {

            updateActiveRoute(
                routeKey
            );

            return;

        }


        const response =
            await fetch(
                path,
                {
                    headers: {
                        "X-Requested-With":
                            "VAULT"
                    }
                }
            );


        if (!response.ok) {

            window.location.assign(
                path
            );

            return;

        }


        const page =
            new DOMParser()
                .parseFromString(
                    await response.text(),
                    "text/html"
                );


        /*
         * Load CSS before replacing the page.
         */

        addRouteStyles(
            page
        );


        document.title =
            page.title ||
            "VAULT";


        /*
         * Replace current page content.
         */

        document.body.innerHTML =
            page.body.innerHTML;


        /*
         * My Vault needs the existing
         * ticket module from home.html.
         */

        if (
            routeKey === "my-vault"
        ) {

            await loadTicketModule();

        }


        /*
         * Now execute the scripts belonging
         * to the newly loaded page.
         */

        await runRouteScripts(
            page
        );


        updateActiveRoute(
            routeKey
        );


        if (
            !options.fromHistory
        ) {

            window.history.pushState(
                {
                    route: routeKey
                },
                "",
                path
            );

        }


        window.scrollTo(
            0,
            0
        );

    }


    /*==================================
    ROUTE CLICK
    ==================================*/

    document.addEventListener(
        "click",
        event => {

            const trigger =
                event.target.closest(
                    "[data-route]"
                );


            if (
                !trigger ||
                event.metaKey ||
                event.ctrlKey ||
                event.shiftKey
            ) {

                return;

            }


            const route =
                trigger.dataset.route;


            if (
                !routes[
                    normalizeRoute(route)
                ]
            ) {

                return;

            }


            event.preventDefault();


            navigate(
                route
            ).catch(
                () => {

                    window.location.assign(
                        routes[
                            normalizeRoute(route)
                        ]
                    );

                }
            );

        }
    );


    /*==================================
    BROWSER BACK / FORWARD
    ==================================*/

    window.addEventListener(
        "popstate",
        () => {

            const file =
                getCurrentPageFile();


            const route =
                Object.keys(routes)
                    .find(
                        key =>
                            routes[key]
                                .toLowerCase() ===
                            file
                    );


            if (route) {

                navigate(
                    route,
                    {
                        fromHistory: true
                    }
                );

            }

        }
    );


    /*==================================
    INITIAL ROUTE
    ==================================*/

    const initialRoute =
        Object.keys(routes)
            .find(
                key =>
                    routes[key]
                        .toLowerCase() ===
                    getCurrentPageFile()
            );


    if (initialRoute) {

        updateActiveRoute(
            initialRoute
        );

    }

/*==================================
BOTTOM NAVIGATION AUTO-HIDE
==================================*/

let bottomNavHideTimer = null;
let lastScrollY = window.scrollY;
let navScrollTicking = false;

function getBottomNav() {
    return document.querySelector(".bottom-nav");
}

function showBottomNav() {
    const nav = getBottomNav();

    if (!nav) {
        return;
    }

    nav.classList.remove("nav-hidden");

    clearTimeout(bottomNavHideTimer);

    bottomNavHideTimer = setTimeout(() => {
        hideBottomNav();
    }, 3000);
}

function hideBottomNav() {
    const nav = getBottomNav();

    if (!nav) {
        return;
    }

    nav.classList.add("nav-hidden");
}

function handleBottomNavScroll() {
    const currentScrollY = window.scrollY;
    const maxScrollY =
        document.documentElement.scrollHeight -
        window.innerHeight;

    const atBottom =
        currentScrollY >= maxScrollY - 4;

    if (atBottom) {
        showBottomNav();
        lastScrollY = currentScrollY;
        return;
    }

    if (currentScrollY < lastScrollY) {
        // Scrolling upward → show
        showBottomNav();
    } else if (currentScrollY > lastScrollY) {
        // Scrolling downward → hide
        hideBottomNav();
    }

    lastScrollY = currentScrollY;
}

window.addEventListener(
    "scroll",
    () => {

        if (navScrollTicking) {
            return;
        }

        navScrollTicking = true;

        window.requestAnimationFrame(() => {
            handleBottomNavScroll();
            navScrollTicking = false;
        });

    },
    {
        passive: true
    }
);

window.addEventListener(
    "resize",
    () => {
        lastScrollY = window.scrollY;
    },
    {
        passive: true
    }
);

showBottomNav();

    /*==================================
    PUBLIC API
    ==================================*/

    window.VaultApp = {

        navigate,

        routes

    };


})(window, document);