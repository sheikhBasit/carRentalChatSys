const { Batch } = require("../model/message");

// Fetch chat history
exports.getMessages = async (req, res) => {
    try {
        const { userId, receiverId } = req.params;
        console.log("Fetching messages for user:", userId, "and receiver:", receiverId);
        
        const chatId = [userId, receiverId].sort().join("_");

        // Find all batches for this chat
        const batches = await Batch.find({ chatId }).sort({ startTime: 1 });

        // Flatten the messages from all batches
        const messages = batches.flatMap((batch) =>
            batch.messages.map((msg) => ({
                senderId: msg.senderId,
                message: msg.message,
                timestamp: msg.timestamp,
            }))
        );
        console.log("Fetched messages:", messages);
        res.status(200).json(messages);
    } catch (error) {
        console.error("Error fetching messages:", error);
        res.status(500).json({ message: "Error fetching messages" });
    }
};
// Fetch all chats for a user (both as sender and receiver)
exports.getAllChats = async (req, res) => {
    try {
        const { userId } = req.params;
        console.log("Fetching all chats for user:", userId);

        // Find all batches where the chatId includes the userId as either sender or receiver
        const batches = await Batch.find({
            $or: [
                { chatId: { $regex: `^${userId}_`, $options: "i" } }, // userId is the sender
                { chatId: { $regex: `_${userId}$`, $options: "i" } }, // userId is the receiver
            ],
        }).sort({ startTime: -1 }); // Sort by most recent first

        // Extract unique chatIds and group messages by chatId
        const chats = {};
        batches.forEach((batch) => {
            if (!chats[batch.chatId]) {
                chats[batch.chatId] = {
                    chatId: batch.chatId,
                    messages: [],
                };
            }
            chats[batch.chatId].messages.push(...batch.messages);
        });

        // Convert the chats object to an array
        const chatList = Object.values(chats);

        console.log("Fetched chats:", chatList);
        res.status(200).json(chatList);
    } catch (error) {
        console.error("Error fetching chats:", error);
        res.status(500).json({ message: "Error fetching chats" });
    }
};