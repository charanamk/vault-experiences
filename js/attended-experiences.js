"use strict";


/*==================================
  VAULT — ATTENDED EXPERIENCES
==================================*/


/*==================================
  STORAGE KEY
==================================*/

const ATTENDED_STORAGE_KEY =
    "vaultAttended";

const MEMORIES_STORAGE_KEY =
    "vaultMemories";


/*==================================
  DOM
==================================*/

const attendedList =
    document.getElementById("attendedList");

const attendedEmpty =
    document.getElementById("attendedEmpty");

const attendedExploreBtn =
    document.getElementById("attendedExploreBtn");


/*==================================
  STORAGE
==================================*/

function getStoredData(key) {

    try {

        return JSON.parse(
            localStorage.getItem(key)
        ) || [];

    } catch (error) {

        console.error(
            `Unable to load ${key}.`,
            error
        );

        return [];

    }

}


function saveStoredData(key, data) {

    try {

        localStorage.setItem(
            key,
            JSON.stringify(data)
        );

        return true;

    } catch (error) {

        console.error(
            `Unable to save ${key}.`,
            error
        );

        return false;

    }

}


/*==================================
  GET ATTENDED EXPERIENCES
==================================*/

function getAttended() {

    return getStoredData(
        ATTENDED_STORAGE_KEY
    );

}


/*==================================
  RENDER
==================================*/

function renderAttended() {

    if (!attendedList) {

        return;

    }


    const attended =
        getAttended();


    attendedList.innerHTML = "";


    if (!attended.length) {

        if (attendedEmpty) {

            attendedEmpty.hidden = false;

        }

        return;

    }


    if (attendedEmpty) {

        attendedEmpty.hidden = true;

    }


    attended.forEach(
        experience => {

            const card =
                document.createElement("article");


            card.className =
                "attended-card";


            card.innerHTML = `

                <img
                    class="attended-image"
                    src="${experience.image}"
                    alt="${experience.title}">

                <div
                    class="attended-image-fade">
                </div>

                <div
                    class="attended-content">

                    <span
                        class="attended-badge">
                        ATTENDED
                    </span>

                    <span
                        class="attended-theme">
                        ${experience.theme || ""}
                    </span>

                    <h3
                        class="attended-title">
                        ${experience.title}
                    </h3>

                    <div
                        class="attended-meta">

                        <div
                            class="attended-meta-item">

                            <img
                                src="assets/icons/calendar.svg"
                                alt="">

                            <span>
                                ${experience.date || ""}
                            </span>

                        </div>

                        <div
                            class="attended-meta-item">

                            <img
                                src="assets/icons/location.svg"
                                alt="">

                            <span>
                                ${experience.location || ""}
                            </span>

                        </div>

                    </div>

                    <button
                        class="attended-memory-btn"
                        type="button"
                        data-event-id="${experience.id}">

                        + Save to Memories

                    </button>

                </div>

            `;


            attendedList.appendChild(card);

        }
    );

}


/*==================================
  SAVE TO MEMORIES
==================================*/

function saveToMemories(eventId) {

    const attended =
        getAttended();


    const experience =
        attended.find(
            item =>
                item.id === eventId
        );


    if (!experience) {

        return;

    }


    const memories =
        getStoredData(
            MEMORIES_STORAGE_KEY
        );


    const alreadySaved =
        memories.some(
            memory =>
                memory.id === eventId
        );


    if (alreadySaved) {

        return;

    }


    memories.push(experience);


    saveStoredData(
        MEMORIES_STORAGE_KEY,
        memories
    );

}


/*==================================
  MEMORY BUTTON
==================================*/

if (attendedList) {

    attendedList.addEventListener(
        "click",
        event => {

            const button =
                event.target.closest(
                    ".attended-memory-btn"
                );


            if (!button) {

                return;

            }


            const eventId =
                button.dataset.eventId;


            saveToMemories(eventId);


            button.textContent =
                "Saved to Memories";

            button.disabled = true;

        }
    );

}


/*==================================
  EXPLORE EXPERIENCES
==================================*/

if (attendedExploreBtn) {

    attendedExploreBtn.addEventListener(
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


/*==================================
  INITIALIZE
==================================*/

renderAttended();


/*==================================
  PUBLIC API
==================================*/

window.VaultAttended = {

    refresh:
        renderAttended

};