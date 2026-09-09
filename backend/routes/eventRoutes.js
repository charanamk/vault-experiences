const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");

const router = express.Router();
const uploadDir = path.join(__dirname, "../uploads");
fs.mkdirSync(uploadDir, { recursive: true });

const upload = multer({
    storage: multer.diskStorage({
        destination: (_req, _file, cb) => cb(null, uploadDir),
        filename: (_req, file, cb) => {
            const extension = path.extname(file.originalname || ".png");
            const safeName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${extension}`;
            cb(null, safeName);
        }
    }),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        const allowedTypes = [
            "image/jpeg",
            "image/png",
            "image/webp",
            "image/gif"
        ];
        const extension = path.extname(file.originalname || "").toLowerCase();
        const allowedExtensions = [".jpg", ".jpeg", ".png", ".webp", ".gif"];
        const mimeOK = !!file.mimetype && allowedTypes.includes(file.mimetype);
        const extOK = allowedExtensions.includes(extension);

        if (!file || (!mimeOK && !extOK)) {
            return cb(new Error("Only image files are allowed."));
        }

        cb(null, true);
    }
});

const {
    getEvents,
    getEvent,
    createEvent,
    updateEvent,
    deleteEvent,
    uploadImage
} = require("../controllers/eventController");

router.post("/upload-image", (req, res, next) => {
    upload.single("image")(req, res, (error) => {
        if (error) {
            return res.status(400).json({
                message: error.message || "Image upload failed."
            });
        }

        return next();
    });
}, uploadImage);

router.get("/", getEvents);
router.get("/:id", getEvent);
router.post("/", createEvent);
router.put("/:id", updateEvent);
router.delete("/:id", deleteEvent);

module.exports = router;
