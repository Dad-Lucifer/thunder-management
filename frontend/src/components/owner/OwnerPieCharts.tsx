
import React, { useMemo } from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import { MACHINE_ANALYTICS, SNACK_INTELLIGENCE } from '../../data/mockOwnerData';
import { GlassCard, GradientTitle } from './ui/ModernComponents';

const COLORS = ['#eab308', '#3b82f6', '#94a3b8', '#1e40af', '#ffffff'];

const CustomPieChart = ({ title, data, dataKey, nameKey }: { title: string, data: any[], dataKey: string, nameKey: string }) => {
    return (
        <GlassCard>
            <GradientTitle size="medium">{title}</GradientTitle>
            <div style={{ width: '100%', height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={data}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={100}
                            paddingAngle={5}
                            dataKey={dataKey}
                            nameKey={nameKey}
                            stroke="none"
                        >
                            {data.map((_, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip
                            contentStyle={{ backgroundColor: '#1e293b', borderColor: 'rgba(255,255,255,0.1)', color: '#f8fafc' }}
                            itemStyle={{ color: '#f8fafc' }}
                        />
                        <Legend
                            verticalAlign="bottom"
                            height={36}
                            iconType="circle"
                            wrapperStyle={{ color: '#94a3b8', fontSize: '12px', paddingTop: '10px' }}
                        />
                    </PieChart>
                </ResponsiveContainer>
            </div>
        </GlassCard>
    );
};

const OwnerPieCharts: React.FC = () => {
    // Transform Machine Data for Pie (Revenue Share)
    const machineData = useMemo(() => {
        return MACHINE_ANALYTICS.map(m => ({ name: m.name.split('(')[0].trim(), value: m.revenue }));
    }, []);

    // Transform Snack Data for Pie (Sales Share)
    const snackData = useMemo(() => {
        return SNACK_INTELLIGENCE.map(s => ({ name: s.name, value: s.soldCount }));
    }, []);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '1.5rem' }}>
            <CustomPieChart
                title="Revenue by Machine"
                data={machineData}
                dataKey="value"
                nameKey="name"
            />
            <CustomPieChart
                title="Snack Popularity"
                data={snackData}
                dataKey="value"
                nameKey="name"
            />
        </div>
    );
};

export default OwnerPieCharts;
