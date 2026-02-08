const prisma = require('../config/database');

const getLeaderboard = async (req, res) => {
    try {
        const { timeframe } = req.query; // daily, weekly, all-time

        // Mock query - in production, aggregate from DrivingSession or DailyReport
        const leaderboard = await prisma.user.findMany({
            select: {
                id: true,
                username: true,
                // In real app, you'd aggregate scores here or fetch from cache
                dailyReports: {
                    orderBy: { date: 'desc' },
                    take: 1,
                    select: { avgEcoScore: true }
                }
            }
        });

        // Transform and sort
        const ranked = leaderboard
            .map(user => ({
                id: user.id,
                username: user.username,
                score: user.dailyReports[0]?.avgEcoScore || Math.floor(Math.random() * 30) + 70 // Mock score if empty
            }))
            .sort((a, b) => b.score - a.score);

        res.json(ranked);

    } catch (error) {
        console.error('Leaderboard error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = {
    getLeaderboard
};
