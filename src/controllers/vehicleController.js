const prisma = require('../config/database');

const createVehicle = async (req, res) => {
    try {
        const { make, model, year, licensePlate } = req.body;
        const userId = req.user.userId; // From auth middleware

        const vehicle = await prisma.vehicle.create({
            data: {
                make,
                model,
                year: parseInt(year),
                licensePlate,
                userId
            }
        });

        res.status(201).json(vehicle);
    } catch (error) {
        console.error('Create vehicle error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

const getVehicles = async (req, res) => {
    try {
        const userId = req.user.userId;
        const vehicles = await prisma.vehicle.findMany({
            where: { userId }
        });
        res.json(vehicles);
    } catch (error) {
        console.error('Get vehicles error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

const getVehicle = async (req, res) => {
    try {
        const { id } = req.params;
        const vehicle = await prisma.vehicle.findFirst({
            where: {
                id: parseInt(id),
                userId: req.user.userId
            }
        });

        if (!vehicle) {
            return res.status(404).json({ message: 'Vehicle not found' });
        }

        res.json(vehicle);
    } catch (error) {
        console.error('Get vehicle error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = {
    createVehicle,
    getVehicles,
    getVehicle
};
