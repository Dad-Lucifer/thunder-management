import React, { useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence, type Variants, type Easing } from 'framer-motion';
import {
    FaTimes,
    FaUser,
    FaPhone,
    FaGamepad,
    FaClock,
    FaSyncAlt,
    FaUtensils,
    FaWallet,
    FaMoneyBillWave,
    FaMobileAlt,
    FaCalendarAlt,
    FaUsers
} from 'react-icons/fa';
import './TransactionDetailDrawer.css';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface SnackItem {
    name: string;
    quantity: number;
    price: number;
}

export interface TransactionDetail {
    id: string;
    item: string;
    amount: number;
    status: 'active' | 'completed';
    timestamp: string | null;
    customerName?: string;
    contactNumber?: string | null;
    devices?: string[];
    duration?: number;
    peopleCount?: number;
    snacks?: SnackItem[];
    cashAmount?: number;
    onlineAmount?: number;
    isRenewed?: boolean;
}

interface Props {
    txn: TransactionDetail | null;
    onClose: () => void;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const formatTimestamp = (timestamp: string | null | undefined): string => {
    if (!timestamp) return '—';
    try {
        const date = new Date(timestamp);
        if (isNaN(date.getTime())) return '—';
        return new Intl.DateTimeFormat('en-IN', {
            timeZone: 'Asia/Kolkata',
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        }).format(date);
    } catch {
        return '—';
    }
};

const formatDuration = (hours: number): string => {
    if (hours > 0 && hours < 0.05) {
        return '< 1m (Quick session)';
    }
    const totalMinutes = Math.round(hours * 60);
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    if (h === 0) return `${m}m`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
};

const formatPhone = (phone?: string | null) => {
    if (!phone) return null;
    const clean = String(phone).trim();
    if (clean.length === 10) {
        return `${clean.slice(0, 5)} ${clean.slice(5)}`;
    }
    return clean;
};

const cleanCustomerDetails = (rawName?: string, rawItem?: string) => {
    const raw = rawName || rawItem || 'Customer';
    const parts = raw.split(/[\/\\]/);
    const name = parts[0].replace(/\s*\(.*?\)/, '').trim();
    const station = parts.length > 1 ? parts.slice(1).join(' ').replace(/\s*\(.*?\)/, '').trim().toUpperCase() : null;
    return { name: name || raw, station };
};

const getPaymentMode = (cash: number, online: number, total: number): 'Cash' | 'Online' | 'Split' => {
    if (cash > 0 && online > 0) return 'Split';
    if (online > 0) return 'Online';
    if (cash > 0) return 'Cash';
    return total > 0 ? 'Cash' : 'Cash';
};

// ── Animation variants ─────────────────────────────────────────────────────────

const easeIn: Easing = 'easeIn';

const overlayVariants: Variants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.2 } },
    exit: { opacity: 0, transition: { duration: 0.2 } }
};

const drawerVariants: Variants = {
    hidden: { x: 420, opacity: 0 },
    visible: {
        x: 0,
        opacity: 1,
        transition: { type: 'spring', stiffness: 300, damping: 30 }
    },
    exit: {
        x: 420,
        opacity: 0,
        transition: { duration: 0.2, ease: easeIn }
    }
};

// ── Component ──────────────────────────────────────────────────────────────────

