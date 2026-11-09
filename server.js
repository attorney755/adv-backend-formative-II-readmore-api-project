const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/readmore_api';

// Middleware for parsing JSON request bodies
app.use(express.json());

// Health-check route
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'Welcome to ReadMore API — Express + MongoDB Bookstore REST API',
    endpoints: {
      health: 'GET /',
      authors: '/authors',
      books: '/books'
    }
  });
});

// Connect to MongoDB and only start server once connection succeeds
const startServer = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log(`Connected successfully to MongoDB at ${MONGODB_URI}`);

    app.listen(PORT, () => {
      console.log(`ReadMore API server is running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error.message);
    process.exit(1);
  }
};

startServer();

module.exports = app;
