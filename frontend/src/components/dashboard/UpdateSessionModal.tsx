import React, { useState } from "react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import { FaTimes, FaDesktop, FaGamepad, FaClock, FaUserPlus, FaPizzaSlice, FaMinus, FaPlus, FaChevronRight, FaTrash } from "react-icons/fa";
import "./UpdateSessionModal.css";

// ------------------- Types -------------------
interface DeviceMap {
    ps: number;
    pc: number;
    vr: number;
    wheel: number;
    metabat: number;
}

interface ActiveSession {
    id: string;
    customer: string;
    startTime: string;
    duration: number;
    peopleCount: number;
    price: number;
    paidAmount?: number;
    paidPeople?: number;
    remainingAmount?: number;
    devices: string[];
}

interface Props {
    session: ActiveSession;
    onClose: () => void;
}

interface SnackItem {
    id: string;
    name: string;
    price: number;
    icon: string;
}

// ------------------- Constants -------------------
const PRICE_PER_HOUR_PER_PERSON = 50;

const AVAILABLE_SNACKS: SnackItem[] = [
    { id: '1', name: 'Cola (300ml)', price: 40, icon: '🥤' },
    { id: '2', name: 'Spicy Nachos', price: 150, icon: '🌮' },
    { id: '3', name: 'Chicken Burger', price: 120, icon: '🍔' },
    { id: '4', name: 'French Fries', price: 80, icon: '🍟' },
    { id: '5', name: 'Cold Coffee', price: 60, icon: '☕' },
    { id: '6', name: 'Energy Drink', price: 100, icon: '⚡' },
];

