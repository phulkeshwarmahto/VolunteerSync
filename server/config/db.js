const mongoose = require('mongoose');

let hasAttemptedConnection = false;

async function connectDB() {
  if (hasAttemptedConnection) {
    return mongoose.connection;
  }

  hasAttemptedConnection = true;

  if (!process.env.MONGO_URI) {
    console.warn('MONGO_URI is not configured. The API will start, but database operations will fail until MongoDB is configured.');
    return mongoose.connection;
  }

  try {
    mongoose.set('strictQuery', true);
    await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB connected: ${mongoose.connection.host}`);
  } catch (error) {
    console.error('MongoDB connection error:', error.message);
    throw error;
  }

  return mongoose.connection;
}

module.exports = connectDB;
