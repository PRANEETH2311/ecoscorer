const behaviorService = require('../services/behaviorService');
const emissionService = require('../services/emissionService');
const ecoScoreService = require('../services/ecoScoreService');
const prisma = require('../config/database');

// In-memory state for previous frames (for behavior analysis)
// In production, use Redis or robust state management
const vehicleState = {};

const ingestTelemetry = async (req, res) => {
    try {
        const { vehicleId, speed, rpm, throttlePos, brakeStatus, maf, timestamp } = req.body;

        // Get previous state
        const previous = vehicleState[vehicleId];
        const current = { speed, rpm, throttlePos, brakeStatus, timestamp: new Date(timestamp) };

        // Analyze
        const behavior = behaviorService.analyzeBehavior(current, previous);
        const emissions = emissionService.estimateEmissions({ maf, rpm, speed }); // Returns { co2Rate, fuelRate } from g/s

        // Calculate instantaneous EcoScore
        const ecoScore = ecoScoreService.calculateEcoScore({
            fuelEfficiency: 0.8, // placeholder
            co2Emission: 0.9, // placeholder (inverse)
            smoothness: 90, // placeholder
            penalties: (behavior.harshAcceleration ? 1 : 0) + (behavior.harshBraking ? 1 : 0)
        });

        // Update state
        vehicleState[vehicleId] = current;

        // TODO: Store aggregated session data periodically

        res.json({
            processed: true,
            behavior,
            emissions,
            ecoScore
        });

    } catch (error) {
        console.error('Telemetry ingest error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = {
    ingestTelemetry
};
