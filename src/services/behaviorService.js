/**
 * Analyze driving behavior for harsh events
 * 
 * @param {Object} current - Current telemetry frame
 * @param {Object} previous - Previous telemetry frame
 * @returns {Object} Detected events
 */
const analyzeBehavior = (current, previous) => {
    const events = {
        harshAcceleration: false,
        harshBraking: false,
        overSpeeding: false,
        excessiveIdling: false
    };

    if (!previous) return events;

    // Time delta in seconds (approximate if not provided)
    const dt = (new Date(current.timestamp) - new Date(previous.timestamp)) / 1000 || 1;

    // Harsh Acceleration: RPM spike > 1000/s AND Throttle > 80%
    const rpmDelta = current.rpm - previous.rpm;
    if (current.throttlePos > 80 && (rpmDelta / dt) > 1000) {
        events.harshAcceleration = true;
    }

    // Harsh Braking: Speed drop > 20 km/h in 1s AND Brake ON
    const speedDelta = previous.speed - current.speed;
    if (current.brakeStatus && (speedDelta / dt) > 20) {
        events.harshBraking = true;
    }

    // Over-speeding (configurable limit, e.g., 120 km/h)
    if (current.speed > 120) {
        events.overSpeeding = true;
    }

    // Idling: Speed 0, RPM > 0 for extended time (handled better with state, simplified here)
    if (current.speed === 0 && current.rpm > 0) {
        events.excessiveIdling = true;
    }

    return events;
};

module.exports = {
    analyzeBehavior
};
