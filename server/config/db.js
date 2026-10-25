import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/dept_library_db');
    console.log(`[MongoDB] Connected successfully: ${conn.connection.host} | DB: ${conn.connection.name}`);
    return conn;
  } catch (error) {
    console.error(`[MongoDB] Connection error: ${error.message}`);
    console.warn(`[MongoDB] Please make sure MongoDB service is running or check your MONGODB_URI in server/.env`);
    // Do not terminate process immediately in development so server can serve mock/fallback or report health
  }
};

export default connectDB;
