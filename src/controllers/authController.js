const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../config/database');

const register = async (req, res) => {
    try {
        const { username, email, password } = req.body;

        // Check if user exists
        const existingUser = await prisma.user.findFirst({
            where: {
                OR: [
                    { username },
                    { email }
                ]
            }
        });

        if (existingUser) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user
        const user = await prisma.user.create({
            data: {
                username,
                email,
                password: hashedPassword
            }
        });

        // Generate token
        const token = jwt.sign(
            { userId: user.id },
            process.env.JWT_SECRET || 'your_jwt_secret',
            { expiresIn: '24h' }
        );

        res.status(201).json({
            message: 'User created successfully',
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email
            }
        });
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Find user
        const user = await prisma.user.findUnique({
            where: { email }
        });

        if (!user) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        // Verify password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        // Generate token
        const token = jwt.sign(
            { userId: user.id },
            process.env.JWT_SECRET || 'your_jwt_secret',
            { expiresIn: '24h' }
        );

        res.status(200).json({
            message: 'Login successful',
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Update user profile
const updateProfile = async (req, res) => {
    try {
        const userId = req.userId; // From auth middleware
        const { username, email, currentPassword, newPassword } = req.body;

        // Get current user
        const user = await prisma.user.findUnique({
            where: { id: userId }
        });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Prepare update data
        const updateData = {};

        // Update username if provided
        if (username && username !== user.username) {
            // Check if username is taken
            const existingUsername = await prisma.user.findUnique({
                where: { username }
            });
            if (existingUsername) {
                return res.status(400).json({ message: 'Username already taken' });
            }
            updateData.username = username;
        }

        // Update email if provided
        if (email && email !== user.email) {
            // Check if email is taken
            const existingEmail = await prisma.user.findUnique({
                where: { email }
            });
            if (existingEmail) {
                return res.status(400).json({ message: 'Email already taken' });
            }
            updateData.email = email;
        }

        // Update password if provided
        if (newPassword) {
            if (!currentPassword) {
                return res.status(400).json({ message: 'Current password required to change password' });
            }

            // Verify current password
            const isMatch = await bcrypt.compare(currentPassword, user.password);
            if (!isMatch) {
                return res.status(400).json({ message: 'Current password is incorrect' });
            }

            // Hash new password
            updateData.password = await bcrypt.hash(newPassword, 10);
        }

        // Only update if there's something to update
        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({ message: 'No changes to update' });
        }

        // Update user
        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: updateData
        });

        res.json({
            message: 'Profile updated successfully',
            user: {
                id: updatedUser.id,
                username: updatedUser.username,
                email: updatedUser.email
            }
        });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Delete user account
const deleteAccount = async (req, res) => {
    try {
        const userId = req.userId; // From auth middleware
        const { password } = req.body;

        // Get user
        const user = await prisma.user.findUnique({
            where: { id: userId }
        });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Verify password for confirmation
        if (password) {
            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) {
                return res.status(400).json({ message: 'Password is incorrect' });
            }
        }

        // Delete all related data first (cascade delete)
        await prisma.userAchievement.deleteMany({ where: { userId } });
        await prisma.dailyReport.deleteMany({ where: { userId } });
        await prisma.drivingSession.deleteMany({ where: { userId } });

        // Delete vehicles and their telemetry
        const vehicles = await prisma.vehicle.findMany({ where: { userId } });
        for (const vehicle of vehicles) {
            await prisma.telemetryData.deleteMany({ where: { vehicleId: vehicle.id } });
        }
        await prisma.vehicle.deleteMany({ where: { userId } });

        // Finally delete the user
        await prisma.user.delete({
            where: { id: userId }
        });

        res.json({ message: 'Account deleted successfully' });
    } catch (error) {
        console.error('Delete account error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = {
    register,
    login,
    updateProfile,
    deleteAccount
};
