/**
 * Estimate emissions (CO2, NOx, HC, PM)
 * 
 * @param {Object} telemetry
 * @param {number} telemetry.maf - Mass Air Flow (g/s)
 * @param {number} telemetry.rpm - Engine RPM
 * @param {number} telemetry.speed - Vehicle Speed (km/h)
 * @returns {Object} Emission metrics in g/km format
 */
const estimateEmissions = (telemetry) => {
    const { maf = 0, rpm = 0, speed = 0 } = telemetry;

    let fuelConsumptionRate = 0; // g/s

    // Method 1: Use MAF (Mass Air Flow)
    if (maf > 0) {
        fuelConsumptionRate = maf / 14.7; // AFR for gasoline
    }
    // Method 2: Estimate from RPM (fallback 2.0L engine)
    else if (rpm > 0) {
        const displacement = 2.0; // Liters
        const airFlow = (displacement / 2) * (rpm / 60) * 0.85 * 1.225;
        fuelConsumptionRate = airFlow / 14.7;
    }

    // CO2 per gram of gasoline = 3.15g
    const co2RateGPerSec = fuelConsumptionRate * 3.15;

    // Convert g/s to g/km (if moving)
    // g/km = (g/s) / (km/h / 3600) = (g/s) * 3600 / (km/h)
    let co2GPerKm = 0;
    let noxMgPerKm = 0;
    let hcMgPerKm = 0;
    let pmMgPerKm = 0;

    if (speed > 5) {
        const timePerKm = 3600 / speed; // seconds to travel 1km
        co2GPerKm = co2RateGPerSec * timePerKm;

        // NOx estimation (depends on temperature and load)
        // Typical NOx for gasoline: 0.02-0.1 g/km
        noxMgPerKm = (rpm / 1000) * 15 + (fuelConsumptionRate * 5);

        // HC (unburned hydrocarbons) - higher at low speed/idle
        hcMgPerKm = Math.max(10, 50 - speed * 0.3);

        // PM (particulate matter) - mostly for diesel, low for gasoline
        pmMgPerKm = fuelConsumptionRate * 0.5;
    } else {
        // Idle emissions (not distance-based, just indicative)
        co2GPerKm = co2RateGPerSec * 100; // High per-km when stationary
        noxMgPerKm = rpm > 0 ? 50 : 0;
        hcMgPerKm = rpm > 0 ? 80 : 0;
        pmMgPerKm = rpm > 0 ? 5 : 0;
    }

    return {
        // Per-second rates
        co2RateGPerSec,
        fuelRate: fuelConsumptionRate,

        // Per-km rates (for display)
        co2: co2GPerKm,           // g/km
        nox: noxMgPerKm,          // mg/km
        hc: hcMgPerKm,            // mg/km  
        pm: pmMgPerKm             // mg/km
    };
};

module.exports = {
    estimateEmissions
};
