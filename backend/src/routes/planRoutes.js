const express = require('express');
const { createDietPlan, createWorkoutPlan, getMyPlans } = require('../controllers/planController');
const { verifyJWT } = require('../middleware/auth');

const router = express.Router();

router.get('/', verifyJWT, getMyPlans);
router.post('/diet', verifyJWT, createDietPlan);
router.post('/workout', verifyJWT, createWorkoutPlan);

module.exports = router;
