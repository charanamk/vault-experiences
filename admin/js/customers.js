"use strict";

/*==================================
VAULT CUSTOMERS
FRONTEND MODULE

Responsibilities:
- Customer search UI
- Customer detail panel
- Customer history rendering
- Customer panel state

Backend responsibility:
- Provide customer records
- Provide customer statistics
- Provide customer booking/ticket history
- Handle persistent customer data

No API endpoint is assumed yet.
==================================*/


/*==================================
DOM
==================================*/

const customerSearch =
    document.getElementById(
        "customerSearch"
    );

const customerList =
    document.getElementById(
        "customerList"
    );

const customerDetails =
    document.getElementById(
        "customerDetails"
    );

const customerDetailsOverlay =
    document.getElementById(
        "customerDetailsOverlay"
    );

const customerDetailsClose =
    document.getElementById(
        "customerDetailsClose"
    );


/*==================================
DETAIL ELEMENTS
==================================*/

const detailsCustomerName =
    document.getElementById(
        "detailsCustomerName"
    );

const detailsCustomerAvatar =
    document.getElementById(
        "detailsCustomerAvatar"
    );

const detailsCustomerEmail =
    document.getElementById(
        "detailsCustomerEmail"
    );

const detailsCustomerPhone =
    document.getElementById(
        "detailsCustomerPhone"
    );

const detailsTickets =
    document.getElementById(
        "detailsTickets"
    );

const detailsSpend =
    document.getElementById(
        "detailsSpend"
    );

const customerHistory =
    document.getElementById(
        "customerHistory"
    );


/*==================================
MODULE STATE
==================================*/

const customerState = {

    customers: [],

    selectedCustomer: null,

    search: "",

    loading: false,

    error: null

};


/*==================================
FORMAT CURRENCY
==================================*/

function formatCurrency(
    value
){

    const amount =
        Number(value);


    if(
        !Number.isFinite(amount)
    ){

        return "KSh 0";

    }


    return new Intl.NumberFormat(
        "en-KE",
        {
            style: "currency",
            currency: "KES",
            maximumFractionDigits: 0
        }
    ).format(amount);

}


/*==================================
SET LOADING
==================================*/

function setLoading(
    loading
){

    customerState.loading =
        loading;


    document.body.classList.toggle(
        "customers-loading",
        loading
    );

}


/*==================================
SET ERROR
==================================*/

function setError(
    error
){

    customerState.error =
        error;


    document.body.classList.toggle(
        "customers-error",
        Boolean(error)
    );

}


/*==================================
NORMALIZE CUSTOMER
==================================*/

/*
    Keeps malformed backend data
    from breaking the interface.

    This does NOT invent customer
    information.
*/

function normalizeCustomer(
    customer
){

    if(
        !customer ||
        typeof customer !== "object"
    ){

        return null;

    }


    return {

        id:
            customer.id ?? null,

        name:
            customer.name ?? "Unknown Customer",

        email:
            customer.email ?? "—",

        phone:
            customer.phone ?? "—",

        tickets:
            Number(
                customer.tickets ?? 0
            ),

        spend:
            Number(
                customer.spend ?? 0
            ),

        avatar:
            customer.avatar ??
            (
                customer.name
                    ? customer.name
                        .charAt(0)
                        .toUpperCase()
                    : "?"
            ),

        history:
            Array.isArray(
                customer.history
            )
                ? customer.history
                : []

    };

}


/*==================================
OPEN CUSTOMER
==================================*/

function openCustomer(
    customer
){

    const normalized =
        normalizeCustomer(
            customer
        );


    if(!normalized){

        console.error(
            "VAULT CUSTOMERS: Invalid customer."
        );

        return;

    }


    customerState.selectedCustomer =
        normalized;


    /*--------------------------------
    PROFILE
    --------------------------------*/

    if(detailsCustomerName){

        detailsCustomerName.textContent =
            normalized.name;

    }


    if(detailsCustomerAvatar){

        detailsCustomerAvatar.textContent =
            normalized.avatar;

    }


    if(detailsCustomerEmail){

        detailsCustomerEmail.textContent =
            normalized.email;

    }


    if(detailsCustomerPhone){

        detailsCustomerPhone.textContent =
            normalized.phone;

    }


    /*--------------------------------
    STATS
    --------------------------------*/

    if(detailsTickets){

        detailsTickets.textContent =
            normalized.tickets.toLocaleString(
                "en-KE"
            );

    }


    if(detailsSpend){

        detailsSpend.textContent =
            formatCurrency(
                normalized.spend
            );

    }


    /*--------------------------------
    HISTORY
    --------------------------------*/

    renderHistory(
        normalized.history
    );


    /*--------------------------------
    OPEN PANEL
    --------------------------------*/

    if(customerDetails){

        customerDetails.classList.add(
            "is-open"
        );

        customerDetails.setAttribute(
            "aria-hidden",
            "false"
        );

    }


    if(customerDetailsOverlay){

        customerDetailsOverlay.classList.add(
            "is-visible"
        );

    }


    document.body.classList.add(
        "customer-details-open"
    );

}


/*==================================
RENDER HISTORY
==================================*/

