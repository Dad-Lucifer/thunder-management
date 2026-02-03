const { db } = require('../config/firebase');
const deviceLimits = require("../config/deviceLimit");
const PRICE_PER_HOUR_PER_PERSON = 50;


// Helper to transform device counts object to array of strings for frontend
const transformDevicesToArray = (deviceCounts) => {
    const devices = [];
    if (!deviceCounts) return devices;

    // devices: { ps: 2, pc: 1 } -> ['ps', 'ps', 'pc']
    Object.entries(deviceCounts).forEach(([type, count]) => {
        for (let i = 0; i < count; i++) {
            devices.push(type);
        }
    });
    return devices;
};

const getDeviceAvailability = async (req, res) => {
    try {
        const snapshot = await db
            .collection('sessions')
            .where('status', '==', 'active')
            .get();

        const occupied = { ps: [], pc: [], vr: [], wheel: [], metabat: [] };

        snapshot.forEach(doc => {
            const devices = doc.data().devices || {};
            // devices: { ps: 5 } means PS Machine #5 is used.
            Object.keys(devices).forEach(k => {
                const machineId = devices[k];
                if (machineId > 0 && occupied[k]) {
                    occupied[k].push(machineId);
                }
            });
        });

        res.status(200).json({
            limits: deviceLimits,
            occupied
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Availability error' });
    }
};


const createSession = async (req, res) => {
    try {
        const {
            customerName, contactNumber, duration,
            peopleCount, snacks, devices
        } = req.body;

        // 1. Get currently occupied IDs
        const snapshot = await db
            .collection('sessions')
            .where('status', '==', 'active')
            .get();

        const occupied = { ps: [], pc: [], vr: [], wheel: [], metabat: [] };

        snapshot.forEach(doc => {
            const d = doc.data().devices || {};
            Object.keys(d).forEach(k => {
                const id = d[k];
                if (id > 0 && occupied[k]) occupied[k].push(id);
            });
        });

        const calculatedPrice =
            (parseFloat(duration) || 1) *
            (parseInt(peopleCount) || 1) *
            PRICE_PER_HOUR_PER_PERSON;

        // 2. Validate availability (Check if ID is taken)
        for (const key in devices) {
            const requestedId = devices[key];
            if (requestedId > 0) {
                // Check if ID is within limits
                if (requestedId > deviceLimits[key]) {
                    return res.status(400).json({
                        message: `${key.toUpperCase()} #${requestedId} does not exist (Max ${deviceLimits[key]})`
                    });
                }
                // Check if ID is occupied
                if (occupied[key].includes(requestedId)) {
                    return res.status(400).json({
                        message: `${key.toUpperCase()} #${requestedId} is currently occupied`
                    });
                }
            }
        }

        // 3. Create session
        const newSession = {
            customerName,
            contactNumber,
            duration: parseFloat(duration) || 1,
            peopleCount: parseInt(peopleCount) || 1,
            snacks: snacks || '',
            devices: devices || {}, // { ps: 5 }
            price: calculatedPrice,
            status: 'active',
            startTime: new Date().toISOString(),
            createdAt: new Date().toISOString()
        };


        const docRef = await db.collection('sessions').add(newSession);

        res.status(201).json({
            message: 'Session started successfully',
            sessionId: docRef.id
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error starting session' });
    }
};

const getActiveSessions = async (req, res) => {
    try {
        if (!db) return res.status(500).json({ message: 'Database not initialized' });

        const snapshot = await db.collection('sessions')
            .where('status', '==', 'active')
            .get();

        const sessions = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            // Transform for frontend
            // Frontend expects: { id, customer, startTime, devices: ['ps', 'ps'], status }

            // Basic formatting of time (just showing time part for now or full string)
            const startDate = new Date(data.startTime);
            const timeString = startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            sessions.push({
                id: doc.id,
                customer: data.customerName,
                startTime: data.startTime,   // ISO string
                duration: data.duration,     // hours
                peopleCount: data.peopleCount,   // 🔥
                price: data.price,               // 🔥
                paidAmount: data.paidAmount || 0,
                remainingAmount: data.remainingAmount ?? data.price,
                devices: transformDevicesToArray(data.devices),
                status: data.status
            });

        });

        res.status(200).json(sessions);

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching sessions' });
    }
};

const createBooking = async (req, res) => {
    // Similar to session but with a 'bookingTime'
    try {
        const { customerName, bookingTime, devices } = req.body;
        // bookingTime expected ISO string

        if (!db) return res.status(500).json({ message: 'Database not initialized' });

        const newBooking = {
            customerName,
            bookingTime,
            devices: devices || {}, // { ps: 1 ... }
            status: 'upcoming',
            createdAt: new Date().toISOString()
        };

        const docRef = await db.collection('bookings').add(newBooking);
        res.status(201).json({ message: 'Booking created', bookingId: docRef.id });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error creating booking' });
    }
};

const getUpcomingBookings = async (req, res) => {
    try {
        const snapshot = await db
            .collection('bookings')
            .where('status', '==', 'upcoming')
            .orderBy('bookingTime', 'asc')
            .get();

        const bookings = snapshot.docs.map(doc => {
            const data = doc.data();

            const bookingDate =
                data.bookingTime?.toDate?.() || new Date(data.bookingTime);

            return {
                id: doc.id,
                name: data.customerName,
                time: bookingDate.toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit'
                }),
                devices: transformDevicesToArray(data.devices || {})
            };
        });

        return res.status(200).json(bookings);

    } catch (error) {
        console.error('❌ getUpcomingBookings error:', error);
        return res.status(500).json({
            message: 'Error fetching bookings'
        });
    }
};

const updateSession = async (req, res) => {
    try {
        const { id } = req.params;
        const { extraTime, extraPrice, newMember, paidNow, payingPeopleNow } = req.body;


        const ref = db.collection('sessions').doc(id);
        const snap = await ref.get();

        if (!snap.exists) {
            return res.status(404).json({ message: "Session not found" });
        }

        const data = snap.data();

        // ---- Option A ledger logic ----
        const totalPrice = data.price + (extraPrice || 0);

        const alreadyPaidAmount = data.paidAmount || 0;
        const alreadyPaidPeople = data.paidPeople || 0;

        const paid = alreadyPaidAmount + (paidNow || 0);
        const newPaidPeople = alreadyPaidPeople + (payingPeopleNow || 0);

        const remainingAmount = totalPrice - paid;


        // ---- Safe device merge ----
        let updatedDevices = { ...data.devices };
        let addedPeople = 0;

        if (newMember && newMember.devices) {
            Object.keys(newMember.devices).forEach(k => {
                updatedDevices[k] =
                    (updatedDevices[k] || 0) + (newMember.devices[k] || 0);
            });

            addedPeople = newMember.peopleCount || 0;
        }

        // ---- Final update ----
        await ref.update({
            duration: data.duration + (extraTime || 0),
            peopleCount: data.peopleCount + addedPeople,
            price: totalPrice,
            paidAmount: paid,
            paidPeople: newPaidPeople,   // 👈 ADD
            remainingAmount,
            devices: updatedDevices,
            members: newMember
                ? [...(data.members || []), newMember]
                : data.members || [],
            updatedAt: new Date().toISOString()
        });


        res.json({ message: "Session updated successfully" });

    } catch (error) {
        console.error("❌ updateSession error:", error);
        res.status(500).json({ message: "Failed to update session" });
    }
};


const completeSession = async (req, res) => {
    try {
        const { id } = req.params;

        await db.collection('sessions').doc(id).update({
            status: 'completed',
            completedAt: new Date().toISOString()
        });

        res.json({ message: 'Session completed' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to complete session' });
    }
};

const deleteSession = async (req, res) => {
    try {
        const { id } = req.params;
        await db.collection('sessions').doc(id).delete();
        res.status(200).json({ message: 'Session deleted successfully' });
    } catch (error) {
        console.error('Error deleting session:', error);
        res.status(500).json({ message: 'Failed to delete session' });
    }
};

module.exports = { createSession, getActiveSessions, createBooking, getUpcomingBookings, getDeviceAvailability, updateSession, completeSession, deleteSession };
