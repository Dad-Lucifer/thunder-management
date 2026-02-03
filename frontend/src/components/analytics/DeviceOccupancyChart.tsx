
import React from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { motion } from 'framer-motion';

const data = [
    { name: 'Occupied', value: 12 },
    { name: 'Remaining', value: 8 },
];

const COLORS = ['#fbbf24', '#1e293b']; // Accent Yellow vs Dark Border color for remaining

const DeviceOccupancyChart: React.FC = () => {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
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
            }}>Device Occupancy</h3>

            <div style={{ flex: 1, width: "100%", height: "100%" }}>
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={data}
                            cx="50%"
                            cy="50%"
                            innerRadius={80}
                            outerRadius={110}
                            fill="#8884d8"
                            paddingAngle={2}
                            dataKey="value"
                            stroke="none"
                            label={({ name, percent }) => `${name} ${(percent ? percent * 100 : 0).toFixed(0)}%`}
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
                            itemStyle={{ color: 'var(--text-primary)' }}
                        />
                        <Legend
                            verticalAlign="bottom"
                            height={36}
                            wrapperStyle={{ color: 'var(--text-secondary)' }}
                            iconType="circle"
                        />
                    </PieChart>
                </ResponsiveContainer>
            </div>
        </motion.div>
    );
};

export default DeviceOccupancyChart;
