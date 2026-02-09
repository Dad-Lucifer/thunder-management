// ---------------- TIME HELPERS ----------------

const isHappyHourTime = (date = new Date()) => {
    const day = date.getDay(); // 0 = Sun, 6 = Sat
    const hours = date.getHours();
    const minutes = date.getMinutes();

    if (hours < 9) return false;

    const isWeekend = day === 0 || day === 6;

    // Mon–Fri: 9:00 AM – 2:00 PM
    if (!isWeekend) {
        if (hours < 14) return true;
        if (hours === 14) return minutes === 0;
        return false;
    }

    // Sat–Sun: 9:00 AM – 12:00 PM
    if (hours < 12) return true;
    if (hours === 12) return minutes === 0;

    return false;
};

const isFunNightTime = (date = new Date()) => {
    const hours = date.getHours();
    return hours >= 21 || hours < 6;
};

const isNormalHourTime = (date = new Date()) => {
    const day = date.getDay();
    const hours = date.getHours();
    const minutes = date.getMinutes();

    if (hours >= 21) return false;

    const isWeekend = day === 0 || day === 6;

    if (isWeekend) {
        if (hours === 12) return minutes >= 1;
        return hours > 12;
    } else {
        if (hours === 14) return minutes >= 1;
        return hours > 14;
    }
};

// ---------------- PRICING ----------------

const calculateSessionPrice = (
    durationHours,
    peopleCount,
    devices,
    startTime = new Date()
) => {
    const durationMinutes = durationHours * 60;

    const hasVR = (devices.vr || 0) > 0 || (devices.metabat || 0) > 0;
    const hasWheel = (devices.wheel || 0) > 0;
    const hasPS = (devices.ps || 0) > 0;
    const hasPC = (devices.pc || 0) > 0;

    // 0️⃣ VR & METABAT — NO HAPPY HOUR EVER
    if (hasVR) {
        if (durationMinutes <= 15) return 50 * peopleCount;
        if (durationMinutes <= 30) return 100 * peopleCount;
        if (durationMinutes <= 60) return 180 * peopleCount;

        return (durationMinutes / 60) * 180 * peopleCount;
    }

    // 1️⃣ HAPPY HOUR
    if (isHappyHourTime(startTime)) {
        let total = 0;

        // PS5
        if (hasPS) {
            if (durationMinutes <= 30) {
                total += 40 * peopleCount;
            } else {
                const base =
                    peopleCount === 1
                        ? 90
                        : 45 * peopleCount;

                const extraMinutes = Math.max(0, durationMinutes - 60);
                const extra30Blocks = Math.ceil(extraMinutes / 30);
                total += base + (extra30Blocks * 30 * peopleCount);
            }
        }

        // PC
        if (hasPC) {
            if (durationMinutes <= 30) {
                total += 40 * peopleCount;
            } else {
                const base = 50 * peopleCount;
                const extraMinutes = Math.max(0, durationMinutes - 60);
                const extra30Blocks = Math.ceil(extraMinutes / 30);
                total += base + (extra30Blocks * 30 * peopleCount);
            }
        }

        // Wheel
        if (hasWheel) {
            if (durationMinutes <= 30) {
                total += 80 * peopleCount;
            } else {
                const base = 120 * peopleCount;
                const extraMinutes = Math.max(0, durationMinutes - 60);
                const extra30Blocks = Math.ceil(extraMinutes / 30);
                total += base + (extra30Blocks * 60);
            }
        }

        return total;
    }

    // 2️⃣ NORMAL HOUR
    if (isNormalHourTime(startTime)) {
        if (hasWheel) {
            if (durationMinutes <= 30) return 90 * peopleCount;

            const extraMinutes = Math.max(0, durationMinutes - 60);
            const extra30Blocks = Math.ceil(extraMinutes / 30);
            return (150 + (extra30Blocks * 75)) * peopleCount;
        }

        if (hasPC) {
            if (durationHours > 3) return 50 * peopleCount * durationHours;

            const extraMinutes = Math.max(0, durationMinutes - 60);
            const extra30Blocks = Math.ceil(extraMinutes / 30);
            return (60 + (extra30Blocks * 40)) * peopleCount;
        }

        if (hasPS) {
            let baseCost;
            if (peopleCount === 1) baseCost = 140;
            else if (peopleCount === 2) baseCost = 120;
            else baseCost = 50 * peopleCount;

            const extraMinutes = Math.max(0, durationMinutes - 60);
            const extra30Blocks = Math.ceil(extraMinutes / 30);
            return baseCost + (extra30Blocks * 40 * peopleCount);
        }

        return 0;
    }

    // 3️⃣ FUN NIGHT
    if (isFunNightTime(startTime)) {
        if (hasWheel) {
            if (durationMinutes <= 30) return 90 * peopleCount;

            const extraMinutes = Math.max(0, durationMinutes - 60);
            const extra30Blocks = Math.ceil(extraMinutes / 30);
            return (150 + (extra30Blocks * 75)) * peopleCount;
        }

        if (hasPC) {
            if (durationHours > 3) return 50 * peopleCount * durationHours;

            const extraMinutes = Math.max(0, durationMinutes - 60);
            const extra30Blocks = Math.ceil(extraMinutes / 30);
            return (50 + (extra30Blocks * 30)) * peopleCount;
        }

        if (hasPS) {
            const baseCost =
                peopleCount === 1 ? 100 : 50 * peopleCount;

            const extraMinutes = Math.max(0, durationMinutes - 60);
            const extra30Blocks = Math.ceil(extraMinutes / 30);
            return baseCost + (extra30Blocks * 30 * peopleCount);
        }

        return 0;
    }

    // 4️⃣ FALLBACK
    return durationHours * peopleCount * 50;
};

module.exports = {
    isHappyHourTime,
    isFunNightTime,
    isNormalHourTime,
    calculateSessionPrice
};
