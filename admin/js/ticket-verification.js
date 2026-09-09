"use strict";

/*==================================
VAULT TICKET VERIFICATION
==================================*/


/*==================================
DOM
==================================*/

const ticketReferenceInput =
    document.getElementById(
        "ticketReferenceInput"
    );

const verifyTicketBtn =
    document.getElementById(
        "verifyTicketBtn"
    );

const startScannerBtn =
    document.getElementById(
        "startScannerBtn"
    );

const verificationResult =
    document.getElementById(
        "verificationResult"
    );

const verificationResultIcon =
    document.getElementById(
        "verificationResultIcon"
    );

const verificationResultLabel =
    document.getElementById(
        "verificationResultLabel"
    );

const verificationResultTitle =
    document.getElementById(
        "verificationResultTitle"
    );

const verificationResultMessage =
    document.getElementById(
        "verificationResultMessage"
    );

const verifiedReference =
    document.getElementById(
        "verifiedReference"
    );

const verifiedEvent =
    document.getElementById(
        "verifiedEvent"
    );

const verifiedTicketType =
    document.getElementById(
        "verifiedTicketType"
    );

const verifiedQuantity =
    document.getElementById(
        "verifiedQuantity"
    );

const verifiedCustomer =
    document.getElementById(
        "verifiedCustomer"
    );

const verifiedTime =
    document.getElementById(
        "verifiedTime"
    );

const verificationReset =
    document.getElementById(
        "verificationReset"
    );

const verificationList =
    document.getElementById(
        "verificationList"
    );


/*==================================
STATE
==================================*/

let currentVerification = null;


/*==================================
TEMPORARY DEMO DATA
==================================*/

/*
    TEMPORARY ONLY.

    Later this object will be replaced
    by the backend/API.

    DO NOT BUILD PROJECT LOGIC AROUND
    THIS DATA.
*/

const demoTickets = {

    "VLT-8K2M4P7Q": {

        reference:
            "VLT-8K2M4P7Q",

        event:
            "Summer Solstice",

        ticketType:
            "General Admission",

        quantity:
            1,

        customer:
            "Guest",

        status:
            "unused"

    },


    "VLT-2M9K7A1C": {

        reference:
            "VLT-2M9K7A1C",

        event:
            "Summer Solstice",

        ticketType:
            "VIP",

        quantity:
            2,

        customer:
            "Guest",

        status:
            "unused"

    },


    "VLT-5X4P8N2L": {

        reference:
            "VLT-5X4P8N2L",

        event:
            "After Dark",

        ticketType:
            "General Admission",

        quantity:
            1,

        customer:
            "Guest",

        status:
            "used",

        verifiedAt:
            "7:31 PM"

    }

};


/*==================================
NORMALIZE REFERENCE
==================================*/

function normalizeReference(value){

    return value
        .trim()
        .toUpperCase()
        .replace(/\s+/g, "");

}


/*==================================
CURRENT TIME
==================================*/

function getCurrentTime(){

    return new Date()
        .toLocaleTimeString(
            "en-KE",
            {
                hour:
                    "numeric",

                minute:
                    "2-digit"
            }
        );

}


/*==================================
VERIFY TICKET
==================================*/

async function verifyTicket(referenceOverride = null){

    if(!ticketReferenceInput){
        return;
    }

    const reference =
        normalizeReference(
            referenceOverride !== null
                ? referenceOverride
                : ticketReferenceInput.value
        );

    if(!reference){
        showInvalidResult(
            "",
            "Please enter a ticket reference."
        );
        return;
    }

    try {

        const response =
            await fetch(
                `http://localhost:3000/api/tickets/${encodeURIComponent(reference)}/verify`,
                {
                    method: "POST"
                }
            );

        const result =
            await response.json().catch(
                () => ({})
            );

        if(response.ok){

            showValidResult(
                result.ticket
            );

            return;
        }

        if(
            response.status === 409 &&
            result.verification_status ===
                "already_used"
        ){

            showUsedResult(
                result.ticket
            );

            return;
        }

        showInvalidResult(
            reference,
            result.message ||
            "This ticket could not be verified."
        );

    } catch(error){

        console.error(
            "VAULT ticket verification failed:",
            error
        );

        showInvalidResult(
            reference,
            "Unable to connect to the verification server."
        );
    }
}
/*==================================
VALID RESULT
==================================*/

