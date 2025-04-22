const express = require("express");
const { getMessages,getAllChats,getUserChats } = require("../controller/chatController");
const router = express.Router();

router.get("/messages/:userId/:receiverId", getMessages);
router.get("/chats/:userId", getUserChats);
router.get('/chats', getAllChats);

module.exports = router;
