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

    // Get emission history for a user (daily/weekly/monthly)
    router.get('/report/history', async (req, res) => {
        try {
            const { userId, period } = req.query;
            if (!userId) {
                return res.status(400).json({ success: false, error: 'userId required' });
            }

            const now = new Date();
            let startDate;

            if (period === 'yearly') {
                startDate = new Date(now.getFullYear() - 5, 0, 1); // last 5 years
            } else if (period === 'monthly') {
                startDate = new Date(now.getFullYear() - 1, now.getMonth(), 1);
            } else if (period === 'weekly') {
                startDate = new Date(now);
                startDate.setDate(now.getDate() - 28); // last 4 weeks
            } else {
                // daily - last 7 days
                startDate = new Date(now);
                startDate.setDate(now.getDate() - 7);
            }
            startDate.setHours(0, 0, 0, 0);

            const reports = await prisma.dailyReport.findMany({
                where: {
                    userId: parseInt(userId),
                    date: { gte: startDate }
                },
                orderBy: { date: 'asc' }
            });

            let groupedData;

            if (period === 'yearly') {
                // Group by year
                const years = {};
                reports.forEach(r => {
                    const key = `${r.date.getFullYear()}`;
                    if (!years[key]) {
                        years[key] = { label: key, totalCO2: 0, totalDistance: 0, totalFuel: 0, avgEcoScore: 0, count: 0 };
                    }
                    years[key].totalCO2 += r.totalCO2 || 0;
                    years[key].totalDistance += r.totalDistance || 0;
                    years[key].totalFuel += r.totalFuel || 0;
                    years[key].avgEcoScore += r.avgEcoScore || 0;
                    years[key].count++;
                });
                groupedData = Object.values(years).map(y => ({
                    ...y,
                    avgEcoScore: y.count > 0 ? Math.round(y.avgEcoScore / y.count) : 0
                }));
            } else if (period === 'monthly') {
                // Group by month
                const months = {};
                reports.forEach(r => {
                    const key = `${r.date.getFullYear()}-${String(r.date.getMonth() + 1).padStart(2, '0')}`;
                    if (!months[key]) {
                        months[key] = { label: key, totalCO2: 0, totalDistance: 0, totalFuel: 0, avgEcoScore: 0, count: 0 };
                    }
                    months[key].totalCO2 += r.totalCO2 || 0;
                    months[key].totalDistance += r.totalDistance || 0;
                    months[key].totalFuel += r.totalFuel || 0;
                    months[key].avgEcoScore += r.avgEcoScore || 0;
                    months[key].count++;
                });
                groupedData = Object.values(months).map(m => ({
                    ...m,
                    avgEcoScore: m.count > 0 ? Math.round(m.avgEcoScore / m.count) : 0
                }));
            } else if (period === 'weekly') {
                // Group by week
                const weeks = {};
                reports.forEach(r => {
                    const d = new Date(r.date);
                    const weekStart = new Date(d);
                    weekStart.setDate(d.getDate() - d.getDay());
                    const key = weekStart.toISOString().split('T')[0];
                    const label = `Week of ${key}`;
                    if (!weeks[key]) {
                        weeks[key] = { label, totalCO2: 0, totalDistance: 0, totalFuel: 0, avgEcoScore: 0, count: 0 };
                    }
                    weeks[key].totalCO2 += r.totalCO2 || 0;
                    weeks[key].totalDistance += r.totalDistance || 0;
                    weeks[key].totalFuel += r.totalFuel || 0;
                    weeks[key].avgEcoScore += r.avgEcoScore || 0;
                    weeks[key].count++;
                });
                groupedData = Object.values(weeks).map(w => ({
                    ...w,
                    avgEcoScore: w.count > 0 ? Math.round(w.avgEcoScore / w.count) : 0
                }));
            } else {
                // Daily - each report is a day
                groupedData = reports.map(r => ({
                    label: r.date.toISOString().split('T')[0],
                    totalCO2: r.totalCO2 || 0,
                    totalDistance: r.totalDistance || 0,
                    totalFuel: r.totalFuel || 0,
                    avgEcoScore: r.avgEcoScore || 0,
                    count: 1
                }));
            }

            // Calculate totals
            const totalCO2 = reports.reduce((acc, r) => acc + (r.totalCO2 || 0), 0);
            const totalDistance = reports.reduce((acc, r) => acc + (r.totalDistance || 0), 0);
            const totalFuel = reports.reduce((acc, r) => acc + (r.totalFuel || 0), 0);
            const avgEcoScore = reports.length > 0
                ? Math.round(reports.reduce((acc, r) => acc + (r.avgEcoScore || 0), 0) / reports.length)
                : 0;

            res.json({
                success: true,
                period,
                summary: { totalCO2, totalDistance, totalFuel, avgEcoScore, daysCount: reports.length },
                data: groupedData
            });
        } catch (error) {
            console.error('Report history error:', error);
            res.status(500).json({ success: false, error: 'Failed to fetch report history' });
        }
    });

    // Get latest daily report for a user (restore on login)
    router.get('/report/latest', async (req, res) => {
        try {
            const { userId } = req.query;
            if (!userId) {
                return res.status(400).json({ success: false, error: 'userId required' });
            }

            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const endOfDay = new Date(today);
            endOfDay.setHours(23, 59, 59, 999);

            const report = await prisma.dailyReport.findFirst({
                where: {
                    userId: parseInt(userId),
                    date: { gte: today, lte: endOfDay }
                }
            });

            res.json({ success: true, report: report || null });
        } catch (error) {
            console.error('Latest report error:', error);
            res.status(500).json({ success: false, error: 'Failed to fetch latest report' });
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
