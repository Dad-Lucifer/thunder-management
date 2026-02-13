import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FaPlus, FaTimes, FaTrash
} from 'react-icons/fa';
import { GlassCard, GradientTitle, ActionButton } from './ui/ModernComponents';
import './SubscriptionOverview.css';

interface Subscription {
    id: string;
    type: string;
    provider: string;
    cost: number;
    startDate: string;
    expiryDate: string;
    status: string;
    createdAt?: string;
}

interface Salary {
    id: string;
    employeeName: string;
    amount: number;
    paymentDate: string;
    notes?: string;
    createdAt?: string;
}

const SubscriptionOverview: React.FC = () => {
    // State
    const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
    const [salaries, setSalaries] = useState<Salary[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'subscriptions' | 'salaries'>('subscriptions');
    const [isFormOpen, setIsFormOpen] = useState(false);

    // Form State
    const [formType, setFormType] = useState<'subscription' | 'salary'>('subscription');
    const [formData, setFormData] = useState({
        // Common
        cost: '',
        date: '', // startDate for sub, paymentDate for salary

        // Subscription specific
        subType: 'PS',
        provider: '',
        expiryDate: '',

        // Salary specific
        employeeName: '',
        notes: ''
    });

    // Fetch Data
    const fetchData = async () => {
        setLoading(true);
        try {
            const [subRes, salRes] = await Promise.all([
                fetch('/api/management/subscriptions'),
                fetch('/api/management/salaries')
            ]);

            if (subRes.ok) {
                const subs = await subRes.json();
                setSubscriptions(subs);
            }
            if (salRes.ok) {
                const sals = await salRes.json();
                setSalaries(sals);
            }
        } catch (error) {
            console.error('Failed to fetch management data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // Helpers
    const getDaysRemaining = (expiryDate: string) => {
        const today = new Date();
        const expiry = new Date(expiryDate);
        const diffTime = expiry.getTime() - today.getTime();
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    };

    const getSubscriptionStatus = (expiryDate: string) => {
        const days = getDaysRemaining(expiryDate);
        if (days < 0) return { label: 'Expired', class: 'expired' };
        if (days <= 5) return { label: `Expiring in ${days} days`, class: 'expiring' };
        return { label: 'Active', class: 'active' };
    };

    const calculateTotalMonthlyCost = () => {
        // Simple approximation: Sum of all active subscription costs
        // If they are monthly, just sum cost. If yearly, divide by 12? 
        // For now, assuming cost is per cycle, and cycle is usually monthly for these services
        // The prompt asked for "Total Monthly Cost". I'll sum generic cost for active subs.
        const activeSubs = subscriptions.filter(s => getDaysRemaining(s.expiryDate) >= 0);
        return activeSubs.reduce((acc, curr) => acc + curr.cost, 0);
    };

    const getExpiringCount = () => {
        return subscriptions.filter(s => {
            const days = getDaysRemaining(s.expiryDate);
            return days >= 0 && days <= 5;
        }).length;
    };

    const getLastSalaryDate = () => {
        if (salaries.length === 0) return 'N/A';
        const sorted = [...salaries].sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime());
        return new Date(sorted[0].paymentDate).toLocaleDateString();
    };

    const getTotalSalaryCurrentMonth = () => {
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        return salaries
            .filter(s => {
                const d = new Date(s.paymentDate);
                return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
            })
            .reduce((acc, s) => acc + s.amount, 0);
    };

    // Handlers
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            if (formType === 'subscription') {
                const payload = {
                    type: formData.subType,
                    provider: formData.provider,
                    cost: formData.cost,
                    startDate: formData.date,
                    expiryDate: formData.expiryDate
                };

                const res = await fetch('/api/management/subscriptions', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (res.ok) fetchData();
            } else {
                const payload = {
                    employeeName: formData.employeeName,
                    amount: formData.cost, // Reusing cost field for amount
                    paymentDate: formData.date,
                    notes: formData.notes
                };

                const res = await fetch('/api/management/salaries', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (res.ok) fetchData();
            }

            // Reset and close
            setFormData({
                cost: '', date: '', subType: 'PS', provider: '',
                expiryDate: '', employeeName: '', notes: ''
            });
            setIsFormOpen(false);

        } catch (error) {
            console.error('Submit error:', error);
        }
    };

    const handleDelete = async (id: string, type: 'subscription' | 'salary') => {
        if (!window.confirm('Are you sure you want to delete this entry?')) return;

        const endpoint = type === 'subscription'
            ? `/api/management/subscriptions/${id}`
            : `/api/management/salaries/${id}`;

        try {
            await fetch(endpoint, { method: 'DELETE' });
            fetchData();
        } catch (error) {
            console.error('Delete error:', error);
        }
    };

    if (loading) {
        return (
            <GlassCard className="sub-overview-container">
                <div className="loading-container">
                    <div className="loading-spinner"></div>
                </div>
            </GlassCard>
        );
    }

    return (
        <GlassCard className="sub-overview-container">
            <div className="flex-between">
                <GradientTitle size="medium">Management Module</GradientTitle>
                <ActionButton
                    icon={isFormOpen ? FaTimes : FaPlus}
                    label={isFormOpen ? "Close" : "Add Entry"}
                    onClick={() => setIsFormOpen(!isFormOpen)}
                    variant="primary"
                />
            </div>

            {/* Summary Cards */}
            <div className="sub-summary-grid">
                <div className="summary-card-inner">
                    <span className="summary-label">Monthly Burn</span>
                    <span className="summary-value">₹{calculateTotalMonthlyCost().toLocaleString()}</span>
                    <span className="summary-subtext">{subscriptions.length} Active Services</span>
                </div>

                <div className="summary-card-inner">
                    <span className="summary-label">Expiring Soon</span>
                    <span className="summary-value text-yellow-400">{getExpiringCount()}</span>
                    <span className="summary-subtext">Renewals needed</span>
                </div>

                <div className="summary-card-inner">
                    <span className="summary-label">Salary Paid (This Month)</span>
                    <span className="summary-value">₹{getTotalSalaryCurrentMonth().toLocaleString()}</span>
                    <span className="summary-subtext">Last: {getLastSalaryDate()}</span>
                </div>
            </div>

            {/* Add Form */}
            <AnimatePresence>
                {isFormOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="add-entry-form"
                    >
                        <form onSubmit={handleSubmit}>
                            <div className="form-toggle-group">
                                <button
                                    type="button"
                                    className={`form-toggle-btn ${formType === 'subscription' ? 'active' : ''}`}
                                    onClick={() => setFormType('subscription')}
                                >
                                    Add Subscription
                                </button>
                                <button
                                    type="button"
                                    className={`form-toggle-btn ${formType === 'salary' ? 'active' : ''}`}
                                    onClick={() => setFormType('salary')}
                                >
                                    Record Salary
                                </button>
                            </div>

                            <div className="form-grid">
                                {/* Common Fields */}
                                <div className="form-group">
                                    <label>{formType === 'subscription' ? 'Cost (₹)' : 'Amount (₹)'}</label>
                                    <input
                                        type="number"
                                        name="cost"
                                        value={formData.cost}
                                        onChange={handleInputChange}
                                        required
                                        className="form-input"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>{formType === 'subscription' ? 'Start Date' : 'Payment Date'}</label>
                                    <input
                                        type="date"
                                        name="date"
                                        value={formData.date}
                                        onChange={handleInputChange}
                                        required
                                        className="form-input"
                                    />
                                </div>

                                {/* Subscription Specific */}
                                {formType === 'subscription' && (
                                    <>
                                        <div className="form-group">
                                            <label>Type</label>
                                            <select
                                                name="subType"
                                                value={formData.subType}
                                                onChange={handleInputChange}
                                                className="form-select"
                                            >
                                                <option value="PS">PS Subscription</option>
                                                <option value="GamePass">Game Pass</option>
                                                <option value="WiFi">WiFi</option>
                                                <option value="OTT">OTT / Streaming</option>
                                                <option value="Other">Other</option>
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label>Provider / Details</label>
                                            <input
                                                type="text"
                                                name="provider"
                                                placeholder="e.g. Airtel, Xbox Ultimate"
                                                value={formData.provider}
                                                onChange={handleInputChange}
                                                className="form-input"
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>Expiry Date</label>
                                            <input
                                                type="date"
                                                name="expiryDate"
                                                value={formData.expiryDate}
                                                onChange={handleInputChange}
                                                required
                                                className="form-input"
                                            />
                                        </div>
                                    </>
                                )}

                                {/* Salary Specific */}
                                {formType === 'salary' && (
                                    <>
                                        <div className="form-group">
                                            <label>Employee Name</label>
                                            <input
                                                type="text"
                                                name="employeeName"
                                                value={formData.employeeName}
                                                onChange={handleInputChange}
                                                required
                                                className="form-input"
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>Notes</label>
                                            <input
                                                type="text"
                                                name="notes"
                                                value={formData.notes}
                                                onChange={handleInputChange}
                                                className="form-input"
                                            />
                                        </div>
                                    </>
                                )}

                                <button type="submit" className="submit-btn">
                                    Save Entry
                                </button>
                            </div>
                        </form>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* List Header & Tabs */}
            <div className="list-header">
                <div className="list-tabs">
                    <button
                        className={activeTab === 'subscriptions' ? 'active' : ''}
                        onClick={() => setActiveTab('subscriptions')}
                    >
                        Subscriptions
                    </button>
                    <button
                        className={activeTab === 'salaries' ? 'active' : ''}
                        onClick={() => setActiveTab('salaries')}
                    >
                        Salary History
                    </button>
                </div>
            </div>

            {/* List Content */}
            <div className="list-section">
                {activeTab === 'subscriptions' ? (
                    subscriptions.length === 0 ? (
                        <p className="text-gray-400 text-center py-4">No active subscriptions</p>
                    ) : (
                        subscriptions.map(sub => {
                            const status = getSubscriptionStatus(sub.expiryDate);
                            return (
                                <motion.div
                                    key={sub.id}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="list-item"
                                >
                                    <div className="item-main">
                                        <div className="flex gap-2 items-center">
                                            <span className="item-title">{sub.type}</span>
                                            {sub.provider && <span className="text-xs text-gray-500">| {sub.provider}</span>}
                                        </div>
                                        <span className="item-subtitle">Expires: {new Date(sub.expiryDate).toLocaleDateString()}</span>
                                    </div>
                                    <div className="flex items-center">
                                        <div className="item-meta">
                                            <span className="item-cost">₹{sub.cost}</span>
                                            <span className={`status-badge ${status.class}`}>{status.label}</span>
                                        </div>
                                        <button
                                            onClick={() => handleDelete(sub.id, 'subscription')}
                                            className="delete-btn"
                                            title="Delete"
                                        >
                                            <FaTrash size={12} />
                                        </button>
                                    </div>
                                </motion.div>
                            );
                        })
                    )
                ) : (
                    // Salaries
                    salaries.length === 0 ? (
                        <p className="text-gray-400 text-center py-4">No salary records</p>
                    ) : (
                        salaries.map(sal => (
                            <motion.div
                                key={sal.id}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="list-item"
                            >
                                <div className="item-main">
                                    <span className="item-title">{sal.employeeName}</span>
                                    <span className="item-subtitle">Paid: {new Date(sal.paymentDate).toLocaleDateString()}</span>
                                </div>
                                <div className="flex items-center">
                                    <div className="item-meta">
                                        <span className="item-cost">₹{sal.amount}</span>
                                        {sal.notes && <span className="text-xs text-gray-500">{sal.notes}</span>}
                                    </div>
                                    <button
                                        onClick={() => handleDelete(sal.id, 'salary')}
                                        className="delete-btn"
                                        title="Delete"
                                    >
                                        <FaTrash size={12} />
                                    </button>
                                </div>
                            </motion.div>
                        ))
                    )
                )}
            </div>
        </GlassCard>
    );
};

export default SubscriptionOverview;
