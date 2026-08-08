const express = require('express');
const { sendMessage, getHistory } = require('../controllers/chatController');
const { verifyJWT } = require('../middleware/auth');

const router = express.Router();

router.get('/', verifyJWT, getHistory);
router.post('/', verifyJWT, sendMessage);

module.exports = router;
