const mongoose = require('mongoose');

// I defined the Author schema here to specify the required fields and trimming rules for authors
const authorSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Author name is required'],
      trim: true
    },
    country: {
      type: String,
      required: [true, 'Author country is required'],
      trim: true
    },
    bio: {
      type: String,
      trim: true,
      default: ''
    }
  },
  {
    // Next, I enabled timestamps here to automatically generate createdAt and updatedAt fields
    timestamps: true
  }
);

// Then, I compiled the schema into the Author model for database operations
const Author = mongoose.model('Author', authorSchema);

module.exports = Author;
