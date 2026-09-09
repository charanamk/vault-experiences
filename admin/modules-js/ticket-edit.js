"use strict";

/*==================================
VAULT TICKETS
==================================*/


/*==================================
DOM
==================================*/

const ticketEditor =
    document.getElementById(
        "ticketEditor"
    );

const ticketEditorOverlay =
    document.getElementById(
        "ticketEditorOverlay"
    );

const ticketEditorClose =
    document.getElementById(
        "ticketEditorClose"
    );

const ticketEditorCancel =
    document.getElementById(
        "ticketEditorCancel"
    );

const ticketEditorForm =
    document.getElementById(
        "ticketEditorForm"
    );

const ticketEditorTitle =
    document.getElementById(
        "ticketEditorTitle"
    );

const editTicketName =
    document.getElementById(
        "editTicketName"
    );

const editTicketPrice =
    document.getElementById(
        "editTicketPrice"
    );

const editTicketCapacity =
    document.getElementById(
        "editTicketCapacity"
    );

const editTicketSold =
    document.getElementById(
        "editTicketSold"
    );

const editTicketRemaining =
    document.getElementById(
        "editTicketRemaining"
    );

const editTicketAvailable =
    document.getElementById(
        "editTicketAvailable"
    );

const ticketsEventSelect =
    document.getElementById(
        "ticketsEventSelect"
    );


/*==================================
STATE
==================================*/

let currentTicketCard = null;

let currentTicketData = null;

let isCreating = false;

let onSaveCallback = null;

function openTicketEditorForCreate(eventId){

    if(!ticketEditor){
        return;
    }

    currentTicketCard = null;
    isCreating = true;

    // Default empty state for new ticket
    currentTicketData = {
        name: "",
        price: 0,
        capacity: 1,
        sold: 0,
        remaining: 1
    };

    if(ticketEditorTitle){
        ticketEditorTitle.textContent = "Add Ticket";
    }

    if(editTicketName){ editTicketName.value = ""; }
    if(editTicketPrice){ editTicketPrice.value = ""; }
    if(editTicketCapacity){ editTicketCapacity.value = "1"; }
    if(editTicketSold){ editTicketSold.textContent = "0"; }
    if(editTicketRemaining){ editTicketRemaining.textContent = "1"; }
    if(editTicketAvailable){ editTicketAvailable.checked = true; }

    const editEventId = document.getElementById("editTicketEventId");
    if(editEventId) editEventId.value = eventId || "";

    ticketEditor.classList.add("is-open");
    ticketEditor.setAttribute("aria-hidden","false");
    document.body.classList.add("ticket-editor-open");

    setTimeout(() => { if(editTicketName) editTicketName.focus(); }, 250);

}


/*==================================
OPEN EDITOR
==================================*/

function openTicketEditor(ticketCard){

    if(!ticketEditor){

        return;

    }


    currentTicketCard =
        ticketCard;

    const ticketId =
        ticketCard.dataset.ticketId || "";

    if (!ticketId) {
        console.warn("VAULT: Ticket card has no ticket ID.");
    }


    /*----------------------------------
    GET DATA FROM CARD
    ----------------------------------*/

    const name =
        ticketCard
        .querySelector(
            ".ticket-management-top h3"
        )
        ?.textContent
        .trim() || "";


    const price =
        ticketCard
        .querySelector(
            ".ticket-price strong"
        )
        ?.textContent
        .replace(
            /[^0-9.]/g,
            ""
        ) || "";


    const stats =
        ticketCard.querySelectorAll(
            ".ticket-sales-stats strong"
        );


    const capacity =
        stats[0]
        ?.textContent
        .trim() || "0";


    const sold =
        stats[1]
        ?.textContent
        .trim() || "0";


    const remaining =
        stats[2]
        ?.textContent
        .trim() || "0";


    /*----------------------------------
    SAVE CURRENT STATE
    ----------------------------------*/

    currentTicketData = {

        name:
            name,

        price:
            Number(price),

        capacity:
            Number(capacity),

        sold:
            Number(sold),

        remaining:
            Number(remaining)

    };


    /*----------------------------------
    POPULATE EDITOR
    ----------------------------------*/

    if(ticketEditorTitle){

        ticketEditorTitle.textContent =
            "Edit " + name;

    }


    if(editTicketName){

        editTicketName.value =
            name;

    }


    if(editTicketPrice){

        editTicketPrice.value =
            price;

    }


    if(editTicketCapacity){

        editTicketCapacity.value =
            capacity;

    }


    if(editTicketSold){

        editTicketSold.textContent =
            sold;

    }


    if(editTicketRemaining){

        editTicketRemaining.textContent =
            remaining;

    }


    if(editTicketAvailable){

        editTicketAvailable.checked =
            true;

    }


    /*----------------------------------
    OPEN
    ----------------------------------*/

    ticketEditor.classList.add(
        "is-open"
    );

    ticketEditor.setAttribute(
        "aria-hidden",
        "false"
    );

    document.body.classList.add(
        "ticket-editor-open"
    );


    /*----------------------------------
    FOCUS
    ----------------------------------*/

    setTimeout(
        () => {

            if(editTicketName){

                editTicketName.focus();

            }

        },
        250
    );

}


