
import React from 'react';
import { motion } from 'framer-motion';
import { GlassCard, GradientTitle } from './ui/ModernComponents';
import { FaUtensils, FaGamepad, FaClock } from 'react-icons/fa';
import { RECENT_TRANSACTIONS } from '../../data/mockOwnerData';

const RecentTransactions: React.FC = () => {
    return (
        <GlassCard className="txn-panel">
            <div className="panel-header">
                <GradientTitle size="medium">Live Transactions</GradientTitle>
                <span className="live-badge">● LIVE FEED</span>
            </div>

            <div className="txn-list custom-scrollbar">
                {RECENT_TRANSACTIONS.map((txn, idx) => (
                    <motion.div
                        key={txn.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className="txn-item"
                    >
                        <div className="txn-left">
                            <div className={`txn-icon ${txn.type}`}>
                                {txn.type === 'snack' ? <FaUtensils size={12} /> : <FaGamepad size={12} />}
                            </div>
                            <div className="txn-info">
                                <p className="txn-name">{txn.item}</p>
                                <p className="txn-time">
                                    <FaClock size={10} /> {txn.time}
                                </p>
                            </div>
                        </div>
                        <div className="txn-right">
                            <p className="txn-amount">₹{txn.amount}</p>
                            <p className="txn-id">{txn.id}</p>
                        </div>
                    </motion.div>
                ))}
            </div>
        </GlassCard>
    );
};

export default RecentTransactions;
