const { db } = require('../config/firebase');
const { calculateRevenueByMachine } = require('../utils/pricing');
const { istHour, istDateLabel, toIstShiftedDate } = require('../utils/istTime');
const { getReportingPeriods, resolveReportingPeriod } = require('../utils/reportingPeriods');

/**
 * 🔧 Helper: safely convert Firestore Timestamp or string to JS Date
 */
const toDate = (value) => {
  if (!value) return null;
  if (value.toDate) return value.toDate(); // Firestore Timestamp
  return new Date(value); // ISO string
};

const toIsoString = (value) => {
  if (!value) return null;
  const d = toDate(value);
  if (!d || isNaN(d.getTime())) return null;
  return d.toISOString();
};

// Helper to get Pricing Config
const getPricingConfig = async () => {
  try {
    const doc = await db.collection('settings').doc('pricing').get();
    if (doc.exists) {
      const data = doc.data();
      const { getDefaultPricingConfig } = require('./pricingController');
      const defaults = getDefaultPricingConfig();
      const merged = { ...defaults };
      Object.keys(data).forEach(key => {
        if (data[key] && typeof data[key] === 'object' && !Array.isArray(data[key])) {
          merged[key] = { ...merged[key], ...data[key] };
        } else {
          merged[key] = data[key];
        }
      });
      return merged;
    }
  } catch (err) {
    console.error("Error fetching pricing for owner logic:", err);
  }
  const { getDefaultPricingConfig } = require('./pricingController');
  return getDefaultPricingConfig();
};

/**
 * Extract total snack count from session doc
 */
const countSessionSnacks = (data) => {
  let count = 0;
  const arr = (data.snackDetails && Array.isArray(data.snackDetails))
    ? data.snackDetails
    : (Array.isArray(data.snacks) ? data.snacks : null);

  if (arr) {
    arr.forEach(snack => {
      count += Number(snack.quantity ?? snack.qty) || 1;
    });
  } else if (data.snacks && typeof data.snacks === 'string') {
    data.snacks.split(',').forEach(s => {
      const match = s.trim().match(/(.*?)\s*x(\d+)$/i);
      count += match ? (parseInt(match[2], 10) || 1) : 1;
    });
  }
  return count;
};

/**
 * ======================================================
 * 📅 GET REPORTING MONTHS
 * Returns current and previous months available for reporting
 * ======================================================
 */
const getReportingMonths = async (req, res) => {
  try {
    const periods = getReportingPeriods();
    res.json({
      current: periods.current,
      previous: periods.previous,
      serverTime: new Date().toISOString()
    });
  } catch (err) {
    console.error('❌ Error getting reporting months:', err);
    res.status(500).json({ message: 'Failed to retrieve reporting months' });
  }
};

/**
 * ======================================================
 * 📊 OWNER DASHBOARD STATS (KPI)
 * ======================================================
 */