function showValidResult(ticket){

    currentVerification =
        ticket;


    if(verificationResult){

        verificationResult.classList.add(
            "is-visible"
        );

        verificationResult.classList.remove(
            "is-invalid",
            "is-used"
        );

    }


    if(verificationResultIcon){

        verificationResultIcon.textContent =
            "✓";

    }


    if(verificationResultLabel){

        verificationResultLabel.textContent =
            "TICKET VERIFIED";

    }


    if(verificationResultTitle){

        verificationResultTitle.textContent =
            "Entry Approved";

    }


    if(verificationResultMessage){

        verificationResultMessage.textContent =
            "This ticket is valid and ready for entry.";

    }


    populateTicketDetails(
        ticket
    );


    addVerificationActivity(
        ticket,
        "valid"
    );

}


/*==================================
USED RESULT
==================================*/

function showUsedResult(ticket){

    currentVerification =
        ticket;


    if(verificationResult){

        verificationResult.classList.add(
            "is-visible",
            "is-used"
        );

        verificationResult.classList.remove(
            "is-invalid"
        );

    }


    if(verificationResultIcon){

        verificationResultIcon.textContent =
            "!";

    }


    if(verificationResultLabel){

        verificationResultLabel.textContent =
            "ALREADY USED";

    }


    if(verificationResultTitle){

        verificationResultTitle.textContent =
            "Ticket Already Checked In";

    }


    if(verificationResultMessage){

        verificationResultMessage.textContent =
            ticket.verifiedAt
                ? `This ticket was already verified at ${ticket.verifiedAt}.`
                : "This ticket has already been used.";

    }


    populateTicketDetails(
        ticket
    );

}


/*==================================
INVALID RESULT
==================================*/

function showInvalidResult(
    reference,
    message
){

    currentVerification =
        null;


    if(verificationResult){

        verificationResult.classList.add(
            "is-visible",
            "is-invalid"
        );

        verificationResult.classList.remove(
            "is-used"
        );

    }


    if(verificationResultIcon){

        verificationResultIcon.textContent =
            "×";

    }


    if(verificationResultLabel){

        verificationResultLabel.textContent =
            "INVALID TICKET";

    }


    if(verificationResultTitle){

        verificationResultTitle.textContent =
            "Entry Denied";

    }


    if(verificationResultMessage){

        verificationResultMessage.textContent =
            message;

    }


    clearTicketDetails(
        reference
    );

}


/*==================================
POPULATE DETAILS
==================================*/

function populateTicketDetails(ticket){

    if(verifiedReference){
        verifiedReference.textContent =
            ticket.reference || "�";
    }

    if(verifiedEvent){
        verifiedEvent.textContent =
            ticket.event_id || "�";
    }

    if(verifiedTicketType){
        verifiedTicketType.textContent =
            ticket.ticket_type ||
            ticket.ticketType ||
            "�";
    }

    if(verifiedQuantity){
        verifiedQuantity.textContent =
            ticket.guests ?? "�";
    }

    if(verifiedCustomer){
        verifiedCustomer.textContent =
            ticket.attendee_name || "�";
    }

    if(verifiedTime){
        verifiedTime.textContent =
            ticket.verified_at
                ? new Date(ticket.verified_at).toLocaleString("en-KE")
                : "Not yet verified";
    }
}
/*==================================
CLEAR DETAILS
==================================*/

function clearTicketDetails(
    reference
){

    if(verifiedReference){

        verifiedReference.textContent =
            reference ||
            "—";

    }


    if(verifiedEvent){

        verifiedEvent.textContent =
            "—";

    }


    if(verifiedTicketType){

        verifiedTicketType.textContent =
            "—";

    }


    if(verifiedQuantity){

        verifiedQuantity.textContent =
            "—";

    }


    if(verifiedCustomer){

        verifiedCustomer.textContent =
            "—";

    }


    if(verifiedTime){

        verifiedTime.textContent =
            "—";

    }

}


