const mongoose = require("mongoose");

const MessageSchema = new mongoose.Schema({
    senderId: { type: String, required: true },
    message: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
});

const BatchSchema = new mongoose.Schema({
    chatId: { type: String, required: true },
    messages: [MessageSchema], // Array of messages
    startTime: { type: Date, default: Date.now }, // Timestamp of the first message in the batch
    endTime: { type: Date, default: Date.now }, // Timestamp of the last message in the batch
});

module.exports = {
    Message: mongoose.model("Message", MessageSchema),
    Batch: mongoose.model("Batch", BatchSchema),
};