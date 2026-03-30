// Booking Scheduler - Automatically converts bookings to sessions
const { autoConvertBookings } = require('../controllers/sessionController');
const { db } = require('../config/firebase');

let schedulerInterval = null;
let hasUpcomingBookings = false;
let consecutiveEmptyChecks = 0;

const CHECK_INTERVAL = 5 * 60 * 1000; // Check every 5 minutes
const TIME_WINDOW_MINUTES = 15; // Only check bookings within 15 minutes
const SKIP_CYCLES_WHEN_EMPTY = 4; // Skip 4 cycles (20 min) when no bookings near

// Smart check - only query if bookings might be near start time
const checkForBookingsToConvert = async () => {
    try {
        // Smart polling: if no bookings recently, skip some cycles
        if (consecutiveEmptyChecks >= SKIP_CYCLES_WHEN_EMPTY) {
            // Reset counter and do a check
            consecutiveEmptyChecks = 0;
        } else if (hasUpcomingBookings === false && consecutiveEmptyChecks > 0) {
            consecutiveEmptyChecks++;
            console.log(`⏭️ Skipping booking check (cycle ${consecutiveEmptyChecks}/${SKIP_CYCLES_WHEN_EMPTY})`);
            return { converted: 0, skipped: true };
        }

        const now = new Date();
        const windowEnd = new Date(now.getTime() + TIME_WINDOW_MINUTES * 60 * 1000);

        // Only query bookings that are within the time window AND have status 'upcoming'
        const snapshot = await db
            .collection('bookings')
            .where('status', '==', 'upcoming')
            .get();

        if (snapshot.empty) {
            hasUpcomingBookings = false;
            consecutiveEmptyChecks++;
            console.log(`📭 No upcoming bookings found at ${now.toISOString()}`);
            return { converted: 0, skipped: false };
        }

        // Check if any booking is within the time window
        let hasBookingsNearStart = false;
        const bookingsNearStart = [];

        snapshot.forEach(doc => {
            const booking = doc.data();
            const bookingTime = booking.bookingTime?.toDate
                ? booking.bookingTime.toDate()
                : new Date(booking.bookingTime);

            if (bookingTime >= now && bookingTime <= windowEnd) {
                hasBookingsNearStart = true;
                bookingsNearStart.push({ id: doc.id, ...booking });
            }
        });

        if (!hasBookingsNearStart) {
            hasUpcomingBookings = false;
            consecutiveEmptyChecks++;
            console.log(`⏭️ No bookings within ${TIME_WINDOW_MINUTES}min window, skipping conversion check`);
            return { converted: 0, skipped: true };
        }

        // There are bookings near start time, proceed with conversion
        hasUpcomingBookings = true;
        consecutiveEmptyChecks = 0;
        console.log(`🎯 Found ${bookingsNearStart.length} booking(s) within ${TIME_WINDOW_MINUTES}min window, running conversion...`);

        const result = await autoConvertBookings();
        return result || { converted: 0 };

    } catch (error) {
        console.error('❌ Smart booking check error:', error);
        return { error: error.message };
    }
};

// Start the scheduler
const startBookingScheduler = () => {
    if (schedulerInterval) {
        console.log('⚠️ Booking scheduler already running');
        return;
    }

    console.log('🚀 Starting booking auto-conversion scheduler...');
    console.log(`⏱️ Smart polling: every ${CHECK_INTERVAL / 60000} minutes with ${TIME_WINDOW_MINUTES}min time window`);

    // Run immediately on startup
    checkForBookingsToConvert();

    // Then run at smart interval
    schedulerInterval = setInterval(async () => {
        try {
            const result = await checkForBookingsToConvert();
            if (result && result.converted > 0) {
                console.log(`✨ Auto-converted ${result.converted} booking(s) to sessions`);
            }
        } catch (error) {
            console.error('❌ Scheduler error:', error);
        }
    }, CHECK_INTERVAL);

    console.log('✅ Booking scheduler started (smart polling enabled)');
};

// Stop the scheduler
const stopBookingScheduler = () => {
    if (schedulerInterval) {
        clearInterval(schedulerInterval);
        schedulerInterval = null;
        console.log('🛑 Booking scheduler stopped');
    }
};

module.exports = {
    startBookingScheduler,
    stopBookingScheduler
};
