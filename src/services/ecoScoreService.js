/**
 * Calculate EcoScore (0-100) based on driving metrics
 * 
 * @param {Object} metrics - Driving metrics
 * @param {number} metrics.fuelEfficiency - km/L or MPG (normalized)
 * @param {number} metrics.co2Emission - g/km
 * @param {number} metrics.smoothness - 0-100 score based on accel/braking var
 * @param {number} metrics.paramPenalties - Count of harsh events
 * @returns {Object} Score details
 */
const calculateEcoScore = (metrics) => {
    const {
        fuelEfficiency = 0, // normalized 0-1
        co2Emission = 0,    // normalized 0-1 (inverse, higher is worse)
        smoothness = 100,
        penalties = 0
    } = metrics;

    // Weights
    const wFuel = 0.30;
    const wEmission = 0.25;
    const wSmooth = 0.25;
    const wBehavior = 0.20;

    // Normalize inputs if not already
    // Assume fuelEfficiency is scaled 0-1 where 1 is optimal
    // Assume co2Emission is scaled 0-1 where 1 is optimal (low emission)

    // Penalties reduce the behavior score
    const behaviorScore = Math.max(0, 100 - (penalties * 5));

    const score = (
        (fuelEfficiency * 100 * wFuel) +
        (co2Emission * 100 * wEmission) +
        (smoothness * wSmooth) +
        (behaviorScore * wBehavior)
    );

    return {
        totalScore: Math.round(score),
        breakdown: {
            fuelScore: Math.round(fuelEfficiency * 100),
            emissionScore: Math.round(co2Emission * 100),
            smoothnessScore: Math.round(smoothness),
            behaviorScore
        }
    };
};

module.exports = {
    calculateEcoScore
};
