const express = require('express');
const router = express.Router();
const telemetryController = require('../controllers/telemetryController');
const auth = require('../middleware/auth');

// Authenticated route (for production/ESP32)
router.post('/', auth, telemetryController.ingestTelemetry);

// Unauthenticated route for simulator/testing (no login required)
router.post('/simulator', telemetryController.ingestTelemetry);

module.exports = router;
