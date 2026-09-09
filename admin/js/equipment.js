"use strict";

/*==================================
VAULT EQUIPMENT
==================================*/


/*==================================
DOM
==================================*/

const equipmentGrid =
    document.getElementById(
        "equipmentGrid"
    );

const equipmentSearch =
    document.getElementById(
        "equipmentSearch"
    );

const equipmentCategories =
    document.querySelectorAll(
        ".equipment-category"
    );


/*==================================
MANAGEMENT PANEL
==================================*/

const equipmentPanel =
    document.getElementById(
        "equipmentPanel"
    );

const equipmentPanelOverlay =
    document.getElementById(
        "equipmentPanelOverlay"
    );

const equipmentPanelClose =
    document.getElementById(
        "equipmentPanelClose"
    );


/*==================================
ADD PANEL
==================================*/

const equipmentAddBtn =
    document.getElementById(
        "equipmentAddBtn"
    );

const equipmentAddPanel =
    document.getElementById(
        "equipmentAddPanel"
    );

const equipmentAddPanelClose =
    document.getElementById(
        "equipmentAddPanelClose"
    );


/*==================================
PANEL ELEMENTS
==================================*/

const equipmentPanelTitle =
    document.getElementById(
        "equipmentPanelTitle"
    );

const equipmentPanelImage =
    document.getElementById(
        "equipmentPanelImage"
    );

const equipmentPanelCategory =
    document.getElementById(
        "equipmentPanelCategory"
    );

const equipmentPanelDescription =
    document.getElementById(
        "equipmentPanelDescription"
    );

const equipmentPanelPrice =
    document.getElementById(
        "equipmentPanelPrice"
    );

const equipmentPanelStatus =
    document.getElementById(
        "equipmentPanelStatus"
    );


/*==================================
ADD FORM
==================================*/

const equipmentForm =
    document.getElementById(
        "equipmentForm"
    );

const equipmentName =
    document.getElementById(
        "equipmentName"
    );

const equipmentCategory =
    document.getElementById(
        "equipmentCategory"
    );

const equipmentPrice =
    document.getElementById(
        "equipmentPrice"
    );

const equipmentDescription =
    document.getElementById(
        "equipmentDescription"
    );

const equipmentUpload =
    document.getElementById(
        "equipmentUpload"
    );

const equipmentImageInput =
    document.getElementById(
        "equipmentImageInput"
    );


/*==================================
EDIT BUTTON
==================================*/

const equipmentEditBtn =
    document.getElementById(
        "equipmentEditBtn"
    );


/*==================================
STATE
==================================*/

let activeCategory = "all";

let selectedEquipment = null;


/*==================================
DEMO DATA
==================================*/

const equipmentData = {

    "equipment-001": {

        name:
            "Picnic Level 1",

        category:
            "PICNIC",

        description:
            "A refined setup for intimate outdoor gatherings.",

        price:
            "KSh 5,000",

        status:
            "Available",

        image:
            "assets/images/equipment-picnic.jpg"

    },


    "equipment-002": {

        name:
            "Picnic Level 2",

        category:
            "PICNIC",

        description:
            "An elevated picnic experience with premium styling.",

        price:
            "KSh 8,500",

        status:
            "Available",

        image:
            "assets/images/equipment-picnic-2.jpg"

    },


    "equipment-003": {

        name:
            "Small Gathering Level 1",

        category:
            "SMALL GATHERINGS",

        description:
            "A complete setup for intimate celebrations.",

        price:
            "KSh 12,000",

        status:
            "Available",

        image:
            "assets/images/equipment-gathering.jpg"

    },


    "equipment-004": {

        name:
            "Wedding Level 1",

        category:
            "WEDDINGS",

        description:
            "Elegant essentials for a beautifully styled celebration.",

        price:
            "KSh 35,000",

        status:
            "Available",

        image:
            "assets/images/equipment-wedding.jpg"

    },


    "equipment-005": {

        name:
            "Concert Production Level 1",

        category:
            "CONCERT PRODUCTION",

        description:
            "Essential production equipment for live experiences.",

        price:
            "KSh 50,000",

        status:
            "Available",

        image:
            "assets/images/equipment-concert.jpg"

    }

};


