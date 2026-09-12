"use strict";

/*==================================
  VAULT — MEMORIES
==================================*/


/*==================================
  DOM
==================================*/

const memoriesGrid =
    document.getElementById("memoriesGrid");

const memoriesEmpty =
    document.getElementById("memoriesEmpty");

const memoriesExploreBtn =
    document.getElementById("memoriesExploreBtn");


/*==================================
  DATA
==================================*/

function getMemories(){

    try{

        const stored =
            localStorage.getItem("vaultMemories");


        return stored
            ? JSON.parse(stored)
            : [];

    }catch(error){

        console.error(
            "Unable to load Vault memories.",
            error
        );

        return [];

    }

}


/*==================================
  RENDER
==================================*/

function renderMemories(){

    if(!memoriesGrid){

        return;

    }


    const memories =
        getMemories();


    memoriesGrid.innerHTML = "";
    memoriesGrid.classList.add("is-loading"); 


 if (!memories.length) {

    memoriesGrid.classList.remove("is-loading");

    if (memoriesEmpty) {

        memoriesEmpty.hidden = false;

    }

    return;

}

memoriesGrid.classList.remove("is-loading");

    if(memoriesEmpty){

        memoriesEmpty.hidden = true;

    }


    memories.forEach(
        memory => {

            const card =
                document.createElement("article");


            card.className =
                "memory-card";


            card.innerHTML = `

                <img
                    class="memory-image"
                    src="${memory.image}"
                    alt="${memory.title}">


                <div
                    class="memory-overlay">
                </div>


                <div
                    class="memory-content">


                    <span class="memory-date">
                        ${memory.date || ""}
                    </span>


                    <h3 class="memory-title">
                        ${memory.title}
                    </h3>


                    <span class="memory-theme">
                        ${memory.theme || ""}
                    </span>


                </div>

            `;


            memoriesGrid.appendChild(card);

        }
    );

}


/*==================================
  DISCOVER EXPERIENCES
==================================*/

if(memoriesExploreBtn){

    memoriesExploreBtn.addEventListener(
        "click",
        () => {

            const homeTab =
                document.querySelector(
                    '[data-tab="home"]'
                );


            if(homeTab){

                homeTab.click();

            }

        }
    );

}


/*==================================
  INITIALIZE
==================================*/

renderMemories();


/*==================================
  PUBLIC API
==================================*/

window.VaultMemories = {

    refresh:
        renderMemories

};