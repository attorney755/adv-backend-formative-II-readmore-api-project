const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

// I loaded environment variables from the .env file here so configuration remains flexible and secrets are not hardcoded
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/readmore_api';

// Next, I added this express.json() middleware here so the server can parse incoming JSON request bodies
app.use(express.json());

// Routes
const authorRoutes = require('./routes/authorRoutes');
const bookRoutes = require('./routes/bookRoutes');

// Then, I mounted the author and book routers under their respective base paths
app.use('/authors', authorRoutes);
app.use('/books', bookRoutes);

// Next, I added this root health-check route here so clients can verify the API is running smoothly
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

// I added this 404 middleware here to return clean JSON when an unmapped route is requested
app.use((req, res) => {
  res.status(404).json({
    message: `Cannot ${req.method} ${req.originalUrl} - Route not found`
  });
});

// Next, I implemented this global error handler here to catch any unhandled exceptions and prevent server crashes
app.use((err, req, res, next) => {
  console.error('Unhandled application error:', err);
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    message: err.message || 'Internal Server Error'
  });
});

// Then, I structured this async startup function here so the server only starts listening after MongoDB connects
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
