const express = require('express');
const router = express.Router();
const {
  createAuthor,
  getAllAuthors,
  getAuthorById,
  updateAuthor,
  deleteAuthor,
  getAuthorBooks,
  getAuthorStats
} = require('../controllers/authorController');

// Author CRUD routes
router.route('/')
  .post(createAuthor)
  .get(getAllAuthors);

// Author statistics and books
router.get('/:id/stats', getAuthorStats);
router.get('/:id/books', getAuthorBooks);

router.route('/:id')
  .get(getAuthorById)
  .put(updateAuthor)
  .delete(deleteAuthor);

module.exports = router;
