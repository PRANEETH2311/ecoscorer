/**
 * Calculate EcoScore (0-100) based on driving metrics
 * 
 * Higher score = better driving:
 * - Smooth throttle/brake inputs
 * - Lower fuel consumption
 * - Optimal speed range (50-90 km/h)
 * - Lower CO2 emissions
 * - No harsh events
 */
const calculateEcoScore = (metrics) => {
    const {
        speed = 0,
        rpm = 0,
        throttlePos = 0,
        brakePos = 0,
        maf = 0,
        smoothness = 100,
        co2Rate = 0,
        harshBraking = false,
        harshAcceleration = false,
        overSpeeding = false
    } = metrics;

    // === EFFICIENCY SCORE (30%) ===
    // Based on fuel efficiency: speed/rpm ratio (higher = better)
    // Optimal: high gear, low RPM, moderate speed
    let efficiencyScore = 50;
    if (speed > 0 && rpm > 0) {
        const speedRpmRatio = (speed / rpm) * 100;
        // Optimal ratio is around 3-5 (speed 60-100 at 2000-3000 RPM)
        if (speedRpmRatio > 2 && speedRpmRatio < 6) {
            efficiencyScore = 80 + (speedRpmRatio * 4);
        } else if (speedRpmRatio >= 6) {
            efficiencyScore = 100; // Very efficient
        } else {
            efficiencyScore = speedRpmRatio * 25;
        }
    }
    efficiencyScore = Math.min(100, Math.max(0, efficiencyScore));

    // === SMOOTHNESS SCORE (25%) ===
    // Based on throttle/brake inputs (lower variation = better)
    // Penalize aggressive throttle > 80%
    let smoothnessScore = smoothness;
    if (throttlePos > 80) {
        smoothnessScore -= (throttlePos - 80) * 2;
    }
    if (brakePos > 50) {
        smoothnessScore -= (brakePos - 50);
    }
    smoothnessScore = Math.min(100, Math.max(0, smoothnessScore));

    // === EMISSION SCORE (25%) ===
    // Based on CO2 rate (g/km) - lower is better
    // Excellent: <80, Good: 80-120, Average: 120-180, Poor: >180
    let emissionScore = 100;
    if (co2Rate > 0) {
        if (co2Rate < 80) {
            emissionScore = 100;
        } else if (co2Rate < 120) {
            emissionScore = 100 - ((co2Rate - 80) * 0.5);
        } else if (co2Rate < 180) {
            emissionScore = 80 - ((co2Rate - 120) * 0.5);
        } else if (co2Rate < 250) {
            emissionScore = 50 - ((co2Rate - 180) * 0.4);
        } else {
            emissionScore = Math.max(0, 20 - ((co2Rate - 250) * 0.2));
        }
    }
    emissionScore = Math.min(100, Math.max(0, emissionScore));

    // === BEHAVIOR SCORE (20%) ===
    // Penalize harsh events
    let behaviorScore = 100;
    if (harshBraking) behaviorScore -= 30;
    if (harshAcceleration) behaviorScore -= 25;
    if (overSpeeding) behaviorScore -= 20;
    behaviorScore = Math.max(0, behaviorScore);

    // === SPEED BONUS ===
    // Bonus for optimal speed range (50-90 km/h)
    let speedBonus = 0;
    if (speed >= 50 && speed <= 90) {
        speedBonus = 10;
    } else if (speed > 90 && speed <= 120) {
        speedBonus = 5;
    }

    // === CALCULATE TOTAL ===
    const weights = {
        efficiency: 0.30,
        smoothness: 0.25,
        emission: 0.25,
        behavior: 0.20
    };

    const totalScore = Math.round(
        (efficiencyScore * weights.efficiency) +
        (smoothnessScore * weights.smoothness) +
        (emissionScore * weights.emission) +
        (behaviorScore * weights.behavior) +
        speedBonus
    );

    return {
        totalScore: Math.min(100, Math.max(0, totalScore)),
        breakdown: {
            efficiency: Math.round(efficiencyScore),
            smoothness: Math.round(smoothnessScore),
            emission: Math.round(emissionScore),
            behavior: Math.round(behaviorScore)
        }
    };
};

module.exports = {
    calculateEcoScore
};
