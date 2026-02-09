export const isHappyHourTime = (date: Date = new Date()): boolean => {
    const day = date.getDay(); // 0 = Sun, 6 = Sat
    const hours = date.getHours();
    const minutes = date.getMinutes();

    // Before 9 AM → not Happy Hour
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
    return false;
};

export const calculateSessionPrice = (
    durationHours: number,
    peopleCount: number,
    devices: { [key: string]: number },
    startTime: Date = new Date()
): number => {
    const durationMinutes = durationHours * 60;

    const hasVR = (devices.vr || 0) > 0 || (devices.metabat || 0) > 0;
    const hasWheel = (devices.wheel || 0) > 0;
    const hasPS = (devices.ps || 0) > 0;
    const hasPC = (devices.pc || 0) > 0;

    // --------------------------------------------------
    // 0️⃣ VR & METABAT (NO HAPPY HOUR / NO TIME RULES)
    // --------------------------------------------------
    if (hasVR) {
        if (durationMinutes <= 15) return 50 * peopleCount;
        if (durationMinutes <= 30) return 100 * peopleCount;
        if (durationMinutes <= 60) return 180 * peopleCount;

        return (durationMinutes / 60) * 180 * peopleCount;
    }

    // --------------------------------------------------
    // 1️⃣ HAPPY HOUR
    // --------------------------------------------------
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

    // --------------------------------------------------
    // 2️⃣ NORMAL HOUR
    // --------------------------------------------------
    else if (isNormalHourTime(startTime)) {
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

    // --------------------------------------------------
    // 3️⃣ FUN NIGHT
    // --------------------------------------------------
    else if (isFunNightTime(startTime)) {
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

    // --------------------------------------------------
    // 4️⃣ FALLBACK
    // --------------------------------------------------
    return durationHours * peopleCount * 50;
};

