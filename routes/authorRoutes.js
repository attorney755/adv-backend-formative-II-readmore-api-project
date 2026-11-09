const express = require('express');
const router = express.Router();
const {
  createAuthor,
  getAllAuthors,
  getAuthorById,
  updateAuthor,
  deleteAuthor,
  getAuthorBooks
} = require('../controllers/authorController');

// Author CRUD routes
router.route('/')
  .post(createAuthor)
  .get(getAllAuthors);

router.route('/:id')
  .get(getAuthorById)
  .put(updateAuthor)
  .delete(deleteAuthor);

// Specific author's books
router.get('/:id/books', getAuthorBooks);

module.exports = router;
