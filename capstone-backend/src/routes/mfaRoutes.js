const express = require('express');

const router = express.Router();

const {
  setupMFA,
  verifyMFA
} = require('../controllers/mfaController');

const authMiddleware =
  require('../middleware/authMiddleware');

router.get(
  '/setup',
  authMiddleware,
  setupMFA
);

router.post(
  '/verify',
  authMiddleware,
  verifyMFA
);

module.exports = router;