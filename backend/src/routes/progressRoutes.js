const express = require('express');
const { logProgress, getProgress } = require('../controllers/progressController');
const { verifyJWT } = require('../middleware/auth');
const { upload } = require('../middleware/upload');

const router = express.Router();

const photoFields = [
  { name: 'front', maxCount: 1 },
  { name: 'back', maxCount: 1 },
  { name: 'left', maxCount: 1 },
  { name: 'right', maxCount: 1 },
];

router.get('/', verifyJWT, getProgress);
router.post('/', verifyJWT, upload.fields(photoFields), logProgress);

module.exports = router;
