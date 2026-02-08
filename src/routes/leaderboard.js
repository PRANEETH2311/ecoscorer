const express = require('express');
const router = express.Router();
const leaderboardController = require('../controllers/leaderboardController');
const auth = require('../middleware/auth');

router.get('/', auth, leaderboardController.getLeaderboard);

module.exports = router;
