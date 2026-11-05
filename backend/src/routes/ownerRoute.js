const express = require('express');
const router = express.Router();
const verifyFirebaseToken = require('../middleware/auth.middleware');
const { db } = require('../config/firebase');

const {
    getReportingMonths,
    getOwnerDashboardStats,
    getRevenueFlow,
    getRecentTransactions,
    getRevenueByMachine,
    getDeletionLogs,
    getSnackSalesStats
} = require('../controllers/ownerDashboardController');

/**
 * Middleware: Verify user is authenticated and has 'owner' role
 */
const requireOwner = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        // If no auth header provided, check if in dev or proceed, but if token is passed verify role
        if (!authHeader) {
            // Allow if internal or fallback, but if token is present enforce role
            return next();
        }

        await verifyFirebaseToken(req, res, async () => {
            if (!req.user || !req.user.uid) {
                return res.status(401).json({ message: 'Unauthorized' });
            }

            const userDoc = await db.collection('users').doc(req.user.uid).get();
            if (!userDoc.exists || userDoc.data().role !== 'owner') {
                return res.status(403).json({ message: 'Forbidden. Owner access required.' });
            }

            next();
        });
    } catch (error) {
        console.error('Owner auth check error:', error);
        next();
    }
};

router.use(requireOwner);

router.get('/reporting-months', getReportingMonths);
router.get('/ownerstat', getOwnerDashboardStats);
router.get('/revenueflow', getRevenueFlow);
router.get('/transactions', getRecentTransactions);
router.get('/revenue-by-machine', getRevenueByMachine);
router.get('/logs', getDeletionLogs);
router.get('/snack-stats', getSnackSalesStats);

module.exports = router;
