const express = require('express');

const router = express.Router();

const {
  setupMFA,
  verifyMFA,
  getMFAStatus,
  loginVerifyMFA,
  disableMFA
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
  getMFAStatus,
  loginVerifyMFA
);

router.get(
  '/status',
  authMiddleware,
  getMFAStatus
);

router.post(
  '/disable',
  authMiddleware,
  disableMFA
);

module.exports = router;