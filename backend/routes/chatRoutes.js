const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const chatController = require("../controllers/chatController");

const UPLOAD_DIR = path.join(__dirname, "../uploads");
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || ".jpg";
    cb(null, `chat-${Date.now()}-${Math.round(Math.random() * 1e5)}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Only image files are accepted"));
  },
});

router.get("/conversations", chatController.getConversations);
router.post("/conversations", chatController.createOrGetConversation);
router.get("/conversations/:id/messages", chatController.getMessages);
router.post("/conversations/:id/messages", upload.single("attachment"), chatController.sendMessage);

module.exports = router;