/*==================================
CLOSE EDITOR
==================================*/

function closeTicketEditor(){

    if(!ticketEditor){

        return;

    }


    ticketEditor.classList.remove(
        "is-open"
    );

    ticketEditor.setAttribute(
        "aria-hidden",
        "true"
    );

    document.body.classList.remove(
        "ticket-editor-open"
    );


    currentTicketCard =
        null;

    currentTicketData =
        null;

}


/*==================================
EDIT BUTTONS
==================================*/

const editButtons =
    document.querySelectorAll(
        ".ticket-edit-btn"
    );


editButtons.forEach(
    button => {

        button.addEventListener(
            "click",
            () => {

                const card =
                    button.closest(
                        ".ticket-management-card"
                    );


                if(!card){

                    return;

                }


                openTicketEditor(
                    card
                );

            }
        );

    }
);


/*==================================
PRICE FORMAT
==================================*/

function formatPrice(value){

    return (
        "KSh " +
        Number(value)
        .toLocaleString(
            "en-KE"
        )
    );

}


/*==================================
UPDATE REMAINING
==================================*/

function updateRemaining(){

    if(
        !editTicketCapacity ||
        !editTicketSold ||
        !editTicketRemaining
    ){

        return;

    }


    const capacity =
        Number(
            editTicketCapacity.value
        ) || 0;


    const sold =
        Number(
            editTicketSold.textContent
        ) || 0;


    const remaining =
        Math.max(
            capacity - sold,
            0
        );


    editTicketRemaining.textContent =
        remaining;

}


/*==================================
CAPACITY CHANGE
==================================*/

if(editTicketCapacity){

    editTicketCapacity.addEventListener(
        "input",
        updateRemaining
    );

}


/*==================================
SAVE CHANGES
==================================*/

if(ticketEditorForm){

    ticketEditorForm.addEventListener(
        "submit",
        async event => {

            event.preventDefault();




            const name =
                editTicketName
                ?.value
                .trim();


            const price =
                Number(
                    editTicketPrice
                    ?.value
                ) || 0;


            const capacity =
                Number(
                    editTicketCapacity
                    ?.value
                ) || 0;


            const sold =
                Number(
                    editTicketSold
                    ?.textContent
                ) || 0;


            /*----------------------------------
            VALIDATION
            ----------------------------------*/

            if(!name){

                alert(
                    "Please enter a ticket name."
                );

                return;

            }


            if(price < 0){

                alert(
                    "Ticket price cannot be negative."
                );

                return;

            }


            if(capacity < sold){

                alert(
                    "Capacity cannot be lower than tickets already sold."
                );

                return;

            }


            /*----------------------------------
            CALCULATE REMAINING
            ----------------------------------*/

            const remaining =
                capacity - sold;


            /*----------------------------------
            UPDATE CARD (EDIT OR CREATE)
            ----------------------------------*/

            if(currentTicketCard){

                const ticketId =
                    currentTicketCard.dataset.ticketId || "";

                if(!ticketId){

                    alert(
                        "Unable to identify this ticket."
                    );

                    return;

                }

                if(
                    !window.VaultTickets ||
                    typeof window.VaultTickets.saveEditedTicket !==
                        "function"
                ){

                    alert(
                        "Ticket update service is unavailable."
                    );

                    return;

                }

                const saved =
                    await window.VaultTickets.saveEditedTicket(
                        ticketId,
                        {
                            name:
                                name,

                            price:
                                price,

                            capacity:
                                capacity,

                            sold:
                                sold,

                            description:
                                currentTicketData?.description ||
                                ""
                        }
                    );

                if(saved === false){

                    return;

                }

                const cardName =
                    currentTicketCard.querySelector(
                        ".ticket-management-top h3"
                    );


                const cardPrice =
                    currentTicketCard.querySelector(
                        ".ticket-price strong"
                    );


                const cardStats =
                    currentTicketCard.querySelectorAll(
                        ".ticket-sales-stats strong"
                    );


                const progressBar =
                    currentTicketCard.querySelector(
                        ".ticket-progress-bar"
                    );


                const progressValue =
                    currentTicketCard.querySelector(
                        ".ticket-progress-label strong"
                    );


                if(cardName){

                    cardName.textContent =
                        name;

                }


                if(cardPrice){

                    cardPrice.textContent =
                        formatPrice(
                            price
                        );

                }


                if(cardStats[0]){

                    cardStats[0].textContent =
                        capacity;

                }


                if(cardStats[2]){

                    cardStats[2].textContent =
                        remaining;

                }


                /*----------------------------------
                UPDATE PROGRESS
                ----------------------------------*/

                const percentage =
                    capacity > 0
                    ? Math.round(
                        (sold / capacity) * 100
                    )
                    : 0;


                if(progressBar){

                    progressBar.style.width =
                        percentage + "%";

                }


                if(progressValue){

                    progressValue.textContent =
                        percentage + "%";

                }

            } else {

                // Creating a new ticket â€” notify registered callback so the host can render it
                const newTicketData = {
                    name: name,
                    price: price,
                    capacity: capacity,
                    sold: sold,
                    remaining: remaining,
                    available: editTicketAvailable?.checked ?? true,
                    eventId: document.getElementById('editTicketEventId')?.value || ''
                };

                if(typeof onSaveCallback === 'function'){
                    try{ onSaveCallback(newTicketData); } catch(e){ console.error(e); }
                }

            }


            /*----------------------------------
            UPDATE EVENT TOTALS
            ----------------------------------*/

            updateEventOverview();


            /*----------------------------------
            CLOSE
            ----------------------------------*/

            closeTicketEditor();

        }
    );

}


