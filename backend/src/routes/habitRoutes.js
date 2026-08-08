const express = require('express');
const { logHabit, getHabits } = require('../controllers/habitController');
const { verifyJWT } = require('../middleware/auth');

const router = express.Router();

router.get('/', verifyJWT, getHabits);
router.post('/', verifyJWT, logHabit);

module.exports = router;
