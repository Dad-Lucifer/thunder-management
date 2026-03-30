const express = require('express');
const router = express.Router();
const {
    getOwnerDashboardStats,
    getRevenueFlow,
    getRecentTransactions,
    getRevenueByMachine,
    getDeletionLogs,
    getOwnerDashboard
} = require('../controllers/ownerDashboardController');

router.get('/ownerstat', getOwnerDashboardStats);
router.get('/revenueflow', getRevenueFlow);
router.get('/transactions', getRecentTransactions);
router.get('/revenue-by-machine', getRevenueByMachine);
router.get('/logs', getDeletionLogs);
router.get('/dashboard', getOwnerDashboard);

module.exports = router;