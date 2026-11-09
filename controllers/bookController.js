const mongoose = require('mongoose');
const Book = require('../models/Book');
const Author = require('../models/Author');

// Helper function to safely escape regex special characters
const escapeRegex = (string) => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

// @desc    Create a new book for an author
// @route   POST /books
// @access  Public
const createBook = async (req, res) => {
  try {
    const { title, genre, price, publishedYear, author } = req.body;

    // Basic required field validation
    if (!title || !genre || price === undefined || publishedYear === undefined || !author) {
      return res.status(400).json({
        message: 'title, genre, price, publishedYear, and author are required fields'
      });
    }

    // Business Rule 3: Rules the schema can't express (HTTP 422)
    // Price must be strictly greater than zero
    if (typeof price !== 'number' || price <= 0) {
      return res.status(422).json({
        message: 'Unprocessable Entity: price must be a positive number greater than 0'
      });
    }

    // Published year must be between 1450 (invention of printing press) and current year
    const currentYear = new Date().getFullYear();
    if (
      typeof publishedYear !== 'number' ||
      !Number.isInteger(publishedYear) ||
      publishedYear < 1450 ||
      publishedYear > currentYear
    ) {
      return res.status(422).json({
        message: `Unprocessable Entity: publishedYear must be an integer between 1450 and ${currentYear}`
      });
    }

    // Validate Author ID format
    if (!mongoose.isValidObjectId(author)) {
      return res.status(400).json({ message: 'Invalid author ID format' });
    }

    // Business Rule 1: No orphan books (HTTP 400)
    // A book must belong to an author that exists in the database
    const authorExists = await Author.findById(author);
    if (!authorExists) {
      return res.status(400).json({
        message: 'Author not found. A book cannot be created with a non-existent author (no orphan books allowed)'
      });
    }

    // Business Rule 2: No duplicate titles per author, case-insensitive (HTTP 409)
    const duplicateBook = await Book.findOne({
      author: author,
      title: { $regex: new RegExp(`^${escapeRegex(title.trim())}$`, 'i') }
    });

    if (duplicateBook) {
      return res.status(409).json({
        message: `Conflict: This author already has a book titled "${duplicateBook.title}" (duplicate titles per author are not allowed)`
      });
    }

    const newBook = new Book({
      title: title.trim(),
      genre: genre.trim(),
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

    const existingBook = await Book.findById(id);
    if (!existingBook) {
      return res.status(404).json({ message: 'Book not found' });
    }

    const { title, genre, price, publishedYear, author } = req.body;

    // Validate Business Rule 3 if price or publishedYear are updated
    if (price !== undefined) {
      if (typeof price !== 'number' || price <= 0) {
        return res.status(422).json({
          message: 'Unprocessable Entity: price must be a positive number greater than 0'
        });
      }
    }

    if (publishedYear !== undefined) {
      const currentYear = new Date().getFullYear();
      if (
        typeof publishedYear !== 'number' ||
        !Number.isInteger(publishedYear) ||
        publishedYear < 1450 ||
        publishedYear > currentYear
      ) {
        return res.status(422).json({
          message: `Unprocessable Entity: publishedYear must be an integer between 1450 and ${currentYear}`
        });
      }
    }

    // Validate Business Rule 1 if author is updated
    let targetAuthorId = existingBook.author;
    if (author) {
      if (!mongoose.isValidObjectId(author)) {
        return res.status(400).json({ message: 'Invalid author ID format' });
      }
      const authorExists = await Author.findById(author);
      if (!authorExists) {
        return res.status(400).json({
          message: 'Author not found. A book cannot reference a non-existent author (no orphan books allowed)'
        });
      }
      targetAuthorId = author;
    }

    // Validate Business Rule 2 if title or author is updated
    const targetTitle = title ? title.trim() : existingBook.title;
    if (title || author) {
      const duplicateBook = await Book.findOne({
        _id: { $ne: id },
        author: targetAuthorId,
        title: { $regex: new RegExp(`^${escapeRegex(targetTitle)}$`, 'i') }
      });

      if (duplicateBook) {
        return res.status(409).json({
          message: `Conflict: This author already has a book titled "${duplicateBook.title}"`
        });
      }
    }

    const updatedBook = await Book.findByIdAndUpdate(
      id,
      { $set: req.body },
      { new: true, runValidators: true }
    ).populate('author');

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
