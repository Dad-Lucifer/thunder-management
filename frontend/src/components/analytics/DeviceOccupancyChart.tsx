
import React, { useState } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Sector } from 'recharts';
import { motion } from 'framer-motion';

// Premium Color Palette
const GOLD_COLOR = '#fbbf24'; // Amber-400
const BLUE_COLOR = '#3b82f6'; // Blue-500
const EMPTY_COLOR = 'rgba(59, 130, 246, 0.1)'; // Faint Blue

interface DataItem {
    name: string;
    value: number;
    color: string;
}

interface OccupancyData {
    occupied: number;
    remaining: number;
    totalCapacity: number;
}

interface DeviceOccupancyChartProps {
    data?: OccupancyData;
    loading?: boolean;
}

const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
        const { name, value, color } = payload[0].payload;
        return (
            <div style={{
                background: 'rgba(15, 23, 42, 0.9)',
                backdropFilter: 'blur(12px)',
                border: `1px solid ${color}`,
                borderRadius: '12px',
                padding: '12px 16px',
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)',
                minWidth: '150px'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: color, boxShadow: `0 0 8px ${color}` }} />
                    <span style={{ color: '#e2e8f0', fontSize: '0.9rem', fontWeight: 600 }}>{name}</span>
                </div>
                <div style={{ color: '#fff', fontSize: '1.2rem', fontWeight: 'bold' }}>
                    {value} <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 400 }}>devices</span>
                </div>
            </div>
        );
    }
    return null;
};

const renderActiveShape = (props: any) => {
    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
    return (
        <g>
            <Sector
                cx={cx}
                cy={cy}
                innerRadius={innerRadius}
                outerRadius={outerRadius + 6}
                startAngle={startAngle}
                endAngle={endAngle}
                fill={fill}
                style={{ filter: `drop-shadow(0 0 6px ${fill})` }}
            />
            <Sector
                cx={cx}
                cy={cy}
                startAngle={startAngle}
                endAngle={endAngle}
                innerRadius={innerRadius - 8}
                outerRadius={innerRadius - 4}
                fill={fill}
                opacity={0.3}
            />
        </g>
    );
};

const DeviceOccupancyChart: React.FC<DeviceOccupancyChartProps> = ({ data, loading: propLoading }) => {
    const [activeIndex, setActiveIndex] = useState(0);

    const occupancyData = data || { occupied: 0, remaining: 0, totalCapacity: 0 };
    
    const chartData: DataItem[] = [
        { name: 'Occupied', value: occupancyData.occupied || 0, color: GOLD_COLOR },
        { name: 'Available', value: occupancyData.remaining || 0, color: BLUE_COLOR }
    ];

    const total = chartData.reduce((acc, curr) => acc + curr.value, 0);
    const occupiedCount = chartData.find(d => d.name === 'Occupied')?.value || 0;
    const occupancyRate = total > 0 ? Math.round((occupiedCount / total) * 100) : 0;

    // Fallback for visual rendering if no data
    const displayData = total > 0 ? chartData : [
        { name: 'Occupied', value: 0, color: GOLD_COLOR },
        { name: 'Available', value: 1, color: 'rgba(255,255,255,0.05)' }
    ];

    const onPieEnter = (_: any, index: number) => {
        setActiveIndex(index);
    };

    return (
        <div style={{ width: '100%', height: '350px', position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            {/* Center Stats Overlay */}
            <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                textAlign: 'center',
                pointerEvents: 'none',
                zIndex: 10,
                marginTop: '-10px' // Offset for footer
            }}>
                <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.5, type: 'spring' }}
                >
                    <div style={{
                        fontSize: '3rem',
                        fontWeight: 800,
                        color: GOLD_COLOR,
                        textShadow: `0 0 20px rgba(251, 191, 36, 0.4)`,
                        lineHeight: 1,
                        fontFamily: 'Orbitron, sans-serif'
                    }}>
                        {occupancyRate}%
                    </div>
                </motion.div>
            </div>

            <div style={{ width: '100%', height: '300px' }}>
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <defs>
                            <linearGradient id="goldGradient" x1="0" y1="0" x2="1" y2="1">
                                <stop offset="0%" stopColor="#f59e0b" />
                                <stop offset="100%" stopColor="#fbbf24" />
                            </linearGradient>
                            <linearGradient id="blueGradient" x1="0" y1="0" x2="1" y2="1">
                                <stop offset="0%" stopColor="#1e3a8a" />
                                <stop offset="100%" stopColor="#3b82f6" />
                            </linearGradient>
                            <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                                <feGaussianBlur stdDeviation="4" result="coloredBlur" />
                                <feMerge>
                                    <feMergeNode in="coloredBlur" />
                                    <feMergeNode in="SourceGraphic" />
                                </feMerge>
                            </filter>
                        </defs>
                        <Pie
                            {...({
                                activeIndex: activeIndex,
                                activeShape: renderActiveShape,
                                data: displayData,
                                cx: "50%",
                                cy: "50%",
                                innerRadius: 85,
                                outerRadius: 110,
                                paddingAngle: 4,
                                dataKey: "value",
                                onMouseEnter: onPieEnter,
                                className: "cursor-pointer",
                                stroke: "none"
                            } as any)}
                        >
                            {displayData.map((entry, index) => (
                                <Cell
                                    key={`cell-${index}`}
                                    fill={entry.name === 'Occupied' ? 'url(#goldGradient)' : 'url(#blueGradient)'}
                                    style={{
                                        filter: entry.name === 'Occupied' ? 'url(#glow)' : 'none',
                                        transition: 'all 0.3s ease'
                                    }}
                                />
                            ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
                    </PieChart>
                </ResponsiveContainer>
            </div>

            {/* Footer Stats */}
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                gap: '24px',
                marginTop: '-10px',
                position: 'relative',
                zIndex: 20
            }}>
                {chartData.map((entry, index) => (
                    <motion.div
                        key={entry.name}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.6 + (index * 0.1) }}
                        style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                        <div style={{
                            width: '10px',
                            height: '10px',
                            borderRadius: '2px',
                            background: entry.name === 'Occupied' ? GOLD_COLOR : BLUE_COLOR,
                            boxShadow: `0 0 8px ${entry.name === 'Occupied' ? GOLD_COLOR : BLUE_COLOR}`
                        }} />
                        <span style={{ fontSize: '0.85rem', color: '#cbd5e1' }}>
                            {entry.name}: <span style={{ fontWeight: 'bold' }}>{entry.value}</span>
                        </span>
                    </motion.div>
                ))}
            </div>
        </div>
    );
};

export default DeviceOccupancyChart;
