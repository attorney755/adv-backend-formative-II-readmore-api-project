const mongoose = require('mongoose');
const Book = require('../models/Book');
const Author = require('../models/Author');

// @desc    Create a new book for an author
// @route   POST /books
// @access  Public
const createBook = async (req, res) => {
  try {
    const { title, genre, price, publishedYear, author } = req.body;

    if (!title || !genre || price === undefined || publishedYear === undefined || !author) {
      return res.status(400).json({
        message: 'title, genre, price, publishedYear, and author are required fields'
      });
    }

    if (!mongoose.isValidObjectId(author)) {
      return res.status(400).json({ message: 'Invalid author ID format' });
    }

    const newBook = new Book({
      title,
      genre,
      price,
      publishedYear,
      author
    });

    const savedBook = await newBook.save();
    const populatedBook = await Book.findById(savedBook._id).populate('author');
    return res.status(201).json(populatedBook);
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: error.message });
    }
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

// @desc    Get all books with full author details populated
// @route   GET /books
// @access  Public
const getAllBooks = async (req, res) => {
  try {
    const books = await Book.find().populate('author').sort({ createdAt: -1 });
    return res.status(200).json(books);
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

// @desc    Get single book by ID with full author details populated
// @route   GET /books/:id
// @access  Public
const getBookById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: 'Invalid book ID format' });
    }

    const book = await Book.findById(id).populate('author');
    if (!book) {
      return res.status(404).json({ message: 'Book not found' });
    }

    return res.status(200).json(book);
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

// @desc    Update a book
// @route   PUT /books/:id
// @access  Public
const updateBook = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: 'Invalid book ID format' });
    }

    if (req.body.author && !mongoose.isValidObjectId(req.body.author)) {
      return res.status(400).json({ message: 'Invalid author ID format' });
    }

    const updatedBook = await Book.findByIdAndUpdate(
      id,
      { $set: req.body },
      { new: true, runValidators: true }
    ).populate('author');

    if (!updatedBook) {
      return res.status(404).json({ message: 'Book not found' });
    }

    return res.status(200).json(updatedBook);
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: error.message });
    }
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

// @desc    Delete a book
// @route   DELETE /books/:id
// @access  Public
const deleteBook = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: 'Invalid book ID format' });
    }

    const book = await Book.findById(id);
    if (!book) {
      return res.status(404).json({ message: 'Book not found' });
    }

    await Book.findByIdAndDelete(id);
    return res.status(200).json({ message: 'Book deleted successfully' });
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

module.exports = {
  createBook,
  getAllBooks,
  getBookById,
  updateBook,
  deleteBook
};
