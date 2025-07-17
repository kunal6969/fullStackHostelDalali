const express = require('express');
const {
  getAllListings,
  getTrendingListings,
  createListing,
  toggleInterest,
  getListingById,
  updateListing,
  deleteListing,
  getMyListings
} = require('../controllers/roomListing.controller');
const { authMiddleware, optionalAuth } = require('../../middleware/auth.middleware');
const { uploadSingle } = require('../../middleware/upload.middleware');

const router = express.Router();

// Public routes (with optional auth for gender filtering)
router.get('/', optionalAuth, getAllListings);
router.get('/trending', optionalAuth, getTrendingListings);
router.get('/:id', optionalAuth, getListingById);

// Protected routes
router.use(authMiddleware);

router.post('/', uploadSingle('roomProofFile'), createListing);
router.post('/:id/interest', toggleInterest);
router.patch('/:id', updateListing);
router.delete('/:id', deleteListing);
router.get('/my/listings', getMyListings);

module.exports = router;
