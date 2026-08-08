const express = require('express');
const { getDashboard } = require('../controllers/dashboardController');
const { verifyJWT } = require('../middleware/auth');

const router = express.Router();

router.get('/', verifyJWT, getDashboard);

module.exports = router;
