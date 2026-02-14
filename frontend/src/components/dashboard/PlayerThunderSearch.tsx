import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import {
    FaBolt,
    FaSearch,
    FaTimes,
    FaUser,
    FaPhoneAlt,
    FaExclamationTriangle
} from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import './PlayerThunderSearch.css';

interface PlayerResult {
    name: string;
    phone: string;
    thunderCoins: number;
}

interface Props {
    open: boolean;
    onClose: () => void;
}

const PlayerThunderSearchModal = ({ open, onClose }: Props) => {
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [result, setResult] = useState<PlayerResult | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    const handleSearch = async () => {
        if (!name.trim() || !phone.trim()) {
            setError('Please enter both name and phone number');
            return;
        }

        setLoading(true);
        setError('');
        setResult(null);

        try {
            const res = await axios.get(
                `https://thunder-management.onrender.com/api/battles/thunder-player`,
                {
                    params: { name, phone }
                }
            );

            // Simulating a brief delay for animation effect if API is too fast
            await new Promise(resolve => setTimeout(resolve, 600));
            setResult(res.data);
        } catch {
            setError('Player not found or invalid credentials');
        } finally {
            setLoading(false);
        }
    };

    if (!mounted) return null;

    return createPortal(
        <AnimatePresence>
            {open && (
                <motion.div
                    className="modal-backdrop"
                    initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
                    animate={{ opacity: 1, backdropFilter: 'blur(12px)' }}
                    exit={{ opacity: 0, backdropFilter: 'blur(0px)' }}
                    onClick={onClose}
                >
                    <motion.div
                        className="modal-card"
                        initial={{ opacity: 0, scale: 0.9, y: 40, rotateX: -10 }}
                        animate={{ opacity: 1, scale: 1, y: 0, rotateX: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 40, rotateX: -10 }}
                        transition={{
                            type: "spring",
                            stiffness: 300,
                            damping: 25,
                            mass: 0.8
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="modal-header">
                            <motion.div
                                className="modal-title"
                                initial={{ x: -20, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                transition={{ delay: 0.1 }}
                            >
                                <FaBolt className="modal-title-icon" />
                                <span>Player Search</span>
                            </motion.div>
                            <motion.button
                                className="close-btn"
                                onClick={onClose}
                                whileHover={{ scale: 1.1, rotate: 90 }}
                                whileTap={{ scale: 0.9 }}
                            >
                                <FaTimes />
                            </motion.button>
                        </div>

                        <div className="modal-body">
                            {/* Inputs with Staggered Entry */}
                            <motion.div
                                className="input-group"
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.2 }}
                            >
                                <input
                                    className="modal-input"
                                    placeholder="Enter Player Name"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    autoFocus
                                />
                                <div className="input-icon-wrapper">
                                    <FaUser size={16} />
                                </div>
                            </motion.div>

                            <motion.div
                                className="input-group"
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.3 }}
                            >
                                <input
                                    className="modal-input"
                                    placeholder="Enter Phone Number"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    type="tel"
                                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                />
                                <div className="input-icon-wrapper">
                                    <FaPhoneAlt size={16} />
                                </div>
                            </motion.div>

                            <motion.button
                                className="modal-search-btn"
                                onClick={handleSearch}
                                disabled={loading || !name || !phone}
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.4 }}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                            >
                                {loading ? (
                                    <motion.div
                                        animate={{ rotate: 360 }}
                                        transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                                    >
                                        <FaBolt />
                                    </motion.div>
                                ) : (
                                    <>
                                        <FaSearch /> Find Player
                                    </>
                                )}
                            </motion.button>

                            {/* Dynamic Result Area */}
                            <AnimatePresence mode="wait">
                                {error && (
                                    <motion.div
                                        className="error-msg-container"
                                        initial={{ opacity: 0, height: 0, y: -10 }}
                                        animate={{ opacity: 1, height: 'auto', y: 0 }}
                                        exit={{ opacity: 0, height: 0, y: -10 }}
                                    >
                                        <FaExclamationTriangle /> {error}
                                    </motion.div>
                                )}

                                {result && (
                                    <motion.div
                                        className="result-container"
                                        initial={{ opacity: 0, perspective: 1000 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                    >
                                        <motion.div
                                            className="result-card"
                                            initial={{ rotateX: 90, opacity: 0 }}
                                            animate={{ rotateX: 0, opacity: 1 }}
                                            transition={{
                                                type: "spring",
                                                stiffness: 200,
                                                damping: 20,
                                                delay: 0.1
                                            }}
                                        >
                                            <div className="avatar-wrapper">
                                                <div className="avatar-ring"></div>
                                                <div className="result-avatar">
                                                    <FaUser size={32} color="#fff" />
                                                </div>
                                            </div>

                                            <div className="player-info">
                                                <motion.h2
                                                    className="player-name"
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ delay: 0.3 }}
                                                >
                                                    {result.name}
                                                </motion.h2>
                                                <div className="player-phone">
                                                    <FaPhoneAlt size={10} /> {result.phone}
                                                </div>
                                            </div>

                                            <div className="stats-grid">
                                                <div className="stat-item">
                                                    <span className="stat-label">Thunder Balance</span>
                                                    <div className="stat-value-wrapper">
                                                        <FaBolt color="#fbbf24" size={24} />
                                                        <motion.span
                                                            className="stat-value"
                                                            initial={{ scale: 0.5, opacity: 0 }}
                                                            animate={{ scale: 1, opacity: 1 }}
                                                            transition={{
                                                                type: "spring",
                                                                stiffness: 400,
                                                                damping: 15,
                                                                delay: 0.5
                                                            }}
                                                        >
                                                            {result.thunderCoins}
                                                        </motion.span>
                                                    </div>
                                                </div>
                                            </div>
                                        </motion.div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>,
        document.body
    );
};

export default PlayerThunderSearchModal;