/*==================================
EVENT OVERVIEW
==================================*/

function updateEventOverview(){

    const cards =
        document.querySelectorAll(
            ".ticket-management-card"
        );


    let totalCapacity = 0;

    let totalSold = 0;


    cards.forEach(
        card => {

            const stats =
                card.querySelectorAll(
                    ".ticket-sales-stats strong"
                );


            totalCapacity +=
                Number(
                    stats[0]
                    ?.textContent
                ) || 0;


            totalSold +=
                Number(
                    stats[1]
                    ?.textContent
                ) || 0;

        }
    );


    const remaining =
        Math.max(
            totalCapacity - totalSold,
            0
        );


    const overview =
        document.querySelectorAll(
            ".ticket-overview-item strong"
        );


    if(overview[0]){

        overview[0].textContent =
            totalCapacity;

    }


    if(overview[1]){

        overview[1].textContent =
            totalSold;

    }


    if(overview[2]){

        overview[2].textContent =
            remaining;

    }

}


/*==================================
CLOSE EVENTS
==================================*/

if(ticketEditorClose){

    ticketEditorClose.addEventListener(
        "click",
        closeTicketEditor
    );

}


if(ticketEditorCancel){

    ticketEditorCancel.addEventListener(
        "click",
        closeTicketEditor
    );

}


if(ticketEditorOverlay){

    ticketEditorOverlay.addEventListener(
        "click",
        closeTicketEditor
    );

}


/*==================================
ESCAPE
==================================*/

document.addEventListener(
    "keydown",
    event => {

        if(
            event.key === "Escape" &&
            ticketEditor &&
            ticketEditor.classList.contains(
                "is-open"
            )
        ){

            closeTicketEditor();

        }

    }
);


/*==================================
EVENT SELECTOR
==================================*/

if(ticketsEventSelect){

    ticketsEventSelect.addEventListener(
        "change",
        event => {

            console.log(
                "Selected experience:",
                event.target.value
            );

            /*
            Backend later:

            Load the selected event's
            ticket categories here.
            */
        }
    );

}


/*==================================
INITIAL TOTALS
==================================*/

updateEventOverview();


/*==================================
PUBLIC API
==================================*/

window.VaultTickets = {

    openEditor:
        openTicketEditor,

    closeEditor:
        closeTicketEditor,

    openEditorForCreate:
        openTicketEditorForCreate,

    setOnSave:
        (cb) => { onSaveCallback = cb; },

    updateOverview:
        updateEventOverview

};


console.log(
    "VAULT TICKETS MODULE LOADED"
);


