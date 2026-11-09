const mongoose = require('mongoose');
const Author = require('../models/Author');
const Book = require('../models/Book');

// @desc    Create a new author
// @route   POST /authors
// @access  Public
const createAuthor = async (req, res) => {
  try {
    const { name, country, bio } = req.body;

    // I did this check here to ensure the client provides both name and country before proceeding
    if (!name || !country) {
      return res.status(400).json({
        message: 'Name and country are required fields'
      });
    }

    // Next, I created a new Author instance using the validated fields
    const newAuthor = new Author({
      name,
      country,
      bio
    });

    // Then, I saved the new author document into MongoDB and returned a 201 Created status
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
    // I did this query here to fetch all authors sorted by creation date so the newest appear first
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

    // I did this check here to verify that the ID string is a valid MongoDB ObjectId to prevent cast errors
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: 'Invalid author ID format' });
    }

    // Next, I looked up the author by ID in the database
    const author = await Author.findById(id);

    // Then, I checked if the author exists; if not found, I returned a 404 with a helpful message
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

    // I did this validation here to make sure the requested ID is valid before querying the database
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: 'Invalid author ID format' });
    }

    // Next, I updated the author document with runValidators enabled so schema constraints remain enforced
    const updatedAuthor = await Author.findByIdAndUpdate(
      id,
      { $set: req.body },
      { new: true, runValidators: true }
    );

    // Then, I verified whether an author with this ID was found and updated
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
// I chose Option A here because in a bookstore inventory system, deleting an author should never
// silently delete inventory items (Cascade) or alter authorship records (Reassign).
// Option A preserves data integrity by preventing orphan books from being created.
const deleteAuthor = async (req, res) => {
  try {
    const { id } = req.params;

    // I did this check first to ensure the supplied ID is a valid ObjectId
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: 'Invalid author ID format' });
    }

    // Next, I queried the database to verify the author exists before applying deletion checks
    const author = await Author.findById(id);
    if (!author) {
      return res.status(404).json({ message: 'Author not found' });
    }

    // Then, I checked if this author still has books in the database to enforce the no-orphan rule
    const bookCount = await Book.countDocuments({ author: id });
    if (bookCount > 0) {
      // I returned HTTP 409 Conflict here to block the deletion when dependent books exist
      return res.status(409).json({
        message: `Conflict: Cannot delete author '${author.name}'. This author has ${bookCount} associated book(s). Please delete or reassign their books before deleting the author.`,
        policy: 'BLOCK_DELETE',
        bookCount
      });
    }

    // Once I confirmed the author has 0 books, I proceeded to safely delete the author document
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

    // I did this check here to ensure the author ID parameter is formatted correctly
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: 'Invalid author ID format' });
    }

    // Next, I verified that the author actually exists in the database
    const author = await Author.findById(id);
    if (!author) {
      return res.status(404).json({ message: 'Author not found' });
    }

    // Then, I queried all books linked to this author and populated the author reference
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

    // I did this check here to validate the author ID format before executing any queries
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: 'Invalid author ID format' });
    }

    // Next, I found the author document to ensure the author exists
    const author = await Author.findById(id);
    if (!author) {
      return res.status(404).json({ message: 'Author not found' });
    }

    // Then, I retrieved all books authored by this person to compute their statistics
    const books = await Book.find({ author: id });

    // I did this check here to handle the edge case where an author has no books, returning sensible defaults with 200 OK
    if (books.length === 0) {
      return res.status(200).json({
        author: author.name,
        bookCount: 0,
        averagePrice: 0,
        cheapestBook: null,
        mostExpensiveBook: null
      });
    }

    // Next, I calculated the total count and average price of all the author's books
    const bookCount = books.length;
    const totalPrice = books.reduce((acc, curr) => acc + curr.price, 0);
    const averagePrice = Number((totalPrice / bookCount).toFixed(2));

    // Then, I iterated through the books to identify the cheapest and most expensive titles
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

    // Finally, I returned the computed summary object as specified in the assignment
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
