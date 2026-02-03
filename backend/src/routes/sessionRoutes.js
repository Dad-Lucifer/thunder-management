const express = require('express');
const router = express.Router();
const {
    createSession,
    getActiveSessions,
    createBooking,
    getUpcomingBookings,
    getDeviceAvailability,
    completeSession,
    updateSession,
    deleteSession
} = require('../controllers/sessionController');

router.post('/start', createSession);
router.get('/active', getActiveSessions);

router.get('/availability', getDeviceAvailability); // NEW

router.post('/update/:id', updateSession);

router.post('/complete/:id', completeSession);
router.delete('/delete/:id', deleteSession);


router.post('/booking', createBooking);
router.get('/upcoming', getUpcomingBookings);

module.exports = router;
