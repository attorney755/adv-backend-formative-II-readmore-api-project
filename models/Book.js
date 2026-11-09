const mongoose = require('mongoose');

const bookSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Book title is required'],
      trim: true
    },
    genre: {
      type: String,
      required: [true, 'Genre is required'],
      trim: true
    },
    price: {
      type: Number,
      required: [true, 'Price is required']
    },
    publishedYear: {
      type: Number,
      required: [true, 'Published year is required']
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Author',
      required: [true, 'Author reference is required']
    }
  },
  {
    timestamps: true
  }
);

const Book = mongoose.model('Book', bookSchema);

module.exports = Book;
