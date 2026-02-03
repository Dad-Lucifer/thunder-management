
import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { motion } from 'framer-motion';

const data = [
    { name: 'Coke', value: 400 },
    { name: 'Chips', value: 300 },
    { name: 'Coffee', value: 300 },
    { name: 'Sandwich', value: 200 },
    { name: 'Candy', value: 150 },
];

const COLORS = ['#fbbf24', '#f59e0b', '#d97706', '#b45309', '#78350f']; // Shades of Amber/Yellow

const RADIAN = Math.PI / 180;
const renderCustomizedLabel = ({ cx = 0, cy = 0, midAngle = 0, innerRadius = 0, outerRadius = 0, percent = 0 }: { cx?: number, cy?: number, midAngle?: number, innerRadius?: number, outerRadius?: number, percent?: number }) => {
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
        <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize={12}>
            {`${(percent * 100).toFixed(0)}%`}
        </text>
    );
};

const SnacksConsumptionChart: React.FC = () => {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="cyber-card"
            style={{
                padding: "24px",
                height: "400px",
                display: "flex",
                flexDirection: "column"
            }}
        >
            <h3 style={{
                color: "var(--text-primary)",
                marginBottom: "20px",
                textAlign: "left",
                fontFamily: "var(--font-display)",
                fontSize: '1.1rem',
                borderLeft: '3px solid var(--accent-yellow)',
                paddingLeft: '12px'
            }}>Most Consumed Snacks</h3>

            <div style={{ flex: 1, width: "100%", height: "100%" }}>
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={data}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={renderCustomizedLabel}
                            outerRadius={120}
                            fill="#8884d8"
                            dataKey="value"
                            stroke="none"
                        >
                            {data.map((_, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip
                            contentStyle={{
                                backgroundColor: 'var(--bg-dark)',
                                border: '1px solid var(--border-color)',
                                borderRadius: '8px',
                                boxShadow: '0 4px 6px rgba(0,0,0,0.5)'
                            }}
                            itemStyle={{ color: 'var(--accent-yellow)' }}
                        />
                        <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ color: 'var(--text-secondary)' }} iconType="circle" />
                    </PieChart>
                </ResponsiveContainer>
            </div>
        </motion.div>
    );
};

export default SnacksConsumptionChart;