function renderHistory(
    history
){

    if(!customerHistory){

        return;

    }


    customerHistory.innerHTML =
        "";


    if(
        !Array.isArray(history) ||
        history.length === 0
    ){

        customerHistory.innerHTML = `

            <div class="customer-history-item">

                <div>

                    <strong>
                        No experiences yet
                    </strong>

                    <span>
                        No ticket history available.
                    </span>

                </div>

            </div>

        `;

        return;

    }


    history.forEach(
        item => {

            const historyItem =
                document.createElement(
                    "div"
                );


            historyItem.className =
                "customer-history-item";


            const information =
                document.createElement(
                    "div"
                );


            const eventName =
                document.createElement(
                    "strong"
                );


            eventName.textContent =
                item.event ?? "Unknown Experience";


            const ticketInformation =
                document.createElement(
                    "span"
                );


            ticketInformation.textContent =
                item.ticket ?? "—";


            const date =
                document.createElement(
                    "time"
                );


            date.textContent =
                item.date ?? "—";


            information.appendChild(
                eventName
            );

            information.appendChild(
                ticketInformation
            );


            historyItem.appendChild(
                information
            );

            historyItem.appendChild(
                date
            );


            customerHistory.appendChild(
                historyItem
            );

        }
    );

}


/*==================================
CLOSE CUSTOMER
==================================*/

function closeCustomer(){

    customerState.selectedCustomer =
        null;


    if(customerDetails){

        customerDetails.classList.remove(
            "is-open"
        );

        customerDetails.setAttribute(
            "aria-hidden",
            "true"
        );

    }


    if(customerDetailsOverlay){

        customerDetailsOverlay.classList.remove(
            "is-visible"
        );

    }


    document.body.classList.remove(
        "customer-details-open"
    );

}


/*==================================
CUSTOMER CARD SEARCH
==================================*/

function filterCustomerCards(
    search
){

    if(!customerList){

        return;

    }


    const cards =
        customerList.querySelectorAll(
            ".customer-card"
        );


    cards.forEach(
        card => {

            const text =
                card.textContent
                    .toLowerCase();


            const matches =
                !search ||
                text.includes(
                    search
                );


            card.hidden =
                !matches;

        }
    );

}


/*==================================
SEARCH
==================================*/

if(customerSearch){

    customerSearch.addEventListener(
        "input",
        () => {

            const search =
                customerSearch.value
                    .trim()
                    .toLowerCase();


            customerState.search =
                search;


            /*
                Current frontend behavior:
                filter cards already rendered
                on the page.

                Later, when the backend/API
                exists, this can become:

                    VaultCustomers.search(value)

                with server-side querying.
            */

            filterCustomerCards(
                search
            );

        }
    );

}


/*==================================
VIEW CUSTOMER
==================================*/

if(customerList){

    customerList.addEventListener(
        "click",
        event => {

            const button =
                event.target.closest(
                    ".customer-view-btn"
                );


            if(!button){

                return;

            }


            /*
                The HTML card should expose
                a customer identifier:

                    data-customer-id="..."

                We do not fabricate the
                customer's data here.
            */

            const customerId =
                button.dataset.customerId ||
                button.dataset.customer;


            if(!customerId){

                console.error(
                    "VAULT CUSTOMERS: Customer ID missing."
                );

                return;

            }


            /*
                Until the API layer exists,
                the module expects customer
                data to be supplied through
                VaultCustomers.setData().
            */

            const customer =
                customerState.customers.find(
                    item =>
                        String(item.id) ===
                        String(customerId)
                );


            if(!customer){

                console.error(
                    "VAULT CUSTOMERS: Customer not loaded.",
                    customerId
                );

                return;

            }


            openCustomer(
                customer
            );

        }
    );

}


/*==================================
CLOSE BUTTON
==================================*/

if(customerDetailsClose){

    customerDetailsClose.addEventListener(
        "click",
        closeCustomer
    );

}


/*==================================
OVERLAY
==================================*/

if(customerDetailsOverlay){

    customerDetailsOverlay.addEventListener(
        "click",
        closeCustomer
    );

}


/*==================================
ESCAPE KEY
==================================*/

document.addEventListener(
    "keydown",
    event => {

        if(
            event.key === "Escape" &&
            customerDetails &&
            customerDetails.classList.contains(
                "is-open"
            )
        ){

            closeCustomer();

        }

    }
);


/*==================================
SET CUSTOMER DATA
==================================*/

/*
    Backend/API integration point.

    Expected input:

    [
        {
            id: "customer-001",
            name: "Customer Name",
            email: "...",
            phone: "...",
            tickets: 3,
            spend: 7500,
            avatar: "C",
            history: [...]
        }
    ]

    The backend contract will be
    finalized when we build the API.
*/

function setCustomerData(
    customers
){

    if(
        !Array.isArray(customers)
    ){

        setError(
            "Invalid customer data."
        );

        return;

    }


    customerState.customers =
        customers
            .map(
                normalizeCustomer
            )
            .filter(
                Boolean
            );


    customerState.error =
        null;


    setError(
        null
    );


    /*
        If customer cards are rendered
        server-side or by another module,
        this function does not duplicate
        that responsibility.
    */

}


/*==================================
PUBLIC API
==================================*/

window.VaultCustomers = {

    open:
        openCustomer,

    close:
        closeCustomer,

    setData:
        setCustomerData,

    getState:
        () => ({
            ...customerState,

            customers: [
                ...customerState.customers
            ]
        })

};


/*==================================
READY
==================================*/

console.log(
    "VAULT CUSTOMERS MODULE READY"
);