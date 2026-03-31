const { auth } = require('../config/firebase');

const verifyFirebaseToken = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ message: 'Authorization token missing' });
        }

        const token = authHeader.split(' ')[1];

        const decodedToken = await auth.verifyIdToken(token);

        if (!decodedToken.email_verified) {
            return res.status(403).json({ message: 'Please verify your email first' });
        }

        req.user = decodedToken;
        next();

    } catch (error) {
        console.error('Auth Middleware Error:', error);
        return res.status(401).json({ message: 'Invalid or expired token' });
    }
};

module.exports = verifyFirebaseToken;
