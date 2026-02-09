const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');

        if (!token) {
            return res.status(401).json({ message: 'No token, authorization denied' });
        }

        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET || 'your_jwt_secret'
        );

        // Set userId directly on req for controller access
        req.userId = decoded.userId;
        req.user = decoded;
        next();
    } catch (error) {
        console.error('Auth error:', error.message);
        res.status(401).json({ message: 'Token is not valid' });
    }
};
