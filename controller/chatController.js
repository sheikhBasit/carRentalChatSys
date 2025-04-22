const { Batch } = require("../model/message");
exports.sendMessage = async (req, res) => {
  try {
      const { senderId, receiverId, message } = req.body;
      
      if (!senderId || !receiverId || !message) {
          return res.status(400).json({ message: "Missing required fields" });
      }

      const chatId = [senderId, receiverId].sort().join("_");
      const timestamp = new Date();

      // Find the most recent batch for this chat
      let batch = await Batch.findOne({ chatId }).sort({ endTime: -1 });

      // If no batch exists or last batch is older than 1 hour, create a new batch
      if (!batch || (timestamp - batch.endTime) > 3600000) {
          batch = new Batch({
              chatId,
              messages: [],
              startTime: timestamp,
              endTime: timestamp
          });
      }

      // Add the new message to the batch
      batch.messages.push({
          senderId,
          message,
          timestamp
      });

      // Update the batch's end time
      batch.endTime = timestamp;

      await batch.save();

      res.status(201).json({
          message: "Message sent successfully",
          data: {
              senderId,
              message,
              timestamp
          }
      });
  } catch (error) {
      console.error("Error sending message:", error);
      res.status(500).json({ message: "Error sending message" });
  }
};
exports.initiateChat = async (req, res) => {
  try {
      const { userId1, userId2 } = req.body;
      
      if (!userId1 || !userId2) {
          return res.status(400).json({ message: "Both user IDs are required" });
      }

      const chatId = [userId1, userId2].sort().join("_");

      // Check if chat already exists
      const existingChat = await Batch.findOne({ chatId });
      if (existingChat) {
          return res.status(200).json({
              message: "Chat already exists",
              chatId
          });
      }

      // Create a new empty batch for this chat
      const newBatch = new Batch({
          chatId,
          messages: [],
          startTime: new Date(),
          endTime: new Date()
      });

      await newBatch.save();

      res.status(201).json({
          message: "Chat initiated successfully",
          chatId
      });
  } catch (error) {
      console.error("Error initiating chat:", error);
      res.status(500).json({ message: "Error initiating chat" });
  }
};
exports.getUnreadCount = async (req, res) => {
  try {
      const { userId } = req.params;
      
      // Find all batches where the user is a participant
      const batches = await Batch.find({
          $or: [
              { chatId: { $regex: `^${userId}_`, $options: "i" } },
              { chatId: { $regex: `_${userId}$`, $options: "i" } },
          ],
      });

      // Count unread messages per chat
      const unreadCounts = {};
      batches.forEach(batch => {
          const unread = batch.messages.filter(
              msg => msg.senderId !== userId && !msg.read
          ).length;
          
          if (unread > 0) {
              unreadCounts[batch.chatId] = unread;
          }
      });

      res.status(200).json(unreadCounts);
  } catch (error) {
      console.error("Error getting unread counts:", error);
      res.status(500).json({ message: "Error getting unread counts" });
  }
};
exports.searchMessages = async (req, res) => {
  try {
      const { userId, query } = req.params;
      
      if (!query || query.length < 3) {
          return res.status(400).json({ message: "Search query must be at least 3 characters" });
      }

      // Find all batches where the user is a participant
      const batches = await Batch.find({
          $or: [
              { chatId: { $regex: `^${userId}_`, $options: "i" } },
              { chatId: { $regex: `_${userId}$`, $options: "i" } },
          ],
      });

      // Search through messages
      const results = [];
      batches.forEach(batch => {
          batch.messages.forEach(msg => {
              if (msg.message.toLowerCase().includes(query.toLowerCase())) {
                  results.push({
                      chatId: batch.chatId,
                      senderId: msg.senderId,
                      message: msg.message,
                      timestamp: msg.timestamp
                  });
              }
          });
      });

      // Sort by most recent first
      results.sort((a, b) => b.timestamp - a.timestamp);

      res.status(200).json(results);
  } catch (error) {
      console.error("Error searching messages:", error);
      res.status(500).json({ message: "Error searching messages" });
  }
};
exports.markMessagesAsRead = async (req, res) => {
  try {
      const { userId, chatId } = req.body;
      
      if (!userId || !chatId) {
          return res.status(400).json({ message: "User ID and Chat ID are required" });
      }

      // Find all batches for this chat
      const batches = await Batch.find({ chatId });

      // Mark messages as read (you'll need to update your schema to include read status)
      for (const batch of batches) {
          batch.messages = batch.messages.map(msg => {
              if (msg.senderId !== userId && !msg.read) {
                  return { ...msg, read: true, readAt: new Date() };
              }
              return msg;
          });
          await batch.save();
      }

      res.status(200).json({ message: "Messages marked as read" });
  } catch (error) {
      console.error("Error marking messages as read:", error);
      res.status(500).json({ message: "Error marking messages as read" });
  }
};
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
exports.getUserChats = async (req, res) => {
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

// Fetch all chats (regardless of user)
exports.getAllChats = async (req, res) => {
  try {
    console.log("Fetching all chats (global)");

    // Fetch all batches
    const batches = await Batch.find({}).sort({ startTime: -1 });

    // Group messages by chatId
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

    // Convert to array and sort each chat’s messages by timestamp (optional)
    const chatList = Object.values(chats).map(chat => ({
      ...chat,
      messages: chat.messages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
    }));

    console.log("Fetched all chats:", chatList);
    res.status(200).json(chatList);
  } catch (error) {
    console.error("Error fetching all chats:", error);
    res.status(500).json({ message: "Error fetching all chats" });
  }
};