/*==================================
CATEGORY FILTER
==================================*/

function filterEquipment(){

    if(!equipmentGrid){

        return;

    }


    const cards =
        equipmentGrid.querySelectorAll(
            ".equipment-card"
        );


    const searchTerm =
        equipmentSearch
            ? equipmentSearch.value
                .trim()
                .toLowerCase()
            : "";


    cards.forEach(
        card => {

            const category =
                card.dataset.category || "";

            const text =
                card.textContent
                    .toLowerCase();


            const categoryMatch =
                activeCategory === "all" ||
                category === activeCategory;


            const searchMatch =
                !searchTerm ||
                text.includes(
                    searchTerm
                );


            if(
                categoryMatch &&
                searchMatch
            ){

                card.style.display = "";

            }else{

                card.style.display = "none";

            }

        }
    );

}


/*==================================
CATEGORY BUTTONS
==================================*/

equipmentCategories.forEach(
    categoryButton => {

        categoryButton.addEventListener(
            "click",
            () => {

                equipmentCategories.forEach(
                    button => {

                        button.classList.remove(
                            "active"
                        );

                    }
                );


                categoryButton.classList.add(
                    "active"
                );


                activeCategory =
                    categoryButton.dataset.category;


                filterEquipment();

            }
        );

    }
);


/*==================================
SEARCH
==================================*/

if(equipmentSearch){

    equipmentSearch.addEventListener(
        "input",
        filterEquipment
    );

}


/*==================================
OPEN MANAGEMENT PANEL
==================================*/

function openEquipmentPanel(
    equipmentId
){

    const equipment =
        equipmentData[
            equipmentId
        ];


    if(!equipment){

        console.error(
            "VAULT EQUIPMENT: Equipment not found."
        );

        return;

    }


    selectedEquipment =
        equipmentId;


    if(equipmentPanelTitle){

        equipmentPanelTitle.textContent =
            equipment.name;

    }


    if(equipmentPanelImage){

        equipmentPanelImage.src =
            equipment.image;

        equipmentPanelImage.alt =
            equipment.name;

    }


    if(equipmentPanelCategory){

        equipmentPanelCategory.textContent =
            equipment.category;

    }


    if(equipmentPanelDescription){

        equipmentPanelDescription.textContent =
            equipment.description;

    }


    if(equipmentPanelPrice){

        equipmentPanelPrice.textContent =
            equipment.price;

    }


    if(equipmentPanelStatus){

        equipmentPanelStatus.textContent =
            equipment.status;

    }


    if(equipmentPanel){

        equipmentPanel.classList.add(
            "is-open"
        );

        equipmentPanel.setAttribute(
            "aria-hidden",
            "false"
        );

    }


    if(equipmentPanelOverlay){

        equipmentPanelOverlay.classList.add(
            "is-visible"
        );

    }

}


/*==================================
MANAGE BUTTONS
==================================*/

if(equipmentGrid){

    equipmentGrid.addEventListener(
        "click",
        event => {

            const button =
                event.target.closest(
                    ".equipment-manage-btn"
                );


            if(!button){

                return;

            }


            const equipmentId =
                button.dataset.equipment;


            openEquipmentPanel(
                equipmentId
            );

        }
    );

}


/*==================================
CLOSE MANAGEMENT PANEL
==================================*/

function closeEquipmentPanel(){

    if(equipmentPanel){

        equipmentPanel.classList.remove(
            "is-open"
        );

        equipmentPanel.setAttribute(
            "aria-hidden",
            "true"
        );

    }


    if(equipmentPanelOverlay){

        equipmentPanelOverlay.classList.remove(
            "is-visible"
        );

    }


    selectedEquipment =
        null;

}


/*==================================
CLOSE BUTTON
==================================*/

if(equipmentPanelClose){

    equipmentPanelClose.addEventListener(
        "click",
        closeEquipmentPanel
    );

}


/*==================================
OVERLAY
==================================*/

