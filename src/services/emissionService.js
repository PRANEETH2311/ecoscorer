/**
 * Estimate CO2 emissions
 * 
 * @param {Object} telemetry
 * @param {number} telemetry.maf - Mass Air Flow (g/s)
 * @param {number} telemetry.rpm - Engine RPM
 * @param {number} telemetry.speed - Vehicle Speed (km/h)
 * @returns {Object} Emission metrics
 */
const estimateEmissions = (telemetry) => {
    let fuelConsumptionRate = 0; // g/s

    // Method 1: Use MAF (Mass Air Flow)
    // AFR (Air Fuel Ratio) for gasoline is ~14.7:1
    if (telemetry.maf) {
        fuelConsumptionRate = telemetry.maf / 14.7;
    }
    // Method 2: Estimate from RPM and Engine Displacement (fallback 2.0L engine)
    else if (telemetry.rpm) {
        // VE (Volumetric Efficiency) approx 0.85
        // Air density approx 1.225 kg/m3 (at sea level)
        const displacement = 2.0; // Liters
        const airFlow = (displacement / 2) * (telemetry.rpm / 60) * 0.85 * 1.225;
        fuelConsumptionRate = airFlow / 14.7;
    }

    // CO2 produced per gram of burnt gasoline approx 3.15g (or 2.31 kg/L)
    // Gasoline density approx 740 g/L
    const co2Rate = fuelConsumptionRate * 3.15; // g/s

    return {
        co2Rate, // g/s
        fuelRate: fuelConsumptionRate // g/s
    };
};

module.exports = {
    estimateEmissions
};
