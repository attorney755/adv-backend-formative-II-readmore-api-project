const mongoose = require('mongoose');

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
    timestamps: true
  }
);

const Author = mongoose.model('Author', authorSchema);

module.exports = Author;
