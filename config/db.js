require('dotenv').config(); // Load environment variables first
const mongoose = require("mongoose");
const dbURL = process.env.MONGO_DB_URL;
const connectDB = async () => {
    try {
      await mongoose.connect(dbURL);
      console.log('✅ MongoDB Connected Successfully');
    } catch (error) {
      console.error('❌ MongoDB Connection Failed:', error.message);
      process.exit(1);
    }
  };
  
  connectDB();
  
module.exports = mongoose;
