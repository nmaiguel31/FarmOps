const express = require('express');

const router = express.Router();

const {
  setupMFA,
  verifyMFA,
  getMFAStatus
} = require('../controllers/mfaController');

const authMiddleware =
  require('../middleware/authMiddleware');

router.get(
  '/setup',
  authMiddleware,
  setupMFA,
  getMFAStatus
);

router.post(
  '/verify',
  authMiddleware,
  verifyMFA,
  getMFAStatus
);

module.exports = router;