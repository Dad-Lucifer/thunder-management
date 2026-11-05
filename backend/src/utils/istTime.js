// istTime.js - Single source of truth for IST timezone logic

const IST_OFFSET_MINUTES = 330;
const IST_OFFSET_MS = IST_OFFSET_MINUTES * 60 * 1000;

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Returns a new Date shifted +330 minutes from the input UTC date.
 * If the Date was already shifted, it returns it directly to prevent double-shifting.
 */
function toIstShiftedDate(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  if (d._isIstShifted) return d;
  const shifted = new Date(d.getTime() + IST_OFFSET_MS);
  shifted._isIstShifted = true;
  return shifted;
}

/**
 * shift by +330 min, zero the UTC hours, shift back.
 * Returns true UTC Date representing IST midnight (00:00:00 IST).
 */
function startOfIstDay(now = new Date()) {
  const d = now instanceof Date ? now : new Date(now);
  const shifted = new Date(d.getTime() + IST_OFFSET_MS);
  shifted.setUTCHours(0, 0, 0, 0);
  return new Date(shifted.getTime() - IST_OFFSET_MS);
}

/**
 * Returns { start, end } as true UTC Dates, with end exclusive:
 * - today: [IST midnight, +24h)
 * - yesterday: [-24h, IST midnight)
 * - lastweek: last 7 IST days including today [IST midnight - 6d, IST midnight + 24h)
 * - thismonth: IST 1st of month to next month's 1st
 */
function getRange(range, now = new Date()) {
  const startToday = startOfIstDay(now);

  switch (range) {
    case 'today':
      return {
        start: startToday,
        end: new Date(startToday.getTime() + 24 * 60 * 60 * 1000)
      };

    case 'yesterday':
      return {
        start: new Date(startToday.getTime() - 24 * 60 * 60 * 1000),
        end: startToday
      };

    case 'lastweek':
      return {
        start: new Date(startToday.getTime() - 6 * 24 * 60 * 60 * 1000),
        end: new Date(startToday.getTime() + 24 * 60 * 60 * 1000)
      };

    case 'thismonth': {
      const d = now instanceof Date ? now : new Date(now);
      const shifted = new Date(d.getTime() + IST_OFFSET_MS);
      const y = shifted.getUTCFullYear();
      const m = shifted.getUTCMonth();
      return {
        start: new Date(Date.UTC(y, m, 1, 0, 0, 0, 0) - IST_OFFSET_MS),
        end: new Date(Date.UTC(y, m + 1, 1, 0, 0, 0, 0) - IST_OFFSET_MS)
      };
    }

    default:
      return {
        start: startToday,
        end: new Date(startToday.getTime() + 24 * 60 * 60 * 1000)
      };
  }
}

/**
 * Computed via the +330 min shift and UTC getters (never getHours/getDay).
 */
function istHour(date = new Date()) {
  return toIstShiftedDate(date).getUTCHours();
}

function istMinute(date = new Date()) {
  return toIstShiftedDate(date).getUTCMinutes();
}

function istDay(date = new Date()) {
  return toIstShiftedDate(date).getUTCDay();
}

/**
 * Format date as "DD Mon", e.g. "03 Oct", computed via +330 min shift and UTC getters.
 */
function istDateLabel(date = new Date()) {
  const shifted = toIstShiftedDate(date);
  const day = String(shifted.getUTCDate()).padStart(2, '0');
  const month = MONTH_LABELS[shifted.getUTCMonth()];
  return `${day} ${month}`;
}

module.exports = {
  IST_OFFSET_MINUTES,
  IST_OFFSET_MS,
  toIstShiftedDate,
  startOfIstDay,
  getRange,
  istHour,
  istMinute,
  istDay,
  istDateLabel
};
