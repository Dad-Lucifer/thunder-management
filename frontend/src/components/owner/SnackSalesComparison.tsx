
import React, { useMemo } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts';
import { SNACK_INTELLIGENCE } from '../../data/mockOwnerData';
import { GlassCard, GradientTitle, TrendBadge } from './ui/ModernComponents';

const SnackSalesComparison: React.FC = () => {
    // Determine overall trend
    const { totalCurrent, totalLast, trend } = useMemo(() => {
        const current = SNACK_INTELLIGENCE.reduce((acc, item) => acc + (item.soldCount || 0), 0);
        const last = SNACK_INTELLIGENCE.reduce((acc, item) => acc + (item.soldCountLastMonth || 0), 0);
        const diff = current - last;
        const trendPct = last > 0 ? (diff / last) * 100 : 0;
        return { totalCurrent: current, totalLast: last, trend: trendPct };
    }, []);

    return (
        <GlassCard>
            {/* Header with explicit inline styles to avoid class conflicts */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div>
                    <GradientTitle size="medium">Monthly Snack Sales</GradientTitle>
                    <p style={{ color: '#94a3b8', fontSize: '0.875rem', margin: 0 }}>
                        {totalCurrent} units sold (vs {totalLast} last month)
                    </p>
                </div>
                <div style={{ transform: 'scale(1.1)' }}>
                    <TrendBadge value={trend.toFixed(1)} isPositive={trend >= 0} />
                </div>
            </div>

            {/* Explicit Height Container to ensure Recharts renders */}
            <div style={{ width: '100%', height: 350 }}>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        data={SNACK_INTELLIGENCE}
                        margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                        barGap={8}
                    >
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                        <XAxis
                            dataKey="name"
                            stroke="#94a3b8"
                            fontSize={11}
                            tickLine={false}
                            axisLine={false}
                            dy={10}
                        />
                        <YAxis
                            stroke="#94a3b8"
                            fontSize={11}
                            tickLine={false}
                            axisLine={false}
                        />
                        <Tooltip
                            contentStyle={{ backgroundColor: '#1e293b', borderColor: 'rgba(255,255,255,0.1)', color: '#f8fafc' }}
                            itemStyle={{ color: '#f8fafc' }}
                            cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                        />
                        <Legend wrapperStyle={{ paddingTop: '20px' }} iconType="circle" />
                        <Bar
                            dataKey="soldCount"
                            name="This Month"
                            fill="#eab308"
                            radius={[4, 4, 0, 0]}
                            barSize={40}
                            animationDuration={1500}
                        />
                        <Bar
                            dataKey="soldCountLastMonth"
                            name="Last Month"
                            fill="#94a3b8"
                            radius={[4, 4, 0, 0]}
                            fillOpacity={0.6}
                            barSize={40}
                            animationDuration={1500}
                        />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </GlassCard>
    );
};

export default SnackSalesComparison;
