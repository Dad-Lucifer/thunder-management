const assert = require('assert');
const { getReportingPeriods, resolveReportingPeriod } = require('../src/utils/reportingPeriods');
const { IST_OFFSET_MS } = require('../src/utils/istTime');

console.log('🧪 Starting Reporting Periods Test Suite...\n');

// 1. Current Test: November 2026
const nowNov2026 = new Date('2026-11-05T00:30:52+05:30');
const periodsNov = getReportingPeriods(nowNov2026);

console.log('Test 1: November 2026 check');
assert.strictEqual(periodsNov.current.key, '2026-11');
assert.strictEqual(periodsNov.current.name, 'November');
assert.strictEqual(periodsNov.current.year, 2026);
assert.strictEqual(periodsNov.previous.key, '2026-10');
assert.strictEqual(periodsNov.previous.name, 'October');
assert.strictEqual(periodsNov.previous.year, 2026);

// Boundary timestamps check
const novStart = periodsNov.current.start;
const novEnd = periodsNov.current.end;
const octStart = periodsNov.previous.start;
const octEnd = periodsNov.previous.end;

// In IST: novStart should be 2026-11-01 00:00:00 IST (2026-10-31 18:30:00 UTC)
assert.strictEqual(novStart.toISOString(), '2026-10-31T18:30:00.000Z');
assert.strictEqual(novEnd.toISOString(), '2026-11-30T18:30:00.000Z');
assert.strictEqual(octStart.toISOString(), '2026-09-30T18:30:00.000Z');
assert.strictEqual(octEnd.toISOString(), novStart.toISOString());
console.log('  ✅ November 2026 boundaries verified');

// 2. Year Boundary Test: January 2027
console.log('\nTest 2: Year boundary transition (January 2027)');
const nowJan2027 = new Date('2027-01-05T10:00:00+05:30');
const periodsJan = getReportingPeriods(nowJan2027);
assert.strictEqual(periodsJan.current.key, '2027-01');
assert.strictEqual(periodsJan.current.name, 'January');
assert.strictEqual(periodsJan.current.year, 2027);
assert.strictEqual(periodsJan.previous.key, '2026-12');
assert.strictEqual(periodsJan.previous.name, 'December');
assert.strictEqual(periodsJan.previous.year, 2026);
assert.strictEqual(periodsJan.previous.end.toISOString(), periodsJan.current.start.toISOString());
console.log('  ✅ Year transition Jan 2027 -> Dec 2026 verified');

// 3. Leap Year Test: March 2028 (2028 is a leap year)
console.log('\nTest 3: Leap year transition (March 2028)');
const nowMar2028 = new Date('2028-03-01T01:00:00+05:30');
const periodsMar2028 = getReportingPeriods(nowMar2028);
assert.strictEqual(periodsMar2028.current.key, '2028-03');
assert.strictEqual(periodsMar2028.previous.key, '2028-02');
// February 2028 has 29 days: 29 * 24 * 3600 * 1000 ms
const febDurationMs = periodsMar2028.previous.end.getTime() - periodsMar2028.previous.start.getTime();
const daysInFeb = febDurationMs / (24 * 60 * 60 * 1000);
assert.strictEqual(daysInFeb, 29);
console.log(`  ✅ Leap year February 2028 confirmed to have ${daysInFeb} days`);

// 4. Resolution & Validation Test
console.log('\nTest 4: Period resolution & boundary enforcement');
const resCurrent = resolveReportingPeriod('2026-11', nowNov2026);
assert.strictEqual(resCurrent.key, '2026-11');

const resPrevious = resolveReportingPeriod('2026-10', nowNov2026);
assert.strictEqual(resPrevious.key, '2026-10');

const resDefault = resolveReportingPeriod('', nowNov2026);
assert.strictEqual(resDefault.key, '2026-11');

// Unauthorized historical month: September 2026
const resUnauthorized = resolveReportingPeriod('2026-09', nowNov2026);
assert.strictEqual(resUnauthorized.error, 'UNAUTHORIZED_PERIOD');
console.log('  ✅ Unauthorized access properly blocked with UNAUTHORIZED_PERIOD');

// 5. Timestamp exact matching test (timestamp >= start && timestamp < end)
console.log('\nTest 5: Record boundary matching test');
const tsLastSecOct = new Date('2026-10-31T23:59:59.999+05:30');
const tsFirstSecNov = new Date('2026-11-01T00:00:00.000+05:30');

// Last ms of October belongs to October
assert.ok(tsLastSecOct >= octStart && tsLastSecOct < octEnd, 'Last ms of Oct must belong to October');
assert.ok(!(tsLastSecOct >= novStart && tsLastSecOct < novEnd), 'Last ms of Oct must NOT belong to November');

// First ms of November belongs to November
assert.ok(tsFirstSecNov >= novStart && tsFirstSecNov < novEnd, 'First ms of Nov must belong to November');
assert.ok(!(tsFirstSecNov >= octStart && tsFirstSecNov < octEnd), 'First ms of Nov must NOT belong to October');
console.log('  ✅ No timestamp overlap or data leakage across month boundary');

console.log('\n🎉 ALL 5 TESTS PASSED SUCCESSFULLY!');