if(equipmentPanelOverlay){

    equipmentPanelOverlay.addEventListener(
        "click",
        closeEquipmentPanel
    );

}


/*==================================
OPEN ADD PANEL
==================================*/

function openAddEquipmentPanel(){

    if(equipmentAddPanel){

        equipmentAddPanel.classList.add(
            "is-open"
        );

        equipmentAddPanel.setAttribute(
            "aria-hidden",
            "false"
        );

    }

}


/*==================================
CLOSE ADD PANEL
==================================*/

function closeAddEquipmentPanel(){

    if(equipmentAddPanel){

        equipmentAddPanel.classList.remove(
            "is-open"
        );

        equipmentAddPanel.setAttribute(
            "aria-hidden",
            "true"
        );

    }

}


/*==================================
ADD BUTTON
==================================*/

if(equipmentAddBtn){

    equipmentAddBtn.addEventListener(
        "click",
        openAddEquipmentPanel
    );

}


/*==================================
ADD PANEL CLOSE
==================================*/

if(equipmentAddPanelClose){

    equipmentAddPanelClose.addEventListener(
        "click",
        closeAddEquipmentPanel
    );

}


/*==================================
IMAGE UPLOAD
==================================*/

if(equipmentUpload){

    equipmentUpload.addEventListener(
        "click",
        () => {

            if(equipmentImageInput){

                equipmentImageInput.click();

            }

        }
    );

}


/*==================================
IMAGE PREVIEW
==================================*/

if(equipmentImageInput){

    equipmentImageInput.addEventListener(
        "change",
        () => {

            const file =
                equipmentImageInput.files[0];


            if(!file){

                return;

            }


            const reader =
                new FileReader();


            reader.onload =
                event => {

                    equipmentUpload.style.backgroundImage =
                        `url("${event.target.result}")`;

                    equipmentUpload.style.backgroundSize =
                        "cover";

                    equipmentUpload.style.backgroundPosition =
                        "center";

                };


            reader.readAsDataURL(
                file
            );

        }
    );

}


/*==================================
ADD EQUIPMENT
==================================*/

if(equipmentForm){

    equipmentForm.addEventListener(
        "submit",
        event => {

            event.preventDefault();


            const name =
                equipmentName.value.trim();

            const category =
                equipmentCategory.value;

            const price =
                equipmentPrice.value.trim();

            const description =
                equipmentDescription.value.trim();


            if(
                !name ||
                !category ||
                !price ||
                !description
            ){

                alert(
                    "Please complete all equipment details."
                );

                return;

            }


            /*
                Backend integration will eventually
                happen here.

                For now we only demonstrate the
                front-end structure.
            */


            console.log(
                "New equipment:",
                {
                    name,
                    category,
                    price,
                    description
                }
            );


            alert(
                "Equipment added successfully."
            );


            equipmentForm.reset();


            if(equipmentUpload){

                equipmentUpload.style.backgroundImage =
                    "";

            }


            closeAddEquipmentPanel();

        }
    );

}


/*==================================
EDIT EQUIPMENT
==================================*/

if(equipmentEditBtn){

    equipmentEditBtn.addEventListener(
        "click",
        () => {

            if(!selectedEquipment){

                return;

            }


            console.log(
                "Edit equipment:",
                selectedEquipment
            );


            /*
                This button intentionally does not
                open a full editor yet.

                Backend-ready editing will come later.
            */

            alert(
                "Equipment editing will be connected when the backend is ready."
            );

        }
    );

}


/*==================================
ESCAPE KEY
==================================*/

document.addEventListener(
    "keydown",
    event => {

        if(
            event.key !== "Escape"
        ){

            return;

        }


        closeEquipmentPanel();

        closeAddEquipmentPanel();

    }
);


/*==================================
PUBLIC API
==================================*/

window.VaultEquipment = {

    open:
        openEquipmentPanel,

    close:
        closeEquipmentPanel,

    openAdd:
        openAddEquipmentPanel,

    closeAdd:
        closeAddEquipmentPanel

};


/*==================================
READY
==================================*/

console.log(
    "VAULT EQUIPMENT MODULE LOADED"
);