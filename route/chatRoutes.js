const express = require("express");
const { getMessages,getAllChats } = require("../controller/chatController");
const router = express.Router();

router.get("/messages/:userId/:receiverId", getMessages);
router.get("/chats/:userId", getAllChats);
module.exports = router;
