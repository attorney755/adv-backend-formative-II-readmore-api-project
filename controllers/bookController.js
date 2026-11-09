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

    // I did this initial check here to ensure all required fields are present in the request body
    if (!title || !genre || price === undefined || publishedYear === undefined || !author) {
      return res.status(400).json({
        message: 'title, genre, price, publishedYear, and author are required fields'
      });
    }

    // Business Rule 3: Rules the schema can't express (HTTP 422)
    // I did this check here to ensure the price is strictly greater than 0
    if (typeof price !== 'number' || price <= 0) {
      return res.status(422).json({
        message: 'Unprocessable Entity: price must be a positive number greater than 0'
      });
    }

    // Next, I added this validation here to ensure the published year is within valid historical limits
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

    // Then, I checked if the author ID parameter matches a valid MongoDB ObjectId format
    if (!mongoose.isValidObjectId(author)) {
      return res.status(400).json({ message: 'Invalid author ID format' });
    }

    // Business Rule 1: No orphan books (HTTP 400)
    // I did this database lookup here to confirm that the author actually exists in MongoDB
    const authorExists = await Author.findById(author);
    if (!authorExists) {
      return res.status(400).json({
        message: 'Author not found. A book cannot be created with a non-existent author (no orphan books allowed)'
      });
    }

    // Business Rule 2: No duplicate titles per author, case-insensitive (HTTP 409)
    // Next, I did this regex query here to ensure the author does not already have a book with the same title
    const duplicateBook = await Book.findOne({
      author: author,
      title: { $regex: new RegExp(`^${escapeRegex(title.trim())}$`, 'i') }
    });

    if (duplicateBook) {
      return res.status(409).json({
        message: `Conflict: This author already has a book titled "${duplicateBook.title}" (duplicate titles per author are not allowed)`
      });
    }

    // Then, I created the new Book document with trimmed string values and valid references
    const newBook = new Book({
      title: title.trim(),
      genre: genre.trim(),
      price,
      publishedYear,
      author
    });

    // Next, I saved the book and then populated the full author object so the caller receives the complete details
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

// @desc    Get all books with optional search, filtering, sorting, and pagination
// @route   GET /books
// @access  Public
// Business Rule 5: Dynamic Search, Filtering, Sorting & Pagination Challenge
const getAllBooks = async (req, res) => {
  try {
    const { genre, minPrice, maxPrice, author, search, sort, order, page, limit } = req.query;

    // I created this empty filter object here so only query parameters that are actually provided get added
    const filter = {};

    // 1. I added this filter here to match the genre case-insensitively when requested
    if (genre) {
      filter.genre = { $regex: new RegExp(`^${escapeRegex(genre.trim())}$`, 'i') };
    }

    // 2. Next, I handled the price range filtering here supporting minPrice, maxPrice, or both
    if (minPrice !== undefined || maxPrice !== undefined) {
      filter.price = {};
      if (minPrice !== undefined && !isNaN(Number(minPrice))) {
        filter.price.$gte = Number(minPrice);
      }
      if (maxPrice !== undefined && !isNaN(Number(maxPrice))) {
        filter.price.$lte = Number(maxPrice);
      }
    }

    // 3. Then, I validated and added the author filter here if an author ID was passed
    if (author) {
      if (!mongoose.isValidObjectId(author)) {
        return res.status(400).json({ message: 'Invalid author ID format in query' });
      }
      filter.author = author;
    }

    // 4. Next, I added this case-insensitive substring search on the title here when search text is supplied
    if (search) {
      filter.title = { $regex: new RegExp(escapeRegex(search.trim()), 'i') };
    }

    // 5. Then, I implemented dynamic sorting here with a whitelist of permitted fields to ensure safety
    const validSortFields = ['price', 'title', 'publishedYear', 'createdAt'];
    const sortField = validSortFields.includes(sort) ? sort : 'createdAt';
    const sortDirection = order && order.toLowerCase() === 'asc' ? 1 : -1;
    const sortOptions = { [sortField]: sortDirection };

    // 6. Next, I implemented the optional pagination challenge here when page or limit query params are passed
    const isPaginated = page !== undefined || limit !== undefined;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit, 10) || 10);
    const skip = (pageNum - 1) * limitNum;

    const total = await Book.countDocuments(filter);

    let query = Book.find(filter).populate('author').sort(sortOptions);

    if (isPaginated) {
      query = query.skip(skip).limit(limitNum);
    }

    const books = await query.exec();

    // Finally, I returned pagination metadata if requested, or the plain array if unpaginated
    if (isPaginated) {
      return res.status(200).json({
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum) || 1,
        results: books
      });
    }

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

    // I did this check here to ensure the provided book ID format is valid
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: 'Invalid book ID format' });
    }

    // Next, I fetched the book by ID and populated the author field so the full author document is returned
    const book = await Book.findById(id).populate('author');

    // Then, I returned 404 if no book was found with this ID
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

    // I did this check here to ensure the book ID is valid before executing updates
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: 'Invalid book ID format' });
    }

    // Next, I found the existing book to verify its presence and retrieve current values
    const existingBook = await Book.findById(id);
    if (!existingBook) {
      return res.status(404).json({ message: 'Book not found' });
    }

    const { title, genre, price, publishedYear, author } = req.body;

    // Then, I validated price bounds if a new price was supplied
    if (price !== undefined) {
      if (typeof price !== 'number' || price <= 0) {
        return res.status(422).json({
          message: 'Unprocessable Entity: price must be a positive number greater than 0'
        });
      }
    }

    // Next, I validated the published year limits if a new year was supplied
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

    // Next, I checked if the new author exists to prevent creating orphan books on update
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

    // Then, I checked if changing the title or author would create a duplicate title for that author
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

    // Finally, I executed the update with validators enabled and populated the author reference
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

    // I did this check here to ensure the ID is valid before attempting deletion
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: 'Invalid book ID format' });
    }

    // Next, I checked if the book exists in the database
    const book = await Book.findById(id);
    if (!book) {
      return res.status(404).json({ message: 'Book not found' });
    }

    // Then, I deleted the book and returned a success message with 200 OK
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
