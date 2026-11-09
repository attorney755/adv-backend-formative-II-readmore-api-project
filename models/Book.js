const mongoose = require('mongoose');

// I defined the Book schema here to establish field validations and link books to authors
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
    // Next, I configured the author reference here using ObjectId and ref to enable Mongoose population
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Author',
      required: [true, 'Author reference is required']
    }
  },
  {
    // Then, I enabled timestamps here to track document creation and update timestamps
    timestamps: true
  }
);

// Finally, I compiled this schema into the Book model for use in my controllers
const Book = mongoose.model('Book', bookSchema);

module.exports = Book;
