const axios = require('axios');

const API_URL = 'http://localhost:3001/api';
const VEHICLE_ID = 1;

// Auth token - you need to login first and paste it here or use a script that logs in
let token = '';

const login = async () => {
    try {
        const res = await axios.post(`${API_URL}/auth/login`, {
            email: 'test@example.com',
            password: 'password123'
        });
        token = res.data.token;
        console.log('Logged in successfully');
    } catch (error) {
        if (error.response?.status === 400) {
            // Try registering
            try {
                const res = await axios.post(`${API_URL}/auth/register`, {
                    username: 'testuser',
                    email: 'test@example.com',
                    password: 'password123'
                });
                token = res.data.token;
                console.log('Registered and logged in');

                // Create vehicle
                await axios.post(`${API_URL}/vehicles`, {
                    make: 'Toyota',
                    model: 'Prius',
                    year: 2022,
                    licensePlate: 'ECO-123'
                }, { headers: { Authorization: `Bearer ${token}` } });

            } catch (regError) {
                console.error('Registration failed:', regError.message);
            }
        } else {
            console.error('Login failed:', error.message);
        }
    }
};

const simulateDriving = async () => {
    if (!token) await login();
    if (!token) return;

    let speed = 0;
    let rpm = 800;
    let distance = 0;

    setInterval(async () => {
        // Simulate acceleration/deceleration
        const targetSpeed = Math.random() > 0.5 ? 60 : 0; // Fluctuates between 0 and 60 km/h

        if (speed < targetSpeed) {
            speed += 2;
            rpm = 2000 + (speed * 30); // Simple RPM model
        } else {
            speed -= 2;
            rpm = Math.max(800, rpm - 500);
        }
        speed = Math.max(0, speed);

        const data = {
            vehicleId: VEHICLE_ID,
            timestamp: new Date().toISOString(),
            speed: parseFloat(speed.toFixed(1)),
            rpm: Math.round(rpm),
            throttlePos: speed > 0 ? 40 : 0,
            brakeStatus: speed === 0,
            maf: rpm / 100, // Dummy MAF
            engineLoad: 30
        };

        try {
            await axios.post(`${API_URL}/telemetry`, data, {
                headers: { Authorization: `Bearer ${token}` }
            });
            console.log(`Sent telemetry: ${speed} km/h, ${rpm} RPM`);
        } catch (error) {
            console.error('Telemetry send error:', error.message);
        }

    }, 1000);
};

simulateDriving();
