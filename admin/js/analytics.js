"use strict";

/*==================================
VAULT ANALYTICS
FRONTEND MODULE

Responsibilities:
- Handle analytics period selection
- Render analytics data
- Expose a public analytics API

Backend responsibility:
- Provide real analytics data
- Calculate totals and metrics
- Return chart data for the requested period

IMPORTANT:
No backend endpoint is assumed here.
==================================*/


/*==================================
DOM
==================================*/

const periodButtons =
    document.querySelectorAll(
        ".analytics-period-btn"
    );

const analyticsBars =
    document.querySelectorAll(
        ".analytics-bar"
    );

const analyticsRevenue =
    document.getElementById(
        "analyticsRevenue"
    );

const analyticsTickets =
    document.getElementById(
        "analyticsTickets"
    );

const analyticsBookings =
    document.getElementById(
        "analyticsBookings"
    );

const analyticsCustomers =
    document.getElementById(
        "analyticsCustomers"
    );

const analyticsChartTotal =
    document.getElementById(
        "analyticsChartTotal"
    );


/*==================================
MODULE STATE
==================================*/

const analyticsState = {

    period: "7",

    data: null,

    loading: false,

    error: null

};


/*==================================
FORMAT CURRENCY
==================================*/

/*
    The backend should ideally return
    numeric revenue.

    Formatting belongs to the frontend.

    Example backend value:

        284500

    Frontend displays:

        KSh 284,500
*/

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
UPDATE MAIN STATS
==================================*/

function updateStats(
    data
){

    if(!data){

        return;

    }


    /*--------------------------------
    REVENUE
    --------------------------------*/

    if(analyticsRevenue){

        analyticsRevenue.textContent =
            formatCurrency(
                data.revenue
            );

    }


    /*--------------------------------
    TICKETS
    --------------------------------*/

    if(analyticsTickets){

        analyticsTickets.textContent =
            Number(
                data.tickets || 0
            ).toLocaleString(
                "en-KE"
            );

    }


    /*--------------------------------
    BOOKINGS
    --------------------------------*/

    if(analyticsBookings){

        analyticsBookings.textContent =
            Number(
                data.bookings || 0
            ).toLocaleString(
                "en-KE"
            );

    }


    /*--------------------------------
    CUSTOMERS
    --------------------------------*/

    if(analyticsCustomers){

        analyticsCustomers.textContent =
            Number(
                data.customers || 0
            ).toLocaleString(
                "en-KE"
            );

    }


    /*--------------------------------
    CHART TOTAL
    --------------------------------*/

    if(analyticsChartTotal){

        analyticsChartTotal.textContent =
            formatCurrency(
                data.revenue
            );

    }

}


/*==================================
UPDATE CHART
==================================*/

function updateChart(
    bars
){

    if(
        !Array.isArray(bars)
    ){

        return;

    }


    analyticsBars.forEach(
        (
            bar,
            index
        ) => {

            const value =
                Number(
                    bars[index] || 0
                );


            const barElement =
                bar.querySelector(
                    "span"
                );


            if(!barElement){

                return;

            }


            /*
                Clamp value between
                0 and 100 so malformed
                backend data cannot break
                the visual chart.
            */

            const height =
                Math.min(
                    100,
                    Math.max(
                        0,
                        value
                    )
                );


            barElement.style.height =
                `${height}%`;

        }
    );

}


/*==================================
RENDER ANALYTICS
==================================*/

function renderAnalytics(
    data
){

    if(!data){

        return;

    }


    updateStats(
        data
    );


    updateChart(
        data.bars
    );

}


/*==================================
SET LOADING STATE
==================================*/

function setLoading(
    loading
){

    analyticsState.loading =
        loading;


    document.body.classList.toggle(
        "analytics-loading",
        loading
    );

}


/*==================================
SET ERROR
==================================*/

function setError(
    error
){

    analyticsState.error =
        error;


    document.body.classList.toggle(
        "analytics-error",
        Boolean(error)
    );

}


/*==================================
RECEIVE ANALYTICS DATA
==================================*/

/*
    This function is the bridge between
    the future backend and this module.

    The backend/API layer can eventually
    call:

        VaultAnalytics.setData(data)

    Example expected structure:

    {
        revenue: 284500,
        tickets: 186,
        bookings: 74,
        customers: 61,

        bars: [
            42,
            67,
            51,
            84,
            72,
            96,
            63
        ]
    }
*/

function setAnalyticsData(
    data
){

    if(
        !data ||
        typeof data !== "object"
    ){

        setError(
            "Invalid analytics data."
        );

        return;

    }


    analyticsState.data =
        data;

    analyticsState.error =
        null;


    setError(
        null
    );


    renderAnalytics(
        data
    );

}


/*==================================
LOAD ANALYTICS
==================================*/

/*
    Intentionally left backend-neutral.

    DO NOT add a guessed endpoint here.

    Once the backend contract exists,
    this function can call the actual
    API service.

    Example future flow:

        const data =
            await VaultAPI.analytics(
                period
            );

        setAnalyticsData(data);
*/

async function loadAnalytics(
    period
){

    analyticsState.period =
        period;


    setLoading(
        true
    );

    setError(
        null
    );


    /*
        Backend integration intentionally
        not implemented yet.

        We do NOT fabricate an endpoint.
    */

    setLoading(
        false
    );

}


/*==================================
PERIOD BUTTONS
==================================*/

periodButtons.forEach(
    button => {

        button.addEventListener(
            "click",
            () => {

                const period =
                    button.dataset.period;


                if(!period){

                    return;

                }


                /*--------------------------
                ACTIVE STATE
                --------------------------*/

                periodButtons.forEach(
                    item => {

                        item.classList.remove(
                            "active"
                        );

                    }
                );


                button.classList.add(
                    "active"
                );


                /*--------------------------
                LOAD PERIOD
                --------------------------*/

                loadAnalytics(
                    period
                );

            }
        );

    }
);


/*==================================
BAR HOVER
==================================*/

analyticsBars.forEach(
    bar => {

        const barElement =
            bar.querySelector(
                "span"
            );


        if(!barElement){

            return;

        }


        bar.addEventListener(
            "mouseenter",
            () => {

                barElement.style.opacity =
                    "1";

            }
        );


        bar.addEventListener(
            "mouseleave",
            () => {

                barElement.style.opacity =
                    ".85";

            }
        );

    }
);


/*==================================
PUBLIC API
==================================*/

window.VaultAnalytics = {

    load:
        loadAnalytics,

    setData:
        setAnalyticsData,

    render:
        renderAnalytics,

    getState:
        () => ({
            ...analyticsState
        })

};


/*==================================
INITIAL STATE
==================================*/

loadAnalytics(
    "7"
);


/*==================================
READY
==================================*/

console.log(
    "VAULT ANALYTICS MODULE READY"
);