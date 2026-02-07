export const isFunNightTime = (date: Date = new Date()): boolean => {
    const hours = date.getHours();
    // 9:00 PM (21:00) to 6:00 AM
    return hours >= 21 || hours < 6;
};

export const isNormalHourTime = (date: Date = new Date()): boolean => {
    // Normal Hours:
    // Monday – Friday: 2:01 PM – 9:00 PM (14:01 - 21:00)
    // Saturday – Sunday: 12:01 PM – 9:00 PM (12:01 - 21:00)

    const day = date.getDay(); // 0 is Sunday, 6 is Saturday
    const hours = date.getHours();
    const minutes = date.getMinutes();

    // Check if it's past 9 PM (Fun Night takes over)
    if (hours >= 21) return false;

    const isWeekend = day === 0 || day === 6;

    if (isWeekend) {
        // 12:01 PM - 9:00 PM
        if (hours === 12) return minutes >= 1;
        return hours >= 12;
    } else {
        // Mon-Fri: 2:01 PM - 9:00 PM
        if (hours === 14) return minutes >= 1;
        return hours >= 14;
    }
};

export const calculateSessionPrice = (
    durationHours: number,
    peopleCount: number,
    devices: { [key: string]: number },
    startTime: Date = new Date()
): number => {
    const durationMinutes = durationHours * 60;

    // Check Normal Hour first (Afternoon/Evening)
    if (isNormalHourTime(startTime)) {
        // --- NORMAL HOUR PRICING ---
        const hasVR = (devices.vr || 0) > 0 || (devices.metabat || 0) > 0;
        const hasWheel = (devices.wheel || 0) > 0;
        const hasPS = (devices.ps || 0) > 0;
        const hasPC = (devices.pc || 0) > 0;

        if (hasVR) {
            // VR & MetaBat
            // 15m: 50, 30m: 100, 1h: 180
            if (durationMinutes <= 15) return 50 * peopleCount;
            if (durationMinutes <= 30) return 100 * peopleCount;
            if (durationMinutes <= 60) return 180 * peopleCount;
            // > 1h: 180 per hour pro-rated
            return (durationMinutes / 60) * 180 * peopleCount;
        }

        if (hasWheel) {
            // Wheel
            // 1h: 150/p, 30m: 90/p, Extra 30m: 75/p
            if (durationMinutes <= 30) return 90 * peopleCount;

            // > 30m (so at least 1h usually, or 30m + extra)
            // "1 Hour: 150"
            const firstHourCost = 150;
            const extraMinutes = Math.max(0, durationMinutes - 60);
            const extra30Blocks = Math.ceil(extraMinutes / 30);
            const extraCost = extra30Blocks * 75;

            return (firstHourCost + extraCost) * peopleCount;
        }

        if (hasPC) {
            // PC
            // > 3h: 50/p/h
            if (durationHours > 3) {
                return 50 * peopleCount * durationHours;
            }
            // <= 3h
            // 1h: 60/p, Extra 30m: 40/p
            const firstHourCost = 60;
            const extraMinutes = Math.max(0, durationMinutes - 60);
            const extra30Blocks = Math.ceil(extraMinutes / 30);
            return (firstHourCost + (extra30Blocks * 40)) * peopleCount;
        }

        if (hasPS) {
            // PS5
            // Solo(1h): 140
            // Duo: 60/p
            // Trio/Squad: 50/p
            // Extra 30m: 40/p

            let baseCost = 0;
            if (peopleCount === 1) baseCost = 140;
            else if (peopleCount === 2) baseCost = 60 * 2;
            else baseCost = 50 * peopleCount;

            const extraMinutes = Math.max(0, durationMinutes - 60);
            const extra30Blocks = Math.ceil(extraMinutes / 30);
            const extraCost = extra30Blocks * 40 * peopleCount;

            return baseCost + extraCost;
        }

        // Fallback for normal hour if no devices matched (shouldn't happen)
        return 0;
    }

    // Check Fun Night Logic
    if (isFunNightTime(startTime)) {
        const hasVR = (devices.vr || 0) > 0 || (devices.metabat || 0) > 0;
        const hasWheel = (devices.wheel || 0) > 0;
        const hasPS = (devices.ps || 0) > 0;
        const hasPC = (devices.pc || 0) > 0;

        if (hasVR) {
            if (durationMinutes <= 15) return 50 * peopleCount;
            if (durationMinutes <= 30) return 100 * peopleCount;
            if (durationMinutes <= 60) return 180 * peopleCount;
            return (durationMinutes / 60) * 180 * peopleCount;
        }

        if (hasWheel) {
            if (durationMinutes <= 30) return 90 * peopleCount;
            const firstHour = 150;
            const extraMinutes = Math.max(0, durationMinutes - 60);
            const extra30Blocks = Math.ceil(extraMinutes / 30);
            return (firstHour + (extra30Blocks * 75)) * peopleCount;
        }

        if (hasPC) {
            if (durationHours > 3) return 50 * peopleCount * durationHours;
            const firstHour = 50;
            const extraMinutes = Math.max(0, durationMinutes - 60);
            const extra30Blocks = Math.ceil(extraMinutes / 30);
            return (firstHour + (extra30Blocks * 30)) * peopleCount;
        }

        if (hasPS) {
            let baseCost = 0;
            if (peopleCount === 1) baseCost = 100;
            else baseCost = 50 * peopleCount; // Duo+

            const extraMinutes = Math.max(0, durationMinutes - 60);
            const extra30Blocks = Math.ceil(extraMinutes / 30);
            return baseCost + (extra30Blocks * 30 * peopleCount);
        }
        return 0;
    }

    // Default / Standard Pricing (Fallback)
    // 50 per hour per person
    return durationHours * peopleCount * 50;
};
