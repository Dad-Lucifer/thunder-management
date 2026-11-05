import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import {
    FaCalendarAlt, FaDownload, FaChartLine, FaRobot, FaUserCog
} from 'react-icons/fa';
import DashboardLayout from '../layouts/DashboardLayout';
import {
    GlassCard, GradientTitle, ActionButton, QuickStat, TabGroup
} from '../components/owner/ui/ModernComponents';
import SubscriptionOverview from "../components/owner/SubscriptionOverview.tsx";
import RecentTransactions from '../components/owner/RecentTransactions';
import OwnerPieCharts from '../components/owner/OwnerPieCharts';
import DeletionLogs from '../components/owner/DeletionLogs';
import SnackOverview from '../components/owner/SnackOverview';
import MonthSelector from '../components/owner/MonthSelector';
import { useSessionExport } from '../components/owner/ExportSessionsReport';
import UserManagement from '../components/owner/UserManagement';
import { getClientReportingPeriods } from '../utils/reportingPeriods';
import type { ReportingMonth, ReportingPeriods, DayFilter } from '../utils/reportingPeriods';

import '../components/owner/owner-shared.css';
import './OwnerDashboard.css';

interface RevenueTrendPoint {
    time: string | number;
    amount: number;
}

interface KPIStat {
    label: string;
    value: string | number;
    trend: number;
}

// ── Hoisted Constant Helpers ──
const DAY_OPTIONS = ['All Month', 'Today', 'Yesterday', 'Day Before Yesterday'] as const;

const DAY_LABEL_MAP: Record<DayFilter, string> = {
    'all': 'All Month',
    'today': 'Today',
    'yesterday': 'Yesterday',
    'day-before-yesterday': 'Day Before Yesterday'
};

const LABEL_TO_DAY_FILTER: Record<string, DayFilter> = {
    'All Month': 'all',
    'Today': 'today',
    'Yesterday': 'yesterday',
    'Day Before Yesterday': 'day-before-yesterday'
};

const getIconForLabel = (label: string) => {
    if (label.includes('Revenue')) return FaChartLine;
    if (label.includes('Time')) return FaCalendarAlt;
    return FaRobot;
};

// ── Isolated Live Clock (prevents entire dashboard tree re-renders every 1s) ──
const LiveClock: React.FC = React.memo(() => {
    const [currentTime, setCurrentTime] = useState(() => new Date().toLocaleTimeString());

    useEffect(() => {
        const interval = setInterval(
            () => setCurrentTime(new Date().toLocaleTimeString()),
            1000
        );
        return () => clearInterval(interval);
    }, []);

    return <div className="live-clock">{currentTime}</div>;
});

