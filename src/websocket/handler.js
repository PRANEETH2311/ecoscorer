const behaviorService = require('../services/behaviorService');
const emissionService = require('../services/emissionService');
const ecoScoreService = require('../services/ecoScoreService');

// Store per-user vehicle state
const vehicleState = {};
const sessionStats = {};
const userSockets = {}; // Map userId -> socket.id

module.exports = (io, prisma) => {
    io.on('connection', (socket) => {
        console.log('🔌 Client connected:', socket.id);

        // Dashboard client registers with their logged-in userId
        socket.on('subscribe_user', (userId) => {
            const room = `user_${userId}`;
            socket.join(room);
            console.log(`📊 Dashboard subscribed to user_${userId}`);
        });

        // Python client registers on connect
        socket.on('register_user', (data) => {
            const { userId, email, name } = data;
            userSockets[socket.id] = userId;
            console.log(`🏎️  Python registered: ${name} (ID: ${userId}, ${email})`);
        });

        // Telemetry from Python (each user's laptop)
        socket.on('telemetry_update', async (data) => {
            const {
                userId,
                userName = "Unknown",
                userEmail,
                carId,
                carName = "Unknown",
                speed = 0,
                rpm = 0,
                throttlePos = 0,
                brakePos = 0,
                fuel = 0,
                gear = 0,
                maf = 0,
                engineLoad = 0,
                airIntake = 0,
                coolantTemp = 0,
                brakeStatus = false
            } = data;

            if (!userId) {
                console.log('⚠️  Received telemetry without userId, ignoring');
                return;
            }

            try {
                // Create unique key per user
                const stateKey = `user_${userId}`;

                const previous = vehicleState[stateKey];
                const current = {
                    speed,
                    rpm,
                    throttlePos,
                    brakeStatus: brakeStatus || brakePos > 10,
                    timestamp: Date.now()
                };

                // Analyze behavior
                const behavior = behaviorService.analyzeBehavior(current, previous);

                // Calculate emissions
                const emissions = emissionService.estimateEmissions({ maf, rpm, speed });

                // Calculate smoothness
                const smoothness = Math.max(0, 100 - Math.abs(throttlePos - (previous?.throttlePos || throttlePos)) * 2);

                // Calculate EcoScore
                const fuelEfficiency = speed > 10 ? Math.min(1, (speed / rpm) * 30) : 0.5;
                const co2Normalized = Math.max(0, 1 - (emissions.co2Rate / 10));

                const scoreResult = ecoScoreService.calculateEcoScore({
                    fuelEfficiency,
                    co2Emission: co2Normalized,
                    smoothness,
                    penalties: (behavior.harshAcceleration ? 1 : 0) +
                        (behavior.harshBraking ? 1 : 0) +
                        (behavior.overSpeeding ? 1 : 0)
                });

                // Update state
                vehicleState[stateKey] = current;

                // Update session stats per user
                if (!sessionStats[stateKey]) {
                    sessionStats[stateKey] = { tripCO2: 0, tripFuel: 0, startTime: Date.now() };
                }
                sessionStats[stateKey].tripCO2 += emissions.co2Rate * 0.1 / 1000;
                sessionStats[stateKey].tripFuel += emissions.fuelRate * 0.1 / 1000;

                // Enriched data
                const enrichedData = {
                    userId,
                    userName,
                    userEmail,
                    carId,
                    carName,
                    speed,
                    rpm,
                    throttlePos,
                    brakePos,
                    fuel,
                    gear,
                    maf,
                    engineLoad,
                    airIntake,
                    coolantTemp,
                    behavior,
                    emissions: {
                        co2: emissions.co2 || 0,        // g/km
                        nox: emissions.nox || 0,        // mg/km
                        hc: emissions.hc || 0,          // mg/km
                        pm: emissions.pm || 0,          // mg/km
                        co2RateGPerSec: emissions.co2RateGPerSec || 0,
                        tripCO2: sessionStats[stateKey].tripCO2,
                        tripFuel: sessionStats[stateKey].tripFuel
                    },
                    ecoScore: {
                        overall: scoreResult.totalScore || 75,
                        efficiency: scoreResult.breakdown?.efficiency || 75,
                        smoothness: scoreResult.breakdown?.smoothness || smoothness,
                        emissions: scoreResult.breakdown?.emission || 75
                    },
                    scoreBreakdown: scoreResult.breakdown,
                    smoothness,
                    timestamp: Date.now()
                };

                // Send ONLY to this user's dashboard(s)
                io.to(`user_${userId}`).emit('telemetry_stream', enrichedData);

                // Log occasionally
                if (Math.random() < 0.05) {
                    console.log(`📡 User ${userId}: ${speed.toFixed(0)}km/h | Score=${scoreResult.totalScore}`);
                }

            } catch (error) {
                console.error('❌ Error:', error);
            }
        });

        // Reset session
        socket.on('reset_session', (userId) => {
            const stateKey = `user_${userId}`;
            sessionStats[stateKey] = { tripCO2: 0, tripFuel: 0, startTime: Date.now() };
            console.log(`🔄 Session reset for user ${userId}`);
        });

        socket.on('disconnect', () => {
            const userId = userSockets[socket.id];
            if (userId) {
                console.log(`🔌 Python disconnected: User ${userId}`);
                delete userSockets[socket.id];
            } else {
                console.log('🔌 Dashboard disconnected');
            }
        });
    });
};