const UpdateSessionModal = ({ session, onClose }: Props) => {
    // ------------------- State -------------------
    const [activeTab, setActiveTab] = useState<'extend' | 'addMember' | 'snacks' | 'split'>('extend');

    const [payingNow, setPayingNow] = useState(0);

    // Feature 1: Extend Time
    const [extraMinutes, setExtraMinutes] = useState(0);

    // Feature 2: Add Member
    const [newMember, setNewMember] = useState({
        name: "",
        peopleCount: 0,
        devices: { ps: 0, pc: 0, vr: 0, wheel: 0, metabat: 0 } as DeviceMap
    });

    // Feature 3: Snacks
    const [cart, setCart] = useState<{ [key: string]: number }>({});

    // ------------------- Calculations -------------------
    // const people = session.peopleCount || 1;
    const totalPeople = session.peopleCount || 1;

    const extraHours = extraMinutes / 60;

    const extendPrice = extraHours * totalPeople * PRICE_PER_HOUR_PER_PERSON;

    const memberCount = newMember.peopleCount || 0;
    const newMemberPrice = extraHours * memberCount * PRICE_PER_HOUR_PER_PERSON;

    const snackPrice = Object.entries(cart).reduce((total, [id, qty]) => {
        const item = AVAILABLE_SNACKS.find(s => s.id === id);
        return total + (item ? item.price * qty : 0);
    }, 0);

    const totalToPay = session.price + extendPrice + newMemberPrice + snackPrice;
    const alreadyPaid = session.paidPeople || 0;

    const remainingPeople = totalPeople - alreadyPaid;
    const remaining = session.remainingAmount ?? session.price;

    const perPerson = remaining / remainingPeople;
    const payNowAmount = payingNow * perPerson;

    const newRemainingPeople = remainingPeople - payingNow;
    const newRemainingAmount = remaining - payNowAmount;




    // ------------------- Handlers -------------------
    const updateSnack = (id: string, delta: number) => {
        setCart(prev => {
            const current = prev[id] || 0;
            const next = Math.max(0, current + delta);
            if (next === 0) {
                const { [id]: _, ...rest } = prev; // Remove key
                return rest;
            }
            return { ...prev, [id]: next };
        });
    };

    const updateDevice = (key: keyof DeviceMap, delta: number) => {
        setNewMember(prev => ({
            ...prev,
            devices: { ...prev.devices, [key]: Math.max(0, prev.devices[key] + delta) }
        }));
    };

    const handleDelete = async () => {
        if (!window.confirm("Are you sure you want to delete this session? This cannot be undone.")) return;

        try {
            await axios.delete(`http://localhost:5000/api/sessions/delete/${session.id}`);
            alert("Session deleted successfully");
            onClose();
        } catch (err) {
            console.error(err);
            alert("Failed to delete session");
        }
    };

    const handleConfirm = async () => {
        try {
            // Build simple summary for alert/log
            const snackDetails = Object.entries(cart).map(([id, qty]) => {
                const s = AVAILABLE_SNACKS.find(x => x.id === id);
                return s ? { name: s.name, qty, price: s.price * qty } : null;
            }).filter(Boolean);

            const payload = {
                extraTime: extraHours,
                extraPrice: extendPrice + newMemberPrice + snackPrice,
                newMember: memberCount > 0 ? newMember : null,
                snacks: snackDetails,
                paidNow: payNowAmount,
                payingPeopleNow: payingNow
            };

            await axios.post(
                `http://localhost:5000/api/sessions/update/${session.id}`,
                payload
            );

            // "Addictive" feedback could be implemented as a toast here.
            onClose();
        } catch (err) {
            console.error(err);
            alert("Something went wrong");
        }
    };

    // ------------------- Components -------------------

    const TabButton = ({ id, label, icon: Icon }: { id: typeof activeTab, label: string, icon: any }) => (
        <button
            className={`segment-btn ${activeTab === id ? 'active' : ''}`}
            onClick={() => setActiveTab(id)}
        >
            {activeTab === id && (
                <motion.div
                    layoutId="segment-indicator"
                    className="absolute inset-0 bg-white/10 rounded-lg shadow-sm"
                    initial={false}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
            )}
            <span className="relative z-10 flex items-center gap-2">
                <Icon /> {label}
            </span>
        </button>
    );

    return (
        <div className="modal-backdrop">
            <motion.div
                className="modal-container"
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
            >
                {/* Header */}
                <div className="modal-header">
                    <h2 className="modal-title">Update Session</h2>
                    <button className="close-icon-btn" onClick={onClose}>
                        <FaTimes />
                    </button>
                </div>

                {/* Tabs */}
                <div className="segmented-control">
                    <TabButton id="extend" label="Time" icon={FaClock} />
                    <TabButton id="addMember" label="People" icon={FaUserPlus} />
                    <TabButton id="snacks" label="Snacks" icon={FaPizzaSlice} />
                    <TabButton id="split" label="Split" icon={FaUserPlus} />

                </div>

                {/* Content */}
                <div className="content-wrapper custom-scrollbar">
                    <AnimatePresence mode="wait">
                        {activeTab === 'extend' && (
                            <motion.div
                                key="extend"
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 10 }}
                                transition={{ duration: 0.2 }}
                            >
                                <div className="minimal-counter">
                                    <button className="counter-btn" onClick={() => setExtraMinutes(prev => Math.max(15, prev - 15))}>
                                        <FaMinus size={12} />
                                    </button>
                                    <div style={{ textAlign: 'center' }}>
                                        <div className="counter-value">{extraMinutes}</div>
                                        <span className="counter-label">minutes added</span>
                                    </div>
                                    <button className="counter-btn" onClick={() => setExtraMinutes(prev => prev + 15)}>
                                        <FaPlus size={12} />
                                    </button>
                                </div>

                                <div className="text-sm text-gray-400 text-center">
                                    Current Session Time: {Math.floor(session.duration / 60)}h {session.duration % 60}m
                                </div>
                            </motion.div>
                        )}

                        {activeTab === 'addMember' && (
                            <motion.div
                                key="members"
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 10 }}
                                transition={{ duration: 0.2 }}
                                className="item-grid"
                            >
                                <input
                                    placeholder="New Player Name"
                                    className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
                                    value={newMember.name}
                                    onChange={e => setNewMember({ ...newMember, name: e.target.value })}
                                />

                                <div className="minimal-counter">
                                    <button className="counter-btn" onClick={() => setNewMember(p => ({ ...p, peopleCount: Math.max(0, p.peopleCount - 1) }))}>
                                        <FaMinus size={12} />
                                    </button>
                                    <div style={{ textAlign: 'center' }}>
                                        <div className="counter-value">{newMember.peopleCount}</div>
                                        <span className="counter-label">new players</span>
                                    </div>
                                    <button className="counter-btn" onClick={() => setNewMember(p => ({ ...p, peopleCount: p.peopleCount + 1 }))}>
                                        <FaPlus size={12} />
                                    </button>
                                </div>

                                <h4 className="text-xs font-bold text-gray-500 uppercase mt-4 mb-2">Assign Devices</h4>
                                {/* Simple Device List */}
                                {(['ps', 'pc', 'vr', 'wheel', 'metabat'] as const).map(device => (
                                    <div key={device} className={`grid-item ${newMember.devices[device] > 0 ? 'selected' : ''}`}>
                                        <div className="item-icon">
                                            {device === 'ps' ? <FaGamepad /> : <FaDesktop />}
                                        </div>
                                        <div className="item-info">
                                            <span className="item-name uppercase">{device}</span>
                                        </div>
                                        <div className="item-controls">
                                            {newMember.devices[device] > 0 && (
                                                <button className="mini-control" onClick={() => updateDevice(device, -1)}><FaMinus size={8} /></button>
                                            )}
                                            {newMember.devices[device] > 0 && (
                                                <span className="font-bold w-4 text-center">{newMember.devices[device]}</span>
                                            )}
                                            <button className="mini-control" onClick={() => updateDevice(device, 1)}><FaPlus size={8} /></button>
                                        </div>
                                    </div>
                                ))}
                            </motion.div>
                        )}

                        {activeTab === 'snacks' && (
                            <motion.div
                                key="snacks"
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 10 }}
                                transition={{ duration: 0.2 }}
                                className="item-grid"
                            >
                                {AVAILABLE_SNACKS.map(snack => {
                                    const qty = cart[snack.id] || 0;
                                    return (
                                        <div key={snack.id} className={`grid-item ${qty > 0 ? 'selected' : ''}`}>
                                            <div className="text-2xl mr-3">{snack.icon}</div>
                                            <div className="item-info">
                                                <span className="item-name">{snack.name}</span>
                                                <span className="item-price-tag">₹{snack.price}</span>
                                            </div>
                                            <div className="item-controls">
                                                {qty > 0 && (
                                                    <button className="mini-control" onClick={() => updateSnack(snack.id, -1)}><FaMinus size={8} /></button>
                                                )}
                                                {qty > 0 && (
                                                    <span className="font-bold w-4 text-center">{qty}</span>
                                                )}
                                                <button className="mini-control" onClick={() => updateSnack(snack.id, 1)}><FaPlus size={8} /></button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </motion.div>
                        )}
                        {activeTab === 'split' && (
                            <motion.div className="item-grid">
                                <div style={{ width: "100%", textAlign: "center" }}>
                                    <h3>Total Bill</h3>
                                    <div style={{ fontSize: 26, fontWeight: "bold" }}>
                                        ₹{totalToPay.toFixed(0)}
                                    </div>

                                    <h4 style={{ marginTop: 12 }}>
                                        Remaining Amount: ₹{remaining.toFixed(0)}
                                    </h4>

                                    <h4 style={{ marginTop: 12 }}>
                                        People Remaining: {remainingPeople}
                                    </h4>

                                    <div style={{ marginTop: 12 }}>
                                        <label>People Paying Now</label>
                                        <input
                                            type="number"
                                            min={0}
                                            max={totalPeople}
                                            value={payingNow}
                                            onChange={e => setPayingNow(Number(e.target.value))}
                                            className="input-field"
                                        />
                                    </div>

                                    <div style={{ marginTop: 12 }}>
                                        Pay Now: <b>₹{payNowAmount.toFixed(0)}</b>
                                    </div>

                                    <div style={{ marginTop: 8 }}>
                                        Remaining People: <b>{remainingPeople}</b>
                                    </div>

                                    <div style={{ marginTop: 8 }}>
                                        New Remaining Amount: <b>₹{newRemainingAmount.toFixed(0)}</b>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                    </AnimatePresence>
                </div>

                {/* Footer */}
                <div className="action-bar">
                    <button
                        className="delete-btn"
                        onClick={handleDelete}
                        title="Delete Session"
                    >
                        <FaTrash />
                    </button>

                    <div className="total-section" style={{ marginLeft: 'auto', marginRight: '1rem', textAlign: 'right' }}>
                        <span className="total-label-sm">Total to Pay</span>
                        <motion.span
                            key={totalToPay}
                            initial={{ scale: 1.2, color: '#fff' }}
                            animate={{ scale: 1, color: '#f4f4f5' }}
                            className="total-value-lg"
                        >
                            ₹{totalToPay.toFixed(0)}
                        </motion.span>
                    </div>
                    <button className="pay-btn" onClick={handleConfirm}>
                        Confirm <FaChevronRight size={12} />
                    </button>
                </div>

            </motion.div>
        </div>
    );
};

export default UpdateSessionModal;