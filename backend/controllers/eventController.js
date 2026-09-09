const eventModel = require("../models/eventModel");

function generateEventId(title) {
    const base = String(title || "event")
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 80);

    return base || `event-${Date.now()}`;
}

async function uploadImage(req, res) {
    if (!req.file) {
        return res.status(400).json({
            message: "No image file was uploaded."
        });
    }

    const imageUrl = `/uploads/${req.file.filename}`;
    return res.status(200).json({
        success: true,
        imageUrl,
        filename: req.file.filename,
        originalName: req.file.originalname
    });
}

async function getEvents(req, res) {
    try {
        const events = await eventModel.getAllEvents(req.query.status);
        res.json(events);
    } catch (error) {
        console.error("GET EVENTS:", error);
        res.status(500).json({
            message: "Failed to fetch events"
        });
    }
}

async function getEvent(req, res) {
    try {
        const event = await eventModel.getEventById(req.params.id);

        if (!event) {
            return res.status(404).json({
                message: "Event not found"
            });
        }

        res.json(event);
    } catch (error) {
        console.error("GET EVENT:", error);
        res.status(500).json({
            message: "Failed to fetch event"
        });
    }
}

async function createEvent(req, res) {
    try {
        const eventData = {
            ...req.body,
            id: req.body.id || generateEventId(req.body.title),
            status:
                req.body.status === "scheduled"
                    ? "upcoming"
                    : req.body.status || "draft"
        };

        const event = await eventModel.createEvent(eventData);

        res.status(201).json(event);
    } catch (error) {
        console.error("CREATE EVENT:", error);

        res.status(500).json({
            message: "Failed to create event"
        });
    }
}

async function updateEvent(req, res) {
    try {
        const event = await eventModel.updateEvent(
            req.params.id,
            req.body
        );

        if (!event) {
            return res.status(404).json({
                message: "Event not found"
            });
        }

        res.json(event);
    } catch (error) {
        console.error("UPDATE EVENT:", error);

        res.status(500).json({
            message: "Failed to update event"
        });
    }
}

async function deleteEvent(req, res) {
    try {
        const event = await eventModel.deleteEvent(req.params.id);

        if (!event) {
            return res.status(404).json({
                message: "Event not found"
            });
        }

        res.json({
            message: "Event deleted",
            id: event.id
        });
    } catch (error) {
        console.error("DELETE EVENT:", error);

        res.status(500).json({
            message: "Failed to delete event"
        });
    }
}

module.exports = {
    uploadImage,
    getEvents,
    getEvent,
    createEvent,
    updateEvent,
    deleteEvent
};