const OwnerDashboard: React.FC = () => {
    const [isUserManagementOpen, setIsUserManagementOpen] = useState(false);

    // Dynamic reporting periods (Current Month and Previous Month)
    const [reportingPeriods, setReportingPeriods] = useState<ReportingPeriods>(() => getClientReportingPeriods());
    // Current month is selected by default
    const [selectedMonth, setSelectedMonth] = useState<ReportingMonth>(() => reportingPeriods.current);

    // Day sub-filter (Only for Current Month): 'all' | 'today' | 'yesterday' | 'day-before-yesterday'
    const [dayFilter, setDayFilter] = useState<DayFilter>('all');

    const [chartMode, setChartMode] = useState<'hour' | 'day'>('day');
    const [kpiStats, setKpiStats] = useState<KPIStat[]>([]);
    const [revenueTrends, setRevenueTrends] = useState<RevenueTrendPoint[]>([]);
    const [loading, setLoading] = useState(true);

    // ── Automatic Month Transition Monitor ──
    const checkMonthTransition = useCallback(() => {
        const fresh = getClientReportingPeriods();
        setReportingPeriods(prev => {
            if (prev.current.key !== fresh.current.key) {
                // Calendar month rolled over!
                setSelectedMonth(fresh.current);
                setDayFilter('all');
                return fresh;
            }
            return prev;
        });
    }, []);

    useEffect(() => {
        checkMonthTransition();

        const handleFocus = () => checkMonthTransition();
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                checkMonthTransition();
            }
        };

        window.addEventListener('focus', handleFocus);
        document.addEventListener('visibilitychange', handleVisibilityChange);

        const timer = setInterval(checkMonthTransition, 30000);

        return () => {
            window.removeEventListener('focus', handleFocus);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            clearInterval(timer);
        };
    }, [checkMonthTransition]);

    // ── Fetch dashboard data strictly for the selected month & sub-filter ──
    useEffect(() => {
        let isMounted = true;
        const fetchDashboardData = async () => {
            setLoading(true);
            const activeDayFilter = selectedMonth.isCurrent ? dayFilter : 'all';
            const queryParam = `month=${encodeURIComponent(selectedMonth.key)}${activeDayFilter !== 'all' ? `&dayFilter=${encodeURIComponent(activeDayFilter)}` : ''}`;

            try {
                const [statsRes, flowRes] = await Promise.all([
                    fetch(`/api/owner/ownerstat?${queryParam}`),
                    fetch(`/api/owner/revenueflow?${queryParam}`)
                ]);

                const statsData = await statsRes.json();
                const flowData = await flowRes.json();

                if (isMounted) {
                    setKpiStats(statsData.kpiStats || []);
                    setRevenueTrends(flowData.data || []);
                    setChartMode(flowData.groupBy || 'day');
                }
            } catch (err) {
                console.error('❌ Dashboard data fetch failed:', err);
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        fetchDashboardData();

        return () => {
            isMounted = false;
        };
    }, [selectedMonth.key, selectedMonth.isCurrent, dayFilter]);

    const { exportData, loading: exportLoading } = useSessionExport();

    const handleDownload = useCallback(() => {
        const activeDayFilter = selectedMonth.isCurrent ? dayFilter : 'all';
        exportData(selectedMonth, activeDayFilter, 'csv');
    }, [exportData, selectedMonth, dayFilter]);

    const activeDayLabel = useMemo(() => DAY_LABEL_MAP[dayFilter] || 'All Month', [dayFilter]);

    const handleDayFilterChange = useCallback((opt: string) => {
        const mapped = LABEL_TO_DAY_FILTER[opt] || 'all';
        setDayFilter(mapped);
    }, []);

    const handleMonthChange = useCallback((m: ReportingMonth) => {
        setSelectedMonth(m);
        if (!m.isCurrent) {
            setDayFilter('all');
        }
    }, []);

    const effectiveDayFilter = selectedMonth.isCurrent ? dayFilter : undefined;

    const revenueTitle = useMemo(() => {
        if (selectedMonth.isCurrent && dayFilter !== 'all') {
            if (dayFilter === 'today') return 'Revenue Flow — Today';
            if (dayFilter === 'yesterday') return 'Revenue Flow — Yesterday';
            return 'Revenue Flow — Day Before Yesterday';
        }
        return `Revenue Flow — ${selectedMonth.label}`;
    }, [selectedMonth.isCurrent, selectedMonth.label, dayFilter]);

    return (
        <DashboardLayout>
            <div className="owner-dashboard-container">

                {/* 1. Header */}
                <header className="dashboard-header">
                    <div className="header-left">
                        <h1 className="header-title">Command Center</h1>
                        <p className="header-subtitle">
                            <FaUserCog className="inline-icon" /> Welcome back, Owner
                        </p>
                    </div>

                    <div className="header-center">
                        <LiveClock />
                    </div>

                    <div className="header-actions">
                        <ActionButton
                            icon={FaDownload}
                            label={exportLoading ? "Exporting..." : "Export"}
                            onClick={handleDownload}
                            variant="primary"
                        />
                        <ActionButton
                            icon={FaUserCog}
                            label="Manage User"
                            onClick={() => setIsUserManagementOpen(true)}
                            variant="ghost"
                        />
                    </div>
                </header>

                {/* 1b. Fixed Reporting Period & Filter Toolbar (Anchors MonthSelector in fixed grid position) */}
                <div className="dashboard-filter-bar">
                    <div className="filter-bar-left">
                        <div className="month-selector-wrapper">
                            <MonthSelector
                                currentMonth={reportingPeriods.current}
                                previousMonth={reportingPeriods.previous}
                                selectedMonth={selectedMonth}
                                onChange={handleMonthChange}
                            />
                        </div>

                        <div className="day-filter-wrapper">
                            {selectedMonth.isCurrent ? (
                                <TabGroup
                                    options={DAY_OPTIONS}
                                    active={activeDayLabel}
                                    onChange={handleDayFilterChange}
                                />
                            ) : (
                                <div className="archive-badge">
                                    <span className="archive-dot" />
                                    <span>Full Month Archive ({selectedMonth.label})</span>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="filter-bar-right">
                        <span className="reporting-period-label">
                            Scope: <strong>{selectedMonth.isCurrent && dayFilter !== 'all' ? activeDayLabel : selectedMonth.label}</strong>
                        </span>
                    </div>
                </div>

                {/* 2. KPI Cards - Preserves layout height with shimmer skeleton to prevent collapse */}
                <section className="hero-stats-grid">
                    {loading
                        ? Array.from({ length: kpiStats.length > 0 ? kpiStats.length : 4 }).map((_, idx) => (
                            <div key={`kpi-skeleton-${idx}`} className="kpi-skeleton" />
                        ))
                        : kpiStats.map((stat) => (
                            <QuickStat
                                key={stat.label}
                                label={stat.label}
                                value={String(stat.value)}
                                trend={Number(stat.trend) || 0}
                                icon={getIconForLabel(stat.label)}
                                delay={0}
                            />
                        ))}
                </section>

                {/* 3. Revenue + Machine Floor */}
                <section className="operational-grid">
                    <div className="main-chart-area">
                        <GlassCard className="chart-panel">
                            <div className="panel-header">
                                <GradientTitle size="medium">
                                    {revenueTitle}
                                </GradientTitle>
                            </div>

                            <div className="chart-wrapper">
                                <ResponsiveContainer width="100%" height={350}>
                                    <AreaChart data={revenueTrends}>
                                        <defs>
                                            <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.45} />
                                                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>

                                        <CartesianGrid
                                            strokeDasharray="3 3"
                                            stroke="rgba(255,255,255,0.05)"
                                            vertical={false}
                                        />

                                        {/* X Axis = Hour for day filter, Date for full month */}
                                        <XAxis
                                            dataKey="time"
                                            stroke="#64748b"
                                            fontSize={11}
                                            tickFormatter={(val) =>
                                                chartMode === 'hour' ? `${val}:00` : val
                                            }
                                            tickLine={false}
                                            axisLine={false}
                                        />

                                        {/* Y Axis = Revenue */}
                                        <YAxis
                                            stroke="#64748b"
                                            fontSize={11}
                                            tickFormatter={(v) => `₹${v}`}
                                            tickLine={false}
                                            axisLine={false}
                                        />

                                        <Tooltip
                                            contentStyle={{
                                                backgroundColor: '#0f172a',
                                                border: '1px solid rgba(139, 92, 246, 0.3)',
                                                borderRadius: '8px'
                                            }}
                                            formatter={(value?: number) => [`₹${(value ?? 0).toLocaleString()}`, 'Revenue']}
                                            labelFormatter={(label) =>
                                                chartMode === 'hour' ? `${label}:00` : label
                                            }
                                        />

                                        <Area
                                            type="monotone"
                                            dataKey="amount"
                                            stroke="#8b5cf6"
                                            strokeWidth={3}
                                            fill="url(#colorRev)"
                                            dot={false}
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </GlassCard>
                    </div>

                    <OwnerPieCharts selectedMonth={selectedMonth} dayFilter={effectiveDayFilter} />
                </section>

                {/* 4. Secondary: Transactions + Subscriptions */}
                <section className="secondary-grid">
                    <div className="pie-charts-area">
                        <RecentTransactions selectedMonth={selectedMonth} dayFilter={effectiveDayFilter} />
                    </div>
                    <div className="transactions-area">
                        <SubscriptionOverview />
                    </div>
                </section>

                {/* 5. Snacks & Deletion Audits */}
                <section className="operational-grid snack-audit-grid">
                    <SnackOverview selectedMonth={selectedMonth} dayFilter={effectiveDayFilter} />
                    <DeletionLogs selectedMonth={selectedMonth} dayFilter={effectiveDayFilter} />
                </section>

            </div>

            <UserManagement 
                isOpen={isUserManagementOpen} 
                onClose={() => setIsUserManagementOpen(false)} 
            />
        </DashboardLayout>
    );
};

export default OwnerDashboard;
