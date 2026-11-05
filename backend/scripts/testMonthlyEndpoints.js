const assert = require('assert');
const {
  getReportingMonths,
  getOwnerDashboardStats,
  getRevenueFlow,
  getRecentTransactions,
  getRevenueByMachine,
  getDeletionLogs,
  getSnackSalesStats
} = require('../src/controllers/ownerDashboardController');
const { exportSessions } = require('../src/controllers/sessionController');

// Helper to create mock Express req and res
function createMockContext(query = {}) {
  const req = { query, headers: {} };
  const res = {
    statusCode: 200,
    headers: {},
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = data;
      return this;
    }
  };
  return { req, res };
}

async function runTests() {
  console.log('🚀 Running Controller & Security Verification Tests...\n');

  // Test 1: getReportingMonths
  console.log('Test 1: getReportingMonths controller endpoint');
  const { req: req1, res: res1 } = createMockContext();
  await getReportingMonths(req1, res1);
  assert.strictEqual(res1.statusCode, 200);
  assert.ok(res1.body.current, 'Should return current month');
  assert.ok(res1.body.previous, 'Should return previous month');
  assert.strictEqual(res1.body.current.key, '2026-11');
  assert.strictEqual(res1.body.previous.key, '2026-10');
  console.log('  ✅ Current month: ' + res1.body.current.label + ', Previous month: ' + res1.body.previous.label);

  // Test 2: Access control rejection on ownerstat for older month (e.g. 2026-08)
  console.log('\nTest 2: Security check - unauthorized month rejection');
  const { req: req2, res: res2 } = createMockContext({ month: '2026-08' });
  await getOwnerDashboardStats(req2, res2);
  assert.strictEqual(res2.statusCode, 403, 'Should reject older historical month with 403');
  assert.ok(res2.body.message.includes('Access restricted'), 'Should return clear restriction message');
  console.log('  ✅ 403 Forbidden verified for unauthorized historical month');

  // Test 3: Access control rejection on session export for older month
  console.log('\nTest 3: Security check - export unauthorized month rejection');
  const { req: req3, res: res3 } = createMockContext({ month: '2026-05' });
  await exportSessions(req3, res3);
  assert.strictEqual(res3.statusCode, 403);
  console.log('  ✅ 403 Forbidden verified for unauthorized export request');

  // Test 4: Revenue Flow pre-populates days for selected month (all)
  console.log('\nTest 4: Revenue Flow pre-populates days for selected month (all month)');
  const { req: req4, res: res4 } = createMockContext({ month: '2026-11', dayFilter: 'all' });
  await getRevenueFlow(req4, res4);
  assert.strictEqual(res4.statusCode, 200);
  assert.strictEqual(res4.body.groupBy, 'day');
  assert.strictEqual(res4.body.month, 'November');
  assert.strictEqual(res4.body.year, 2026);
  assert.ok(Array.isArray(res4.body.data), 'Data must be an array of time buckets');
  assert.strictEqual(res4.body.data.length, 30, 'November must have 30 daily data points');
  assert.strictEqual(res4.body.data[0].time, '01 Nov');
  assert.strictEqual(res4.body.data[29].time, '30 Nov');
  console.log('  ✅ November generated exactly 30 days: ' + res4.body.data[0].time + ' to ' + res4.body.data[29].time);

  // Test 5: October 2026 (Previous Month) ignores dayFilter and returns 31 days
  console.log('\nTest 5: Previous Month ignores dayFilter and returns full month (31 days)');
  const { req: req5, res: res5 } = createMockContext({ month: '2026-10', dayFilter: 'today' });
  await getRevenueFlow(req5, res5);
  assert.strictEqual(res5.statusCode, 200);
  assert.strictEqual(res5.body.groupBy, 'day');
  assert.strictEqual(res5.body.data.length, 31, 'October must have 31 daily data points');
  console.log('  ✅ October safely ignored daily filter and produced 31 daily buckets');

  // Test 6: Day Filter "today" on Current Month returns hourly buckets (24 hours)
  console.log('\nTest 6: Day Filter "today" on Current Month returns 24 hourly buckets');
  const { req: req6, res: res6 } = createMockContext({ month: '2026-11', dayFilter: 'today' });
  await getRevenueFlow(req6, res6);
  assert.strictEqual(res6.statusCode, 200);
  assert.strictEqual(res6.body.groupBy, 'hour');
  assert.strictEqual(res6.body.data.length, 24);
  assert.strictEqual(res6.body.data[0].time, '00');
  assert.strictEqual(res6.body.data[23].time, '23');
  console.log('  ✅ Today hourly breakdown confirmed (00:00 to 23:00)');

  // Test 7: Day Filter "yesterday" on Current Month returns 24 hourly buckets
  console.log('\nTest 7: Day Filter "yesterday" on Current Month returns 24 hourly buckets');
  const { req: req7, res: res7 } = createMockContext({ month: '2026-11', dayFilter: 'yesterday' });
  await getRevenueFlow(req7, res7);
  assert.strictEqual(res7.statusCode, 200);
  assert.strictEqual(res7.body.groupBy, 'hour');
  assert.strictEqual(res7.body.data.length, 24);
  console.log('  ✅ Yesterday hourly breakdown confirmed');

  // Test 8: Day Filter "day-before-yesterday" on Current Month returns 24 hourly buckets
  console.log('\nTest 8: Day Filter "day-before-yesterday" on Current Month returns 24 hourly buckets');
  const { req: req8, res: res8 } = createMockContext({ month: '2026-11', dayFilter: 'day-before-yesterday' });
  await getRevenueFlow(req8, res8);
  assert.strictEqual(res8.statusCode, 200);
  assert.strictEqual(res8.body.groupBy, 'hour');
  assert.strictEqual(res8.body.data.length, 24);
  console.log('  ✅ Day Before Yesterday hourly breakdown confirmed');

  // Test 9: Export Sessions with dayFilter "today"
  console.log('\nTest 9: Export Sessions title for "today" filter');
  const { req: req9, res: res9 } = createMockContext({ month: '2026-11', dayFilter: 'today' });
  await exportSessions(req9, res9);
  assert.strictEqual(res9.statusCode, 200);
  assert.ok(res9.body.title.includes('TODAY'), 'Export title must mention TODAY');
  console.log('  ✅ Export title for today: ' + res9.body.title);

  console.log('\n🎉 ALL 9 INTEGRATION & SECURITY TESTS PASSED!');
}

runTests().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
