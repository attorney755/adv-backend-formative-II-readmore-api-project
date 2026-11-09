const mongoose = require('mongoose');
const Author = require('../models/Author');
const Book = require('../models/Book');

// @desc    Create a new author
// @route   POST /authors
// @access  Public
const createAuthor = async (req, res) => {
  try {
    const { name, country, bio } = req.body;

    if (!name || !country) {
      return res.status(400).json({
        message: 'Name and country are required fields'
      });
    }

    const newAuthor = new Author({
      name,
      country,
      bio
    });

    const savedAuthor = await newAuthor.save();
    return res.status(201).json(savedAuthor);
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: error.message });
    }
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

// @desc    Get all authors
// @route   GET /authors
// @access  Public
const getAllAuthors = async (req, res) => {
  try {
    const authors = await Author.find().sort({ createdAt: -1 });
    return res.status(200).json(authors);
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

// @desc    Get single author by ID
// @route   GET /authors/:id
// @access  Public
const getAuthorById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: 'Invalid author ID format' });
    }

    const author = await Author.findById(id);
    if (!author) {
      return res.status(404).json({ message: 'Author not found' });
    }

    return res.status(200).json(author);
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

// @desc    Update an author
// @route   PUT /authors/:id
// @access  Public
const updateAuthor = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: 'Invalid author ID format' });
    }

    const updatedAuthor = await Author.findByIdAndUpdate(
      id,
      { $set: req.body },
      { new: true, runValidators: true }
    );

    if (!updatedAuthor) {
      return res.status(404).json({ message: 'Author not found' });
    }

    return res.status(200).json(updatedAuthor);
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: error.message });
    }
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

// @desc    Delete an author
// @route   DELETE /authors/:id
// @access  Public
// Business Rule 4: Author Delete Policy (Option A - Block Delete)
// Justification: In a bookstore/inventory system, deleting an author should never silently
// delete inventory items (Option B - Cascade) or silently reassign intellectual property (Option C).
// Option A preserves data integrity and prevents accidental loss of book records.
// Downside: Requires manual intervention from the client to resolve dependent books before deletion.
const deleteAuthor = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: 'Invalid author ID format' });
    }

    const author = await Author.findById(id);
    if (!author) {
      return res.status(404).json({ message: 'Author not found' });
    }

    // Check if author still has associated books (Prevent orphan books)
    const bookCount = await Book.countDocuments({ author: id });
    if (bookCount > 0) {
      return res.status(409).json({
        message: `Conflict: Cannot delete author '${author.name}'. This author has ${bookCount} associated book(s). Please delete or reassign their books before deleting the author.`,
        policy: 'BLOCK_DELETE',
        bookCount
      });
    }

    await Author.findByIdAndDelete(id);
    return res.status(200).json({ message: 'Author deleted successfully' });
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

// @desc    Get all books by a specific author
// @route   GET /authors/:id/books
// @access  Public
const getAuthorBooks = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: 'Invalid author ID format' });
    }

    const author = await Author.findById(id);
    if (!author) {
      return res.status(404).json({ message: 'Author not found' });
    }

    const books = await Book.find({ author: id }).populate('author');
    return res.status(200).json(books);
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

// @desc    Get author statistics (Business Rule 6)
// @route   GET /authors/:id/stats
// @access  Public
const getAuthorStats = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: 'Invalid author ID format' });
    }

    const author = await Author.findById(id);
    if (!author) {
      return res.status(404).json({ message: 'Author not found' });
    }

    const books = await Book.find({ author: id });

    // Handle edge case where author has no books
    if (books.length === 0) {
      return res.status(200).json({
        author: author.name,
        bookCount: 0,
        averagePrice: 0,
        cheapestBook: null,
        mostExpensiveBook: null
      });
    }

    const bookCount = books.length;
    const totalPrice = books.reduce((acc, curr) => acc + curr.price, 0);
    const averagePrice = Number((totalPrice / bookCount).toFixed(2));

    let cheapest = books[0];
    let mostExpensive = books[0];

    for (const b of books) {
      if (b.price < cheapest.price) {
        cheapest = b;
      }
      if (b.price > mostExpensive.price) {
        mostExpensive = b;
      }
    }

    return res.status(200).json({
      author: author.name,
      bookCount,
      averagePrice,
      cheapestBook: cheapest.title,
      mostExpensiveBook: mostExpensive.title
    });
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

module.exports = {
  createAuthor,
  getAllAuthors,
  getAuthorById,
  updateAuthor,
  deleteAuthor,
  getAuthorBooks,
  getAuthorStats
};
