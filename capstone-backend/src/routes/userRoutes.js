const express = require('express');

const router = express.Router();

const protect = require('../middleware/authMiddleware');
const authorizeRoles = require('../middleware/roleMiddleware');
const { ROLES } = require('../config/roles');
const {
  getUsers,
  createUser,
  updateUser,
  resetPassword
} = require('../controllers/userController');

router.use(protect);
router.use(authorizeRoles(ROLES.ADMINISTRATOR));

router.get('/', getUsers);
router.post('/', createUser);
router.patch('/:id/reset-password', resetPassword);
router.patch('/:id', updateUser);

module.exports = router;