/*==================================
ADD ACTIVITY
==================================*/

function addVerificationActivity(
    ticket,
    status
){

    if(!verificationList){

        return;

    }


    const entry =
        document.createElement(
            "article"
        );


    entry.className =
        `verification-entry ${status}`;


    entry.innerHTML = `

        <div class="verification-entry-status">

            <span>
                ✓
            </span>

        </div>


        <div class="verification-entry-info">

            <strong>
                ${ticket.reference}
            </strong>

            <span>
                ${ticket.event} · ${ticket.ticketType}
            </span>

        </div>


        <time>
            ${getCurrentTime()}
        </time>

    `;


    verificationList.prepend(
        entry
    );


    /*----------------------------------
    LIMIT ACTIVITY
    ----------------------------------*/

    const entries =
        verificationList.querySelectorAll(
            ".verification-entry"
        );


    if(entries.length > 10){

        entries[
            entries.length - 1
        ].remove();

    }

}


/*==================================
RESET
==================================*/

function resetVerification(){

    currentVerification =
        null;


    if(ticketReferenceInput){

        ticketReferenceInput.value =
            "";

        ticketReferenceInput.focus();

    }


    if(verificationResult){

        verificationResult.classList.remove(
            "is-visible",
            "is-invalid",
            "is-used"
        );

    }

}


/*==================================
VERIFY BUTTON
==================================*/

if(verifyTicketBtn){

    verifyTicketBtn.addEventListener(
        "click",
        verifyTicket
    );

}


/*==================================
ENTER KEY
==================================*/

if(ticketReferenceInput){

    ticketReferenceInput.addEventListener(
        "keydown",
        event => {

            if(
                event.key ===
                "Enter"
            ){

                event.preventDefault();

                verifyTicket();

            }

        }
    );

}


/*==================================
RESET BUTTON
==================================*/

if(verificationReset){

    verificationReset.addEventListener(
        "click",
        resetVerification
    );

}


/*==================================
QR SCANNER
==================================*/

let qrScanner = null;
let scannerRunning = false;

if(startScannerBtn){

    startScannerBtn.addEventListener(
        "click",
        async () => {

            if(scannerRunning) return;

            if(typeof Html5Qrcode === "undefined"){
                alert("QR scanner library could not be loaded.");
                return;
            }

            const reader =
                document.getElementById("qr-reader");

            if(!reader){
                alert("QR scanner container not found.");
                return;
            }

            try {

                qrScanner =
                    new Html5Qrcode("qr-reader");

                scannerRunning = true;

                startScannerBtn.textContent =
                    "Scanning...";

                await qrScanner.start(
                    { facingMode: "environment" },
                    {
                        fps: 10,
                        qrbox: {
                            width: 250,
                            height: 250
                        }
                    },
                    async decodedText => {

                        await stopQrScanner();

                        if(ticketReferenceInput){
                            ticketReferenceInput.value =
                                decodedText;
                        }

                        await verifyTicket(decodedText);
                    },
                    () => {}
                );

            } catch(error){

                console.error(
                    "VAULT QR scanner failed:",
                    error
                );

                scannerRunning = false;
                qrScanner = null;

                startScannerBtn.textContent =
                    "Scan QR Code";

                alert(
                    "Unable to start camera. Please allow camera access."
                );
            }
        }
    );
}

async function stopQrScanner(){

    if(qrScanner && scannerRunning){

        try {
            await qrScanner.stop();
        } catch(error) {}

        qrScanner.clear();

        qrScanner = null;
        scannerRunning = false;

        if(startScannerBtn){
            startScannerBtn.textContent =
                "Scan QR Code";
        }
    }
}

/*==================================PUBLIC API
==================================*/

window.VaultVerification = {

    verify:
        verifyTicket,

    reset:
        resetVerification

};


console.log(
    "VAULT TICKET VERIFICATION LOADED"
);




