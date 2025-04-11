require("dotenv").config();
const express = require("express");
const mongoose = require("./config/db");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const Message = require("./model/message");

const chatRoutes = require("./routes/chatRoutes");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST", "PATCH"] },
});

app.use(cors());
app.use(express.json());
app.use("/chat", chatRoutes);

// Socket.io setup
const { Batch } = require("./model/message"); // Import the Batch model

io.on("connection", (socket) => {
    console.log("New client connected:", socket.id);

    socket.on("joinChat", ({ chatId }) => {
        socket.join(chatId);
        console.log(`User joined chat: ${chatId}`);
    });

    socket.on("sendMessage", async (messageData) => {
        const { senderId, receiverId, message, chatId } = messageData;
        console.log("Message received:", messageData);

        try {
            // Find the latest batch for this chat
            let batch = await Batch.findOne({ chatId }).sort({ endTime: -1 });

            // If no batch exists or the batch is full, create a new one
            const batchSizeLimit = 100; // Maximum number of messages per batch
            if (!batch || batch.messages.length >= batchSizeLimit) {
                batch = new Batch({
                    chatId,
                    messages: [],
                    startTime: new Date(),
                    endTime: new Date(),
                });
            }

            // Add the new message to the batch
            batch.messages.push({ senderId, message });
            batch.endTime = new Date(); // Update the end time of the batch

            // Save the batch
            await batch.save();
            console.log("Message saved to batch:", batch);

            // Emit the message to the chat room
            const newMessage = { senderId, message, timestamp: new Date() };
            io.to(chatId).emit("receiveMessage", newMessage);
        } catch (error) {
            console.error("Error saving message:", error);
        }
    });

    socket.on("disconnect", () => console.log("User disconnected:", socket.id));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
