const express = require("express");
const { getMessages,getAllChats,getUserChats,    
        sendMessage,
    initiateChat,
    markMessagesAsRead,
    getUnreadCount,
    searchMessages
 } = require("../controller/chatController");


const router = express.Router();

router.post('/messages/send', sendMessage);
router.post('/chats/initiate', initiateChat);
router.post('/messages/mark-read', markMessagesAsRead);


router.get("/messages/:userId/:receiverId", getMessages);
router.get("/chats/:userId", getUserChats);
router.get('/chats', getAllChats);
router.get('/unread-count/:userId', getUnreadCount);
router.get('/search/:userId/:query', searchMessages);
module.exports = router;
