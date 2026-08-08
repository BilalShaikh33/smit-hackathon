const express = require('express');
const { analyzeBody, selectGoal } = require('../controllers/onboardingController');
const { verifyJWT } = require('../middleware/auth');
const { upload } = require('../middleware/upload');

const router = express.Router();

const bodyImageFields = [
  { name: 'front', maxCount: 1 },
  { name: 'back', maxCount: 1 },
  { name: 'left', maxCount: 1 },
  { name: 'right', maxCount: 1 },
];

router.post('/body-analysis', verifyJWT, upload.fields(bodyImageFields), analyzeBody);
router.post('/goal', verifyJWT, selectGoal);

module.exports = router;
