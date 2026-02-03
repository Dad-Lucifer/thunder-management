
import React from 'react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer
} from 'recharts';
import { motion } from 'framer-motion';

const data = [
    { day: 'Week 1', lastMonth: 4000, thisMonth: 2400 },
    { day: 'Week 2', lastMonth: 3000, thisMonth: 1398 },
    { day: 'Week 3', lastMonth: 2000, thisMonth: 9800 },
    { day: 'Week 4', lastMonth: 2780, thisMonth: 3908 },
];

const GrowthComparisonChart: React.FC = () => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            className="cyber-card"
            style={{
                padding: "24px",
                height: "400px",
                display: "flex",
                flexDirection: "column",
                width: "100%"
            }}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{
                    color: "var(--text-primary)",
                    margin: 0,
                    textAlign: "left",
                    fontFamily: "var(--font-display)",
                    fontSize: '1.1rem',
                    borderLeft: '3px solid var(--accent-yellow)',
                    paddingLeft: '12px'
                }}>Customer Growth Comparison</h3>
                <div style={{
                    padding: '4px 12px',
                    background: 'rgba(16, 185, 129, 0.2)',
                    border: '1px solid #10b981',
                    borderRadius: '20px',
                    color: '#10b981',
                    fontSize: '0.8rem',
                    fontWeight: 'bold'
                }}>
                    +12.5% Growth
                </div>
            </div>

            <div style={{ flex: 1, width: "100%", height: "100%" }}>
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                        data={data}
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                        <XAxis
                            dataKey="day"
                            stroke="var(--text-secondary)"
                            tick={{ fill: 'var(--text-secondary)', fontSize: 13 }}
                            axisLine={{ stroke: 'var(--border-color)' }}
                        />
                        <YAxis
                            stroke="var(--text-secondary)"
                            tick={{ fill: 'var(--text-secondary)', fontSize: 13 }}
                            axisLine={{ stroke: 'var(--border-color)' }}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: 'var(--bg-dark)',
                                border: '1px solid var(--border-color)',
                                borderRadius: '8px',
                                boxShadow: '0 4px 6px rgba(0,0,0,0.5)'
                            }}
                            itemStyle={{ color: 'var(--text-primary)' }}
                        />
                        <Legend wrapperStyle={{ color: 'var(--text-secondary)', paddingTop: '10px' }} />
                        <Line
                            type="monotone"
                            dataKey="lastMonth"
                            name="Last Month"
                            stroke="var(--text-muted)"
                            strokeWidth={2}
                            dot={{ fill: 'var(--text-muted)', r: 4 }}
                            activeDot={{ r: 6 }}
                        />
                        <Line
                            type="monotone"
                            dataKey="thisMonth"
                            name="This Month"
                            stroke="var(--accent-yellow)"
                            strokeWidth={3}
                            dot={{ fill: 'var(--accent-yellow)', r: 4 }}
                            activeDot={{ r: 8, stroke: 'var(--accent-yellow-glow)', strokeWidth: 4 }}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </motion.div>
    );
};

export default GrowthComparisonChart;