const TransactionDetailDrawer: React.FC<Props> = React.memo(({ txn, onClose }) => {
    // Close on Escape key
    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
    }, [onClose]);

    useEffect(() => {
        if (txn) {
            document.addEventListener('keydown', handleKeyDown);
            return () => document.removeEventListener('keydown', handleKeyDown);
        }
    }, [txn, handleKeyDown]);

    const cashAmt = txn?.cashAmount ?? 0;
    const onlineAmt = txn?.onlineAmount ?? 0;
    const totalPaid = txn?.amount ?? 0;
    const paymentMode = getPaymentMode(cashAmt, onlineAmt, totalPaid);

    // Cash/online bar widths
    const effectiveTotal = (cashAmt + onlineAmt) > 0 ? (cashAmt + onlineAmt) : totalPaid;
    const effectiveCash = (cashAmt === 0 && onlineAmt === 0 && totalPaid > 0) ? totalPaid : cashAmt;
    const effectiveOnline = onlineAmt;

    const cashPct = effectiveTotal > 0 ? Math.round((effectiveCash / effectiveTotal) * 100) : 100;
    const onlinePct = effectiveTotal > 0 ? Math.round((effectiveOnline / effectiveTotal) * 100) : 0;

    const { name: playerName, station } = useMemo(
        () => cleanCustomerDetails(txn?.customerName, txn?.item),
        [txn?.customerName, txn?.item]
    );

    const formattedContact = useMemo(() => formatPhone(txn?.contactNumber), [txn?.contactNumber]);

    return (
        <AnimatePresence>
            {txn && (
                <motion.div
                    className="tdd-overlay"
                    variants={overlayVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    onClick={onClose}
                    aria-label="Close transaction details"
                >
                    <motion.aside
                        className="tdd-drawer"
                        variants={drawerVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        onClick={(e) => e.stopPropagation()}
                        role="dialog"
                        aria-modal="true"
                        aria-label="Transaction details"
                    >
                        {/* ── Header ── */}
                        <div className="tdd-header">
                            <span className="tdd-header-label">Transaction Details</span>
                            <button
                                className="tdd-close-btn"
                                onClick={onClose}
                                aria-label="Close drawer"
                            >
                                <FaTimes size={14} />
                            </button>
                        </div>

                        <div className="tdd-body custom-scrollbar">

                            {/* ── Player Section ── */}
                            <section className="tdd-section">
                                <h3 className="tdd-section-title">
                                    <FaUser size={12} /> Player
                                </h3>
                                <div className="tdd-player-card">
                                    <div className="tdd-avatar">
                                        {(playerName || 'U').charAt(0).toUpperCase()}
                                    </div>
                                    <div className="tdd-player-info">
                                        <div className="tdd-player-title-row">
                                            <p className="tdd-player-name">{playerName}</p>
                                            {station && (
                                                <span className="tdd-station-badge">{station}</span>
                                            )}
                                        </div>
                                        {formattedContact ? (
                                            <a
                                                href={`tel:${txn.contactNumber}`}
                                                className="tdd-player-contact tdd-phone-link"
                                                title="Call customer"
                                            >
                                                <FaPhone size={10} />
                                                <span>{formattedContact}</span>
                                            </a>
                                        ) : (
                                            <p className="tdd-player-contact tdd-muted">
                                                <FaPhone size={10} />
                                                <span>Not provided (Walk-in)</span>
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </section>

                            {/* ── Session Section ── */}
                            <section className="tdd-section">
                                <h3 className="tdd-section-title">
                                    <FaGamepad size={12} /> Session
                                </h3>
                                <div className="tdd-rows">
                                    <div className="tdd-row">
                                        <span className="tdd-row-label">
                                            <FaClock size={11} /> Duration
                                        </span>
                                        <span className="tdd-row-value">
                                            {formatDuration(txn.duration ?? 0)}
                                        </span>
                                    </div>

                                    {txn.peopleCount && txn.peopleCount > 1 && (
                                        <div className="tdd-row">
                                            <span className="tdd-row-label">
                                                <FaUsers size={11} /> Party Size
                                            </span>
                                            <span className="tdd-row-value">
                                                {txn.peopleCount} Players
                                            </span>
                                        </div>
                                    )}

                                    <div className="tdd-row">
                                        <span className="tdd-row-label">
                                            <FaGamepad size={11} /> Devices
                                        </span>
                                        <span className="tdd-row-value">
                                            {txn.devices && txn.devices.length > 0 ? (
                                                <div className="tdd-device-tags">
                                                    {txn.devices.map((dev, idx) => (
                                                        <span key={idx} className="tdd-device-tag">{dev}</span>
                                                    ))}
                                                </div>
                                            ) : (
                                                <span className="tdd-muted">None listed</span>
                                            )}
                                        </span>
                                    </div>

                                    <div className="tdd-row">
                                        <span className="tdd-row-label">
                                            <FaSyncAlt size={11} /> Session Status
                                        </span>
                                        <span className={`tdd-badge ${txn.isRenewed ? 'tdd-badge--yes' : 'tdd-badge--no'}`}>
                                            {txn.isRenewed ? '✓ Extended / Renewed' : 'Standard'}
                                        </span>
                                    </div>
                                </div>
                            </section>

                            {/* ── Snacks Section ── */}
                            <section className="tdd-section">
                                <h3 className="tdd-section-title">
                                    <FaUtensils size={12} /> Snacks & Refreshments
                                </h3>
                                {txn.snacks && txn.snacks.length > 0 ? (
                                    <ul className="tdd-snack-list">
                                        {txn.snacks.map((snack, i) => (
                                            <li key={i} className="tdd-snack-item">
                                                <span className="tdd-snack-name">{snack.name}</span>
                                                <div className="tdd-snack-right">
                                                    <span className="tdd-snack-qty">×{snack.quantity}</span>
                                                    {snack.price > 0 && (
                                                        <span className="tdd-snack-price">
                                                            ₹{snack.price * snack.quantity}
                                                        </span>
                                                    )}
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="tdd-empty-snacks">No snacks ordered</p>
                                )}
                            </section>

                            {/* ── Payment Section ── */}
                            <section className="tdd-section">
                                <h3 className="tdd-section-title">
                                    <FaWallet size={12} /> Payment Breakdown
                                </h3>

                                <div className="tdd-payment-total">
                                    <span className="tdd-payment-total-label">Total Amount</span>
                                    <span className="tdd-payment-total-value">₹{totalPaid.toLocaleString()}</span>
                                </div>

                                {/* Payment split bar */}
                                {totalPaid > 0 && (
                                    <div className="tdd-split-bar-wrap">
                                        <div className="tdd-split-bar">
                                            {effectiveCash > 0 && (
                                                <div
                                                    className="tdd-split-bar__cash"
                                                    style={{ width: `${cashPct}%` }}
                                                    title={`Cash: ₹${effectiveCash}`}
                                                />
                                            )}
                                            {effectiveOnline > 0 && (
                                                <div
                                                    className="tdd-split-bar__online"
                                                    style={{ width: `${onlinePct}%` }}
                                                    title={`Online: ₹${effectiveOnline}`}
                                                />
                                            )}
                                        </div>
                                        <div className="tdd-split-labels">
                                            {effectiveCash > 0 && (
                                                <span className="tdd-split-label tdd-split-label--cash">
                                                    <FaMoneyBillWave size={10} /> Cash ₹{effectiveCash.toLocaleString()}
                                                </span>
                                            )}
                                            {effectiveOnline > 0 && (
                                                <span className="tdd-split-label tdd-split-label--online">
                                                    <FaMobileAlt size={10} /> Online ₹{effectiveOnline.toLocaleString()}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Payment mode pill */}
                                <div className="tdd-payment-mode-row">
                                    <span className="tdd-row-label">Payment Mode</span>
                                    <span className={`tdd-mode-pill tdd-mode-pill--${paymentMode.toLowerCase()}`}>
                                        {paymentMode === 'Cash' && <FaMoneyBillWave size={10} />}
                                        {paymentMode === 'Online' && <FaMobileAlt size={10} />}
                                        {paymentMode === 'Split' && <FaWallet size={10} />}
                                        {paymentMode}
                                    </span>
                                </div>
                            </section>

                            {/* ── Timestamp Footer ── */}
                            <div className="tdd-timestamp">
                                <FaCalendarAlt size={11} />
                                <span>{formatTimestamp(txn.timestamp)}</span>
                            </div>

                        </div>
                    </motion.aside>
                </motion.div>
            )}
        </AnimatePresence>
    );
});

TransactionDetailDrawer.displayName = 'TransactionDetailDrawer';

export default TransactionDetailDrawer;
