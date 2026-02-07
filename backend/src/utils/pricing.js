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
        return hours >= 12;
    } else {
        if (hours === 14) return minutes >= 1;
        return hours >= 14;
    }
};

const calculateSessionPrice = (durationHours, peopleCount, devices, startTime = new Date()) => {
    const durationMinutes = durationHours * 60;

    // Normal Hour Pricing
    if (isNormalHourTime(startTime)) {
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
            const firstHourCost = 150;
            const extraMinutes = Math.max(0, durationMinutes - 60);
            const extra30Blocks = Math.ceil(extraMinutes / 30);
            return (firstHourCost + (extra30Blocks * 75)) * peopleCount;
        }

        if (hasPC) {
            if (durationHours > 3) return 50 * peopleCount * durationHours;
            const firstHourCost = 60;
            const extraMinutes = Math.max(0, durationMinutes - 60);
            const extra30Blocks = Math.ceil(extraMinutes / 30);
            return (firstHourCost + (extra30Blocks * 40)) * peopleCount;
        }

        if (hasPS) {
            let baseCost = 0;
            if (peopleCount === 1) baseCost = 140;
            else if (peopleCount === 2) baseCost = 60 * 2;
            else baseCost = 50 * peopleCount;

            const extraMinutes = Math.max(0, durationMinutes - 60);
            const extra30Blocks = Math.ceil(extraMinutes / 30);
            return baseCost + (extra30Blocks * 40 * peopleCount);
        }

        return 0;
    }

    // Fun Night Pricing
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
            else baseCost = 50 * peopleCount;

            const extraMinutes = Math.max(0, durationMinutes - 60);
            const extra30Blocks = Math.ceil(extraMinutes / 30);
            return baseCost + (extra30Blocks * 30 * peopleCount);
        }
        return 0;
    }

    // Default
    return durationHours * peopleCount * 50;
};

module.exports = {
    isFunNightTime,
    isNormalHourTime,
    calculateSessionPrice
};
