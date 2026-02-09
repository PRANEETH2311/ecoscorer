const express = require('express');
const router = express.Router();

module.exports = (prisma) => {
    // Get leaderboard - top users by average EcoScore
    router.get('/', async (req, res) => {
        try {
            // Get all users with their daily reports
            const users = await prisma.user.findMany({
                select: {
                    id: true,
                    username: true,
                    dailyReports: {
                        orderBy: { date: 'desc' },
                        take: 30 // Last 30 days
                    }
                }
            });

            // Calculate stats for each user
            const leaderboard = users.map(user => {
                const reports = user.dailyReports || [];

                // Calculate averages
                let totalScore = 0;
                let totalCO2 = 0;
                let totalDistance = 0;

                reports.forEach(report => {
                    totalScore += report.avgEcoScore || 0;
                    totalCO2 += report.totalCO2 || 0;
                    totalDistance += report.totalDistance || 0;
                });

                const avgScore = reports.length > 0 ? totalScore / reports.length : 75;

                return {
                    id: user.id,
                    username: user.username,
                    ecoScore: Math.round(avgScore),
                    co2Saved: Math.max(0, (140 * totalDistance / 1000) - totalCO2).toFixed(1),
                    totalDistance: totalDistance.toFixed(1),
                    sessionsCount: reports.length
                };
            });

            // Sort by ecoScore descending
            leaderboard.sort((a, b) => b.ecoScore - a.ecoScore);

            res.json({
                success: true,
                leaderboard: leaderboard.slice(0, 50) // Top 50
            });
        } catch (error) {
            console.error('Leaderboard error:', error);
            res.status(500).json({ success: false, error: 'Failed to fetch leaderboard' });
        }
    });

    // Clean orphan data (DailyReports without valid users)
    router.delete('/cleanup', async (req, res) => {
        try {
            // Get all user IDs
            const users = await prisma.user.findMany({ select: { id: true } });
            const validUserIds = users.map(u => u.id);

            // Delete DailyReports for non-existent users
            const deleted = await prisma.dailyReport.deleteMany({
                where: {
                    userId: {
                        notIn: validUserIds
                    }
                }
            });

            res.json({ success: true, deletedCount: deleted.count });
        } catch (error) {
            console.error('Cleanup error:', error);
            res.status(500).json({ success: false, error: 'Cleanup failed' });
        }
    });

    // Save daily report for a user
    router.post('/report', async (req, res) => {
        try {
            const { userId, date, totalDistance, totalFuel, totalCO2, avgEcoScore } = req.body;

            if (!userId) {
                return res.status(400).json({ success: false, error: 'userId required' });
            }

            // Check if user exists
            const user = await prisma.user.findUnique({ where: { id: parseInt(userId) } });
            if (!user) {
                return res.status(400).json({ success: false, error: 'User not found' });
            }

            const dateKey = date || new Date().toISOString().split('T')[0];
            const dateObj = new Date(dateKey);
            const startOfDay = new Date(dateObj);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(dateObj);
            endOfDay.setHours(23, 59, 59, 999);

            // Find existing report for this day
            const existing = await prisma.dailyReport.findFirst({
                where: {
                    userId: parseInt(userId),
                    date: {
                        gte: startOfDay,
                        lte: endOfDay
                    }
                }
            });

            let report;
            if (existing) {
                report = await prisma.dailyReport.update({
                    where: { id: existing.id },
                    data: {
                        totalDistance: totalDistance || 0,
                        totalFuel: totalFuel || 0,
                        totalCO2: totalCO2 || 0,
                        avgEcoScore: avgEcoScore || 75
                    }
                });
            } else {
                report = await prisma.dailyReport.create({
                    data: {
                        userId: parseInt(userId),
                        date: dateObj,
                        totalDistance: totalDistance || 0,
                        totalFuel: totalFuel || 0,
                        totalCO2: totalCO2 || 0,
                        avgEcoScore: avgEcoScore || 75
                    }
                });
            }
            res.json({ success: true, report });
        } catch (error) {
            console.error('Report save error:', error);
            res.status(500).json({ success: false, error: 'Failed to save report' });
        }
    });

    return router;
};
