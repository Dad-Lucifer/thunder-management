// routes/analyticsRoutes.js
const express = require('express');
const router = express.Router();
const { getLast24HoursStats, getDeviceOccupancyLast24Hours,
    getPeakHoursLast24Hours,
    getDeviceUsageLast24Hours,
    getSnacksConsumptionLast24Hours,
    getMonthlyGrowthComparison,
    getAnalyticsDashboard
 } = require('../controllers/analyticsController');

router.get('/last-24-hours', getLast24HoursStats);
router.get('/deviceoccupancy', getDeviceOccupancyLast24Hours);
router.get('/peakhours',getPeakHoursLast24Hours);
router.get('/deviceusage',getDeviceUsageLast24Hours);
router.get('/snack', getSnacksConsumptionLast24Hours);
router.get('/monthly', getMonthlyGrowthComparison);
router.get('/dashboard', getAnalyticsDashboard);
module.exports = router;