const getOwnerDashboardStats = async (req, res) => {
  try {
    const { range, month, dayFilter, subFilter } = req.query;
    const period = resolveReportingPeriod(month || range, dayFilter || subFilter);

    if (period && period.error) {
      return res.status(403).json({ message: period.message });
    }

    const { start, end } = period;

    if (!db) {
      return res.json({
        period: {
          key: period.key,
          name: period.name,
          year: period.year,
          label: period.label,
          isCurrent: period.isCurrent,
          subFilter: period.subFilter
        },
        kpiStats: [
          { label: 'Total Revenue', value: '₹0', trend: 0 },
          { label: 'Completed Sessions', value: 0, trend: 0 },
          { label: 'Avg Session Time', value: '0m', trend: 0 },
          { label: 'Snacks Sold', value: 0, trend: 0 }
        ]
      });
    }

    // Fetch sessions in selected date range
    const snapshot = await db.collection('sessions')
      .where('createdAt', '>=', start.toISOString())
      .where('createdAt', '<', end.toISOString())
      .get();

    let totalRevenue = 0;
    let totalDuration = 0;
    let completedSessions = 0;
    let snacksSold = 0;

    snapshot.forEach(doc => {
      const s = doc.data();
      totalRevenue += Number(s.price || 0);
      totalDuration += Number(s.duration || 0);
      if (s.status === 'completed') completedSessions++;
      snacksSold += countSessionSnacks(s);
    });

    const avgSessionTime =
      completedSessions > 0
        ? Math.round((totalDuration / completedSessions) * 60)
        : 0;

    // Calculate trend if full Current Month is viewed (comparing against Previous Month)
    let revTrend = 0;
    let sessTrend = 0;
    let snacksTrend = 0;

    if (period.isCurrent && period.subFilter === 'all') {
      const periods = getReportingPeriods();
      const prevSnap = await db.collection('sessions')
        .where('createdAt', '>=', periods.previous.start.toISOString())
        .where('createdAt', '<', periods.previous.end.toISOString())
        .get();

      let prevRev = 0;
      let prevCompleted = 0;
      let prevSnacks = 0;

      prevSnap.forEach(doc => {
        const s = doc.data();
        prevRev += Number(s.price || 0);
        if (s.status === 'completed') prevCompleted++;
        prevSnacks += countSessionSnacks(s);
      });

      if (prevRev > 0) revTrend = Math.round(((totalRevenue - prevRev) / prevRev) * 100);
      if (prevCompleted > 0) sessTrend = Math.round(((completedSessions - prevCompleted) / prevCompleted) * 100);
      if (prevSnacks > 0) snacksTrend = Math.round(((snacksSold - prevSnacks) / prevSnacks) * 100);
    }

    res.json({
      period: {
        key: period.key,
        name: period.name,
        year: period.year,
        label: period.label,
        isCurrent: period.isCurrent,
        subFilter: period.subFilter
      },
      kpiStats: [
        { label: 'Total Revenue', value: `₹${totalRevenue.toLocaleString()}`, trend: revTrend },
        { label: 'Completed Sessions', value: completedSessions, trend: sessTrend },
        { label: 'Avg Session Time', value: `${avgSessionTime}m`, trend: 0 },
        { label: 'Snacks Sold', value: snacksSold, trend: snacksTrend }
      ]
    });

  } catch (err) {
    console.error('❌ owner dashboard error:', err);
    res.status(500).json({ message: 'Dashboard stats error' });
  }
};

/**
 * ======================================================
 * 📈 REVENUE FLOW (CHART)
 * Displays hourly revenue for day filters (Today, Yesterday, Day Before Yesterday)
 * or daily revenue for full month view
 * ======================================================
 */
const getRevenueFlow = async (req, res) => {
  try {
    const { range, month, dayFilter, subFilter } = req.query;
    const period = resolveReportingPeriod(month || range, dayFilter || subFilter);

    if (period && period.error) {
      return res.status(403).json({ message: period.message });
    }

    const { start, end } = period;
    const groupBy = period.groupBy || 'day';

    const buckets = {};
    if (groupBy === 'hour') {
      for (let h = 0; h < 24; h++) {
        buckets[String(h).padStart(2, '0')] = 0;
      }
    } else {
      const cursor = new Date(start.getTime());
      while (cursor.getTime() < end.getTime()) {
        const label = istDateLabel(cursor);
        buckets[label] = 0;
        cursor.setTime(cursor.getTime() + 24 * 60 * 60 * 1000);
      }
    }

    if (!db) {
      const fallbackData = groupBy === 'hour'
        ? Array.from({ length: 24 }, (_, h) => ({ time: String(h).padStart(2, '0'), amount: 0 }))
        : Object.entries(buckets).map(([time, amount]) => ({ time, amount }));

      return res.json({
        groupBy,
        month: period.name,
        year: period.year,
        label: period.label,
        subFilter: period.subFilter,
        data: fallbackData
      });
    }

    const snapshot = await db.collection('sessions')
      .where('createdAt', '>=', start.toISOString())
      .where('createdAt', '<', end.toISOString())
      .get();

    snapshot.forEach(doc => {
      const s = doc.data();
      const createdAt = toDate(s.createdAt);
      if (!createdAt) return;

      const key = groupBy === 'hour'
        ? String(istHour(createdAt)).padStart(2, '0')
        : istDateLabel(createdAt);

      if (buckets[key] !== undefined) {
        buckets[key] += Number(s.price || 0);
      } else {
        buckets[key] = (buckets[key] || 0) + Number(s.price || 0);
      }
    });

    const result = groupBy === 'hour'
      ? Array.from({ length: 24 }, (_, h) => {
          const key = String(h).padStart(2, '0');
          return { time: key, amount: buckets[key] || 0 };
        })
      : Object.entries(buckets).map(([time, amount]) => ({
          time,
          amount
        }));

    res.json({
      groupBy,
      month: period.name,
      year: period.year,
      label: period.label,
      subFilter: period.subFilter,
      data: result
    });

  } catch (err) {
    console.error('❌ revenue flow error:', err);
    res.status(500).json({ message: 'Revenue flow error' });
  }
};

