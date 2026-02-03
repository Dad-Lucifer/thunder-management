
import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { motion } from 'framer-motion';

const data = [
    { time: '10 AM', users: 5 },
    { time: '12 PM', users: 15 },
    { time: '2 PM', users: 25 },
    { time: '4 PM', users: 35 },
    { time: '6 PM', users: 45 },
    { time: '8 PM', users: 40 },
    { time: '10 PM', users: 20 },
];

const PeakHoursChart: React.FC = () => {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
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
            }}>Peak Hours Activity</h3>

            <div style={{ flex: 1, width: "100%", height: "100%" }}>
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                        data={data}
                        margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                    >
                        <defs>
                            <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="var(--accent-yellow)" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="var(--accent-yellow)" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <XAxis
                            dataKey="time"
                            stroke="var(--text-secondary)"
                            tick={{ fill: 'var(--text-secondary)', fontSize: 12 }}
                            axisLine={{ stroke: 'var(--border-color)' }}
                        />
                        <YAxis
                            stroke="var(--text-secondary)"
                            tick={{ fill: 'var(--text-secondary)', fontSize: 12 }}
                            axisLine={{ stroke: 'var(--border-color)' }}
                        />
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: 'var(--bg-dark)',
                                border: '1px solid var(--border-color)',
                                borderRadius: '8px',
                                boxShadow: '0 4px 6px rgba(0,0,0,0.5)'
                            }}
                            itemStyle={{ color: 'var(--accent-yellow)' }}
                            labelStyle={{ color: 'var(--text-muted)' }}
                        />
                        <Area
                            type="monotone"
                            dataKey="users"
                            stroke="var(--accent-yellow)"
                            strokeWidth={2}
                            fillOpacity={1}
                            fill="url(#colorUsers)"
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </motion.div>
    );
};

export default PeakHoursChart;
