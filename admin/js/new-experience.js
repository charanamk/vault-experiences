"use strict";

(function () {
    const state = {
        events: [],
        editingEventId: null,
        editingEventImage: "",
        selectedImageFile: null,
        isSaving: false
    };

    const titleInput = document.getElementById("experienceTitle");
    const themeInput = document.getElementById("experienceTheme");
    const shortDescriptionInput = document.getElementById("experienceShortDescription");
    const descriptionInput = document.getElementById("experienceDescription");

    const dateInput = document.getElementById("experienceDate");
    const timeInput = document.getElementById("experienceTime");
    const locationInput = document.getElementById("experienceLocation");
    const locationNoteInput = document.getElementById("experienceLocationNote");

    const capacityInput = document.getElementById("experienceCapacity");
    const ageInput = document.getElementById("experienceAge");
    const dressCodeInput = document.getElementById("experienceDressCode");
    const deadlineInput = document.getElementById("experienceBookingDeadline");
    const statusInput = document.getElementById("experienceStatus");
    const featuredInput = document.getElementById("experienceFeatured");
    const requirementsInput = document.getElementById("experienceRequirements");
    const maxReservationsInput = document.getElementById("experienceMaxReservations");
    const freeExperienceTab = document.getElementById("freeExperienceTab");
    const paidExperienceTab = document.getElementById("paidExperienceTab");
    const experienceFreeSettings = document.getElementById("experienceFreeSettings");
    const experiencePaidSettings = document.getElementById("experiencePaidSettings");

    const saveDraftButton = document.getElementById("saveExperienceDraft");
    const publishButton = document.getElementById("publishExperience");
    const experienceCoverInput = document.getElementById("experienceCoverInput");
    const experienceCoverUpload = document.getElementById("experienceCoverUpload");
    const reviewImage = document.getElementById("reviewExperienceImage");
    const reviewTheme = document.getElementById("reviewExperienceTheme");
    const reviewTitle = document.getElementById("reviewExperienceTitle");
    const reviewDescription = document.getElementById("reviewExperienceDescription");
    const reviewDate = document.getElementById("reviewExperienceDate");
    const reviewLocation = document.getElementById("reviewExperienceLocation");
    const reviewTickets = document.getElementById("reviewExperienceTickets");
    const formStatus = document.getElementById("experienceFormStatus");
    const existingEventsList = document.getElementById("existingEventsList");

    function getApiUrl(pathname) {
        const base = window.VAULT_API_BASE_URL || (
            window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
                ? (window.location.port === "3000" ? "" : "http://localhost:3000")
                : ""
        );

        return `${base}${pathname}`;
    }

    function setFormStatus(message, type = "info") {
        if (!formStatus) return;
        formStatus.textContent = message || "";
        formStatus.className = `experience-form-status ${type}`;
    }

    function setFormMode(isEditing) {
        if (saveDraftButton) {
            saveDraftButton.textContent = isEditing ? "Save Changes" : "Save as Draft";
        }

        if (publishButton) {
            publishButton.textContent = isEditing ? "Update Experience" : "Publish Experience";
        }
    }

    function setReviewImage(src) {
        if (!reviewImage) return;
        const nextSrc = src || "";
        reviewImage.src = nextSrc;
        reviewImage.alt = "Experience cover preview";
        reviewImage.hidden = !nextSrc;
    }

    function getAccessType() {
        if (paidExperienceTab?.classList.contains("active")) {
            return "paid";
        }

        return "free";
    }

    function setAccessType(type) {
        const nextType = type === "paid" ? "paid" : "free";

        if (freeExperienceTab) {
            const isFree = nextType === "free";
            freeExperienceTab.classList.toggle("active", isFree);
            freeExperienceTab.setAttribute("aria-pressed", String(isFree));
        }

        if (paidExperienceTab) {
            const isPaid = nextType === "paid";
            paidExperienceTab.classList.toggle("active", isPaid);
            paidExperienceTab.setAttribute("aria-pressed", String(isPaid));
        }

        if (experienceFreeSettings) {
            experienceFreeSettings.hidden = nextType !== "free";
        }

        if (experiencePaidSettings) {
            experiencePaidSettings.hidden = nextType !== "paid";
        }
    }

    function collectTickets() {
        if (getAccessType() !== "paid") {
            return [];
        }

        const list = document.getElementById("experienceTicketList");
        if (!list) return [];

        const cards = Array.from(list.querySelectorAll('.experience-ticket-card'));
        const tickets = cards.map(card => {
            const name = card.querySelector('[id^="ticketName"]')?.value.trim() || '';
            const price = Number(card.querySelector('[id^="ticketPrice"]')?.value || 0);
            const quantity = Number(card.querySelector('[id^="ticketQuantity"]')?.value || 0);
            const description = card.querySelector('[id^="ticketDescription"]')?.value.trim() || '';
            const idAttr = card.dataset.ticketId;

            const t = {
                name,
                price,
                quantity,
                description
            };

            if (idAttr) t.id = idAttr;
            return t;
        }).filter(t => t.name);

        return tickets;
    }

    function collectEvent(statusOverride = null) {
        const tickets = collectTickets();

        return {
            title: titleInput?.value.trim() || "",
            theme: themeInput?.value.trim() || "",
            shortDescription: shortDescriptionInput?.value.trim() || "",
            description: descriptionInput?.value.trim() || "",
            date: dateInput?.value || "",
            time: timeInput?.value || "",
            location: locationInput?.value.trim() || "",
            locationNote: locationNoteInput?.value.trim() || "",
            capacity: Number(capacityInput?.value || 0),
            ageRestriction: ageInput?.value || "",
            dressCode: dressCodeInput?.value.trim() || "",
            bookingDeadline: deadlineInput?.value || "",
            status: statusOverride || statusInput?.value || "draft",
            featured: Boolean(featuredInput?.checked),
            accessType: getAccessType(),
            requirements: requirementsInput?.value.trim() || "",
            maxReservations: Number(maxReservationsInput?.value || 0) || null,
            tickets,
            image: state.selectedImageFile ? null : (state.editingEventImage || "")
        };
    }

    function updateReview() {
        const event = collectEvent();

        if (reviewTheme) {
            reviewTheme.textContent = event.theme || "THEME";
        }

        if (reviewTitle) {
            reviewTitle.textContent = event.title || "Experience Title";
        }

        if (reviewDescription) {
            reviewDescription.textContent = event.shortDescription || event.description || "Experience description";
        }

        if (reviewDate) {
            reviewDate.textContent = event.date || "TBA";
        }

        if (reviewLocation) {
            reviewLocation.textContent = event.location || "TBA";
        }

        if (reviewTickets) {
            reviewTickets.textContent = String(
                event.tickets.reduce((total, ticket) => total + ticket.quantity, 0)
            );
        }
    }

    function clearForm() {
        state.editingEventId = null;
        state.editingEventImage = "";
        state.selectedImageFile = null;

        if (experienceCoverInput) {
            experienceCoverInput.value = "";
        }

        if (titleInput) titleInput.value = "";
        if (themeInput) themeInput.value = "";
        if (shortDescriptionInput) shortDescriptionInput.value = "";
        if (descriptionInput) descriptionInput.value = "";
        if (dateInput) dateInput.value = "";
        if (timeInput) timeInput.value = "";
        if (locationInput) locationInput.value = "";
        if (locationNoteInput) locationNoteInput.value = "";
        if (capacityInput) capacityInput.value = "";
        if (ageInput) ageInput.value = "";
        if (dressCodeInput) dressCodeInput.value = "";
        if (deadlineInput) deadlineInput.value = "";
        if (requirementsInput) requirementsInput.value = "";
        if (maxReservationsInput) maxReservationsInput.value = "";
        if (statusInput) statusInput.value = "draft";
        if (featuredInput) featuredInput.checked = false;
        setAccessType("free");

        const defaultTicketName = document.getElementById("ticketName1");
        const defaultTicketPrice = document.getElementById("ticketPrice1");
        const defaultTicketQuantity = document.getElementById("ticketQuantity1");
        const defaultTicketDescription = document.getElementById("ticketDescription1");

        if (defaultTicketName) defaultTicketName.value = "";
        if (defaultTicketPrice) defaultTicketPrice.value = "";
        if (defaultTicketQuantity) defaultTicketQuantity.value = "";
        if (defaultTicketDescription) defaultTicketDescription.value = "";

        setReviewImage("");
        setFormMode(false);
        setFormStatus("");
        updateReview();
    }

    function populateForm(event) {
        if (!event) return;

        state.editingEventId = event.id || null;
        state.editingEventImage = event.image || "";
        state.selectedImageFile = null;

        if (titleInput) titleInput.value = event.title || "";
        if (themeInput) themeInput.value = event.theme || "";
        if (shortDescriptionInput) shortDescriptionInput.value = event.shortDescription || event.description || "";
        if (descriptionInput) descriptionInput.value = event.description || event.shortDescription || "";
        if (dateInput) dateInput.value = event.date || "";
        if (timeInput) timeInput.value = event.time || "";
        if (locationInput) locationInput.value = event.location || "";
        if (locationNoteInput) locationNoteInput.value = event.locationNote || "";
        if (capacityInput) capacityInput.value = event.capacity || "";
        if (ageInput) ageInput.value = event.ageRestriction || "";
        if (dressCodeInput) dressCodeInput.value = event.dressCode || "";
        if (deadlineInput) deadlineInput.value = event.bookingDeadline || "";
        if (requirementsInput) requirementsInput.value = event.requirements || "";
        if (maxReservationsInput) maxReservationsInput.value = event.maxReservations || "";
        if (statusInput) statusInput.value = event.status || "draft";
        if (featuredInput) featuredInput.checked = Boolean(event.featured);

        const accessType = event.accessType === "paid" || (Array.isArray(event.tickets) && event.tickets.length) ? "paid" : "free";
        setAccessType(accessType);

        if (experienceCoverInput) {
            experienceCoverInput.value = "";
        }

        const ticketList = document.getElementById('experienceTicketList');
        if (ticketList) {
            ticketList.innerHTML = '';
            const tickets = Array.isArray(event.tickets) ? event.tickets : [];

            if (tickets.length === 0) {
                const template = getTicketCardTemplate();
                ticketList.appendChild(template);
            } else {
                tickets.forEach((t, idx) => {
                    const card = getTicketCardTemplate();
                    card.dataset.ticketId = t.id || '';

                    const nameInput = card.querySelector('[id^="ticketName"]');
                    const priceInput = card.querySelector('[id^="ticketPrice"]');
                    const qtyInput = card.querySelector('[id^="ticketQuantity"]');
                    const descInput = card.querySelector('[id^="ticketDescription"]');

                    if (nameInput) nameInput.id = `ticketName${idx + 1}`;
                    if (priceInput) priceInput.id = `ticketPrice${idx + 1}`;
                    if (qtyInput) qtyInput.id = `ticketQuantity${idx + 1}`;
                    if (descInput) descInput.id = `ticketDescription${idx + 1}`;

                    if (nameInput) nameInput.value = t.name || '';
                    if (priceInput) priceInput.value = t.price || 0;
                    if (qtyInput) qtyInput.value = t.capacity || t.quantity || 0;
                    if (descInput) descInput.value = t.description || '';

                    ticketList.appendChild(card);
                });
            }

            wireTicketCardControls();
        }

        setReviewImage(event.image || "");
        setFormMode(true);
        setFormStatus(`Editing ${event.title || "experience"}.`, "info");
        updateReview();
    }

    function getTicketCardTemplate(){
        const prototype = document.querySelector('.experience-ticket-card');
        if(prototype){
            const clone = prototype.cloneNode(true);

            // Clear values and data attributes
            clone.removeAttribute('data-ticket-id');
            const inputs = clone.querySelectorAll('input, textarea');
            inputs.forEach(i => { i.value = ''; });

            return clone;
        }

        // Fallback: construct minimal card
        const article = document.createElement('article');
        article.className = 'experience-ticket-card';
        article.innerHTML = `
            <div class="experience-ticket-card-header">
                <div>
                    <span class="experience-ticket-label">TICKET</span>
                    <h3></h3>
                </div>
                <button class="experience-ticket-remove" type="button" aria-label="Remove ticket">×</button>
            </div>
            <div class="form-field">
                <label>Ticket Name</label>
                <input type="text" id="ticketName" placeholder="e.g. General Admission" autocomplete="off">
            </div>
            <div class="ticket-field-row">
                <div class="form-field">
                    <label>Price</label>
                    <div class="ticket-price-input"><span>KSh</span><input type="number" id="ticketPrice" min="0" inputmode="numeric"></div>
                </div>
                <div class="form-field">
                    <label>Available</label>
                    <input type="number" id="ticketQuantity" min="1" inputmode="numeric">
                </div>
            </div>
            <div class="form-field">
                <label>Description</label>
                <textarea id="ticketDescription" rows="3"></textarea>
            </div>
        `;
        return article;
    }

    function wireTicketCardControls(){
        const ticketList = document.getElementById('experienceTicketList');
        if(!ticketList) return;

        ticketList.querySelectorAll('.experience-ticket-remove').forEach(btn => {
            btn.removeEventListener('click', onTicketRemoveClick);
            btn.addEventListener('click', onTicketRemoveClick);
        });
    }

    function onTicketRemoveClick(e){
        const btn = e.currentTarget;
        const card = btn.closest('.experience-ticket-card');
        if(!card) return;
        const list = document.getElementById('experienceTicketList');
        card.remove();
        if(list && list.querySelectorAll('.experience-ticket-card').length === 0){
            list.appendChild(getTicketCardTemplate());
            wireTicketCardControls();
        }
        updateReview();
    }

    if (freeExperienceTab) {
        freeExperienceTab.addEventListener('click', () => setAccessType('free'));
    }

    if (paidExperienceTab) {
        paidExperienceTab.addEventListener('click', () => setAccessType('paid'));
    }

    const addTicketBtnMain = document.getElementById('addTicketBtn');
    if(addTicketBtnMain){
        addTicketBtnMain.addEventListener('click', () => {
            const list = document.getElementById('experienceTicketList');
            if(!list) return;
            const idx = list.querySelectorAll('.experience-ticket-card').length + 1;
            const card = getTicketCardTemplate();

            // assign unique ids so collectTickets picks them up
            const nameInput = card.querySelector('[id^="ticketName"]') || card.querySelector('input[type="text"]');
            const priceInput = card.querySelector('[id^="ticketPrice"]') || card.querySelector('input[type="number"]');
            const qtyInput = card.querySelector('[id^="ticketQuantity"]') || card.querySelectorAll('input[type="number"]')[1];
            const descInput = card.querySelector('[id^="ticketDescription"]') || card.querySelector('textarea');

            if(nameInput) nameInput.id = `ticketName${idx}`;
            if(priceInput) priceInput.id = `ticketPrice${idx}`;
            if(qtyInput) qtyInput.id = `ticketQuantity${idx}`;
            if(descInput) descInput.id = `ticketDescription${idx}`;

            list.appendChild(card);
            wireTicketCardControls();
        });
    }

    function renderEventList(events) {
        if (!existingEventsList) return;

        existingEventsList.innerHTML = "";

        if (!events.length) {
            existingEventsList.innerHTML = '<div class="experience-list-item"><div class="experience-list-meta"><strong>No experiences yet</strong><span>Create a new event to get started.</span></div></div>';
            return;
        }

        events.forEach((event) => {
            const row = document.createElement("div");
            row.className = "experience-list-item";

            const image = document.createElement("img");
            image.className = "experience-list-thumb";
            image.alt = event.title || "Event image";
            image.src = event.image || "";

            const meta = document.createElement("div");
            meta.className = "experience-list-meta";
            meta.innerHTML = `
                <strong>${(event.title || "Untitled experience").replace(/</g, "&lt;")}</strong>
                <span>${(event.location || "Location TBA").replace(/</g, "&lt;")}</span>
                <span>${event.date || "Date TBA"} • ${event.status || "draft"}</span>
            `;

            const actions = document.createElement("div");
            actions.className = "experience-list-actions";

            const editButton = document.createElement("button");
            editButton.type = "button";
            editButton.textContent = "Edit";
            editButton.dataset.action = "edit-event";
            editButton.dataset.eventId = event.id || "";

            const deleteButton = document.createElement("button");
            deleteButton.type = "button";
            deleteButton.textContent = "Delete";
            deleteButton.className = "delete-event-btn";
            deleteButton.dataset.action = "delete-event";
            deleteButton.dataset.eventId = event.id || "";

            actions.append(editButton, deleteButton);
            row.append(image, meta, actions);
            existingEventsList.appendChild(row);
        });
    }

    async function refreshEventList() {
        try {
            const response = await fetch(getApiUrl("/api/events"));
            if (!response.ok) {
                throw new Error(`Failed to load events: ${response.status}`);
            }

            const events = await response.json();
            state.events = Array.isArray(events) ? events : [];
            renderEventList(state.events);
        } catch (error) {
            console.error("VAULT event list failed to load:", error);
            if (existingEventsList) {
                existingEventsList.innerHTML = '<div class="experience-list-item"><div class="experience-list-meta"><strong>Unable to load events</strong><span>Check the backend server and try again.</span></div></div>';
            }
        }
    }

    async function uploadImageFile(file) {
        const formData = new FormData();
        formData.append("image", file);

        const response = await fetch(getApiUrl("/api/events/upload-image"), {
            method: "POST",
            body: formData
        });

        const result = await response.json().catch(() => ({}));

        if (!response.ok) {
            throw new Error(result.message || "Image upload failed.");
        }

        return result.imageUrl || "";
    }

    async function saveEvent(status) {
        if (state.isSaving) return;

        const eventData = collectEvent(status);

        if (!eventData.title) {
            alert("Please enter an experience title.");
            titleInput?.focus();
            return;
        }

        if (!eventData.date) {
            alert("Please select an event date.");
            dateInput?.focus();
            return;
        }

        if (!eventData.location) {
            alert("Please enter the event location.");
            locationInput?.focus();
            return;
        }

        if (eventData.accessType === "paid" && !eventData.tickets.length) {
            alert("Please add at least one ticket type for a paid experience.");
            setAccessType("paid");
            return;
        }

        state.isSaving = true;
        setFormStatus("Saving experience...", "info");

        try {
            let imageUrl = state.editingEventId ? (state.editingEventImage || "") : "";

            if (state.selectedImageFile) {
                imageUrl = await uploadImageFile(state.selectedImageFile);
            }

            const payload = {
                ...eventData,
                image: imageUrl || null,
                status: eventData.status || "draft",
                description: eventData.description || eventData.shortDescription || "",
                date: eventData.date,
                location: eventData.location,
                theme: eventData.theme || "",
                title: eventData.title
            };

            const requestUrl = state.editingEventId
                ? `${getApiUrl("/api/events")}/${state.editingEventId}`
                : getApiUrl("/api/events");

            const method = state.editingEventId ? "PUT" : "POST";

            const response = await fetch(requestUrl, {
                method,
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(payload)
            });

            const result = await response.json().catch(() => ({}));

            if (!response.ok) {
                throw new Error(result.message || "Could not save experience.");
            }

            const successMessage = state.editingEventId
                ? "Experience updated successfully."
                : "Experience created successfully.";

            await refreshEventList();
            clearForm();
            setFormStatus(successMessage, "success");
        } catch (error) {
            console.error("VAULT event save failed:", error);
            setFormStatus(error.message || "Could not save the experience.", "error");
        } finally {
            state.isSaving = false;
        }
    }

    async function deleteEventById(eventId) {
        const record = state.events.find((event) => String(event.id) === String(eventId));
        const label = record?.title || "this experience";

        if (!window.confirm(`Delete ${label}? This action cannot be undone.`)) {
            return;
        }

        try {
            const response = await fetch(`${getApiUrl("/api/events")}/${eventId}`, {
                method: "DELETE"
            });

            const result = await response.json().catch(() => ({}));

            if (!response.ok) {
                throw new Error(result.message || "Failed to delete event.");
            }

            setFormStatus("Experience deleted.", "success");
            if (state.editingEventId && String(state.editingEventId) === String(eventId)) {
                clearForm();
            }
            await refreshEventList();
        } catch (error) {
            console.error("VAULT event deletion failed:", error);
            setFormStatus(error.message || "Failed to delete event.", "error");
        }
    }

    function handleCoverSelection(event) {
        const file = event.target.files && event.target.files[0];

        if (!file) {
            state.selectedImageFile = null;
            if (!state.editingEventId) {
                setReviewImage("");
            }
            return;
        }

        if (!file.type.startsWith("image/")) {
            setFormStatus("Please choose a valid image file.", "error");
            event.target.value = "";
            state.selectedImageFile = null;
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            setFormStatus("Image must be 5MB or smaller.", "error");
            event.target.value = "";
            state.selectedImageFile = null;
            return;
        }

        state.selectedImageFile = file;
        setFormStatus("Selected image ready to upload.", "info");
        setReviewImage(URL.createObjectURL(file));
        updateReview();
    }

    const fields = [
        titleInput,
        themeInput,
        shortDescriptionInput,
        descriptionInput,
        dateInput,
        timeInput,
        locationInput,
        locationNoteInput,
        capacityInput,
        ageInput,
        dressCodeInput,
        deadlineInput,
        requirementsInput,
        maxReservationsInput,
        statusInput,
        featuredInput,
        document.getElementById("ticketName1"),
        document.getElementById("ticketPrice1"),
        document.getElementById("ticketQuantity1"),
        document.getElementById("ticketDescription1")
    ];

    fields.forEach((field) => {
        field?.addEventListener("input", updateReview);
        field?.addEventListener("change", updateReview);
    });

    experienceCoverInput?.addEventListener("change", handleCoverSelection);
    experienceCoverUpload?.addEventListener("click", () => experienceCoverInput?.click());

    saveDraftButton?.addEventListener("click", () => saveEvent("draft"));
    publishButton?.addEventListener("click", () => saveEvent("upcoming"));

    document.addEventListener("click", async (event) => {
        const trigger = event.target.closest("[data-action]");
        if (!trigger) return;

        const action = trigger.dataset.action;
        const eventId = trigger.dataset.eventId;

        if (action === "edit-event") {
            const selected = state.events.find((item) => String(item.id) === String(eventId));
            if (selected) {
                populateForm(selected);
                window.scrollTo({ top: 0, behavior: "smooth" });
            }
            return;
        }

        if (action === "delete-event" && eventId) {
            await deleteEventById(eventId);
        }
    });

    setAccessType("free");
    wireTicketCardControls();
    clearForm();
    refreshEventList();
})();