/**
 * ======================================================
 * 🧾 RECENT TRANSACTIONS
 * ======================================================
 */
const getRecentTransactions = async (req, res) => {
  try {
    const { range, month, dayFilter, subFilter } = req.query;
    const period = resolveReportingPeriod(month || range, dayFilter || subFilter);

    if (period && period.error) {
      return res.status(403).json({ message: period.message });
    }

    const { start, end } = period;

    if (!db) return res.json([]);

    const snapshot = await db
      .collection('sessions')
      .where('createdAt', '>=', start.toISOString())
      .where('createdAt', '<', end.toISOString())
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get();

    const transactions = snapshot.docs
      .map(doc => {
        const s = doc.data();
        if (s.status !== 'completed' && s.status !== 'active') return null;

        const rawTs = s.completedAt ?? s.createdAt;
        const timestamp = toIsoString(rawTs);

        // ── Flatten snacks array (supports both snacks and snackDetails field names) ──
        const snackArr = (s.snackDetails && Array.isArray(s.snackDetails) && s.snackDetails.length > 0)
          ? s.snackDetails
          : (Array.isArray(s.snacks) ? s.snacks : []);

        const formattedSnacks = snackArr
          .map(snack => {
            let name = snack.name;
            if (name && typeof name === 'object') name = name.name || name.label || null;
            if (!name && snack.item) name = typeof snack.item === 'string' ? snack.item : snack.item?.name;
            const cleanName = typeof name === 'string' ? name.trim() : null;
            if (!cleanName) return null;
            return {
              name: cleanName,
              quantity: Number(snack.quantity ?? snack.qty) || 1,
              price: Number(snack.price || 0)
            };
          })
          .filter(Boolean);

        // ── Flatten devices object to readable string array e.g. ["PS3", "PC1"] ──
        const deviceList = [];
        if (s.devices && typeof s.devices === 'object') {
          Object.entries(s.devices).forEach(([type, val]) => {
            if (Array.isArray(val)) {
              val.forEach(id => { if (id) deviceList.push(`${type.toUpperCase()}${id}`); });
            } else if (typeof val === 'number' && val > 0) {
              deviceList.push(`${type.toUpperCase()}×${val}`);
            }
          });
        }

        // ── Session renewal check (consistent with export logic) ──
        const isRenewed = !!(
          (s.members && s.members.length > 0) ||
          (s.updatedAt && s.updatedAt !== s.createdAt)
        );

        const customerName = s.customerName || s.customer || 'Unknown';
        const contactNumber = (s.contactNumber && String(s.contactNumber).trim()) || (s.phoneNumber && String(s.phoneNumber).trim()) || null;
        const totalAmount = Number(s.price || s.paidAmount || 0);
        const cashAmount = Number(s.cash || 0);
        const onlineAmount = Number(s.online || 0);

        return {
          id: doc.id,
          item: `${customerName} (${s.duration || 0}h)`,
          amount: totalAmount,
          status: s.status,
          timestamp,
          // ── Detail fields for drill-down drawer ──
          customerName,
          contactNumber,
          devices: deviceList,
          duration: s.duration || 0,
          peopleCount: Number(s.peopleCount || 1),
          snacks: formattedSnacks,
          cashAmount,
          onlineAmount,
          isRenewed
        };
      })
      .filter(Boolean)
      .sort((a, b) => {
        if (!a.timestamp && !b.timestamp) return 0;
        if (!a.timestamp) return 1;
        if (!b.timestamp) return -1;
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      })
      .slice(0, 15);

    res.json(transactions);

  } catch (err) {
    console.error('❌ recent transactions error:', err);
    res.status(500).json({ message: 'Recent transactions error' });
  }
};

/**
 * ======================================================
 * 🥧 REVENUE BY MACHINE (PIE)
 * ======================================================
 */
