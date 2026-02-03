
import React from 'react';
import { motion } from 'framer-motion';
import { GlassCard, GradientTitle } from './ui/ModernComponents';
import { FaDesktop, FaGamepad, FaCrown, FaCar } from 'react-icons/fa';
import { FLOOR_STATUS } from '../../data/mockOwnerData';

const getIconForZone = (id: string) => {
    switch (id) {
        case 'Z1': return FaDesktop; // PC
        case 'Z2': return FaGamepad; // Console
        case 'Z3': return FaCrown; // VIP
        case 'Z4': return FaCar; // Sim
        default: return FaDesktop;
    }
};

const getStatusColor = (status: string) => {
    switch (status) {
        case 'full': return '#EF4444'; // Red
        case 'high': return '#F59E0B'; // Orange
        case 'medium': return '#3B82F6'; // Blue
        case 'empty': return '#10B981'; // Green
        default: return '#6B7280';
    }
};

const LiveFloorStatus: React.FC = () => {
    return (
        <GlassCard className="floor-status-panel">
            <div className="panel-header">
                <GradientTitle size="medium">Live Floor Status</GradientTitle>
                <div className="status-legend">
                    <span className="legend-item"><span className="dot dot-green"></span>Available</span>
                    <span className="legend-item"><span className="dot dot-red"></span>Busy</span>
                </div>
            </div>

            <div className="floor-grid">
                {FLOOR_STATUS.map((zone, idx) => {
                    const Icon = getIconForZone(zone.id);
                    const color = getStatusColor(zone.status);

                    return (
                        <motion.div
                            key={zone.id}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: idx * 0.1 }}
                            className="zone-card"
                        >
                            <div className="zone-header">
                                <div className="zone-icon" style={{ backgroundColor: `${color}20`, color: color }}>
                                    <Icon size={20} />
                                </div>
                                <span className="zone-stats">
                                    {zone.active}/{zone.total} Active
                                </span>
                            </div>

                            <h4 className="zone-name">{zone.name}</h4>

                            {/* Visual Slots */}
                            <div className="slots-container">
                                {Array.from({ length: zone.total }).map((_, i) => (
                                    <motion.div
                                        key={i}
                                        initial={false}
                                        animate={{
                                            backgroundColor: i < zone.active ? color : 'rgba(255,255,255,0.1)',
                                            boxShadow: i < zone.active ? `0 0 8px ${color}` : 'none'
                                        }}
                                        className="slot-indicator"
                                    />
                                ))}
                            </div>
                        </motion.div>
                    );
                })}
            </div>
        </GlassCard>
    );
};

export default LiveFloorStatus;