const getRevenueByMachine = async (req, res) => {
  try {
    const { range, month, dayFilter, subFilter } = req.query;
    const period = resolveReportingPeriod(month || range, dayFilter || subFilter);

    if (period && period.error) {
      return res.status(403).json({ message: period.message });
    }

    const { start, end } = period;

    if (!db) return res.json([]);

    const snapshot = await db.collection('sessions')
      .where('createdAt', '>=', start.toISOString())
      .where('createdAt', '<', end.toISOString())
      .get();

    const totals = {
      ps: 0,
      pc: 0,
      vr: 0,
      wheel: 0,
      metabat: 0
    };

    const pricingConfig = await getPricingConfig();

    snapshot.forEach(doc => {
      const s = doc.data();

      // Ensure status is completed
      if (s.status !== 'completed') return;

      const createdAt = toDate(s.createdAt);
      if (!createdAt) return;

      const split = calculateRevenueByMachine(
        s.duration,
        s.peopleCount,
        s.devices,
        toIstShiftedDate(createdAt),
        pricingConfig
      );

      Object.keys(totals).forEach(k => {
        if (totals[k] !== undefined && split[k]) {
          totals[k] += split[k];
        }
      });
    });

    const result = Object.entries(totals)
      .filter(([, v]) => v > 0)
      .map(([k, v]) => ({
        name: k.toUpperCase(),
        value: Math.round(v)
      }));

    res.json(result);

  } catch (err) {
    console.error('❌ revenue by machine error:', err);
    res.status(500).json({ message: 'Revenue by machine error' });
  }
};

/**
 * ======================================================
 * 🗑️ DELETION LOGS
 * ======================================================
 */
const getDeletionLogs = async (req, res) => {
  try {
    const { range, month, dayFilter, subFilter } = req.query;
    const period = resolveReportingPeriod(month || range, dayFilter || subFilter);

    if (period && period.error) {
      return res.status(403).json({ message: period.message });
    }

    const { start, end } = period;

    if (!db) return res.json([]);

    const snapshot = await db.collection('deletion_logs')
      .where('deletedAt', '>=', start.toISOString())
      .where('deletedAt', '<', end.toISOString())
      .orderBy('deletedAt', 'desc')
      .get();

    const logs = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    res.json(logs);
  } catch (err) {
    console.error('❌ deletion logs error:', err);
    res.status(500).json({ message: 'Deletion logs error' });
  }
};

/**
 * ======================================================
 * 🍿 PRODUCT & BEVERAGE SALES STATS
 * Aggregates snack/drink sales and top items
 * ======================================================
 */
const getSnackSalesStats = async (req, res) => {
  try {
    const { range, month, dayFilter, subFilter } = req.query;
    const period = resolveReportingPeriod(month || range, dayFilter || subFilter);

    if (period && period.error) {
      return res.status(403).json({ message: period.message });
    }

    const { start, end } = period;

    if (!db) {
      return res.json({
        month: period.name,
        year: period.year,
        label: period.label,
        subFilter: period.subFilter,
        totalSnacksSold: 0,
        totalSnackRevenue: 0,
        topItems: []
      });
    }

    const snapshot = await db.collection('sessions')
      .where('createdAt', '>=', start.toISOString())
      .where('createdAt', '<', end.toISOString())
      .get();

    const itemMap = {};
    let totalSnacksSold = 0;
    let totalSnackRevenue = 0;

    snapshot.forEach(doc => {
      const s = doc.data();

      // Check snack details
      const arr = (s.snackDetails && Array.isArray(s.snackDetails))
        ? s.snackDetails
        : (Array.isArray(s.snacks) ? s.snacks : null);

      if (arr) {
        arr.forEach(snack => {
          let name = snack.name;
          if (name && typeof name === 'object') name = name.name || name.label || null;
          if (!name && snack.item) name = typeof snack.item === 'string' ? snack.item : snack.item?.name;
          const cleanName = typeof name === 'string' ? name.trim() : null;
          if (cleanName) {
            const qty = Number(snack.quantity ?? snack.qty) || 1;
            const price = Number(snack.price || 0) * qty;
            itemMap[cleanName] = (itemMap[cleanName] || 0) + qty;
            totalSnacksSold += qty;
            totalSnackRevenue += price;
          }
        });
      } else if (s.isSnackOnly) {
        totalSnackRevenue += Number(s.price || 0);
      }
    });

    const topItems = Object.entries(itemMap)
      .map(([name, qty]) => ({ name, qty }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 10);

    res.json({
      month: period.name,
      year: period.year,
      label: period.label,
      subFilter: period.subFilter,
      totalSnacksSold,
      totalSnackRevenue,
      topItems
    });

  } catch (err) {
    console.error('❌ snack sales stats error:', err);
    res.status(500).json({ message: 'Failed to retrieve snack sales stats' });
  }
};

module.exports = {
  getReportingMonths,
  getOwnerDashboardStats,
  getRevenueFlow,
  getRecentTransactions,
  getRevenueByMachine,
  getDeletionLogs,
  getSnackSalesStats
};
