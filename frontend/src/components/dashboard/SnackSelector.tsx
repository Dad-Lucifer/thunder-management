import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaPlus, FaMinus } from 'react-icons/fa';
import './SnackSelector.css';

interface SnackItem {
    id: string;
    name: string;
    price: number;
    category: 'snack' | 'drink';
    emoji: string;
}

export const SNACK_INVENTORY: SnackItem[] = [
    // Snacks
    { id: 'chips', name: 'Chips', price: 15, category: 'snack', emoji: '🥔' },
    { id: 'cadbury', name: 'Cadbury', price: 15, category: 'snack', emoji: '🍫' },
    { id: 'doritos', name: 'Doritos', price: 20, category: 'snack', emoji: '🌮' },
    { id: 'maggie', name: 'Maggie', price: 25, category: 'snack', emoji: '🍜' },

    // Drinks
    { id: 'redbull', name: 'Redbull', price: 130, category: 'drink', emoji: '⚡' },
    { id: 'sting', name: 'Sting', price: 20, category: 'drink', emoji: '🥤' },
    { id: 'rio', name: 'Rio', price: 50, category: 'drink', emoji: '🍇' },
    { id: 'dietcoke', name: 'Diet Coke', price: 45, category: 'drink', emoji: '🥤' },
    { id: 'softdrink', name: 'Pepsi/Sprite', price: 25, category: 'drink', emoji: '🥤' },
    { id: 'water', name: 'Water', price: 15, category: 'drink', emoji: '💧' },
];

interface Props {
    onChange: (summary: string, totalCost: number, items: { id: string; name: string; price: number; qty: number }[]) => void;
}

const SnackSelector: React.FC<Props> = ({ onChange }) => {
    const [activeTab, setActiveTab] = useState<'all' | 'snack' | 'drink'>('all');
    const [quantities, setQuantities] = useState<{ [id: string]: number }>({});

    // Reset or Parse initial value if needed (optional, keeping simple for now)
    // For now, we start empty for new sessions usually.

    const updateQuantity = (id: string, delta: number) => {
        setQuantities(prev => {
            const current = prev[id] || 0;
            const next = Math.max(0, current + delta);
            const newQty = { ...prev, [id]: next };
            if (next === 0) delete newQty[id];
            return newQty;
        });
    };

    // Sync to parent
    useEffect(() => {
        // Prepare items list
        const items = Object.entries(quantities).map(([id, qty]) => {
            const item = SNACK_INVENTORY.find(i => i.id === id);
            return item ? { ...item, qty } : null;
        }).filter(Boolean) as { id: string; name: string; price: number; qty: number }[];

        // Generate summary string
        const parts = items.map(item => `${item.name} x${item.qty}`);
        const summary = parts.length > 0 ? parts.join(', ') : '';

        // Calculate total cost
        const cost = items.reduce((sum, item) => sum + (item.price * item.qty), 0);

        onChange(summary, cost, items);
    }, [quantities, onChange]);

    // Derived state
    const totalCost = Object.entries(quantities).reduce((sum, [id, qty]) => {
        const item = SNACK_INVENTORY.find(i => i.id === id);
        return sum + (item ? item.price * qty : 0);
    }, 0);

    const filteredItems = SNACK_INVENTORY.filter(item =>
        activeTab === 'all' || item.category === activeTab
    );

    return (
        <div className="snack-selector-container">
            <div className="selector-tabs">
                {(['all', 'snack', 'drink'] as const).map(tab => (
                    <button
                        key={tab}
                        className={`tab-btn ${activeTab === tab ? 'active' : ''}`}
                        onClick={() => setActiveTab(tab)}
                    >
                        {tab.charAt(0).toUpperCase() + tab.slice(1) + (tab === 'all' ? '' : 's')}
                    </button>
                ))}
            </div>

            <div className="snack-grid">
                <AnimatePresence>
                    {filteredItems.map(item => {
                        const qty = quantities[item.id] || 0;
                        return (
                            <motion.div
                                key={item.id}
                                layout
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                className={`snack-card ${qty > 0 ? 'selected' : ''}`}
                                onClick={() => updateQuantity(item.id, 1)}
                            >
                                <div className="snack-emoji">{item.emoji}</div>
                                <div className="snack-details">
                                    <span className="snack-name">{item.name}</span>
                                    <span className="snack-price">₹{item.price}</span>
                                </div>

                                {qty > 0 ? (
                                    <div className="quantity-control" onClick={e => e.stopPropagation()}>
                                        <button className="qty-btn minus" onClick={() => updateQuantity(item.id, -1)}>
                                            <FaMinus size={10} />
                                        </button>
                                        <span className="qty-val">{qty}</span>
                                        <button className="qty-btn plus" onClick={() => updateQuantity(item.id, 1)}>
                                            <FaPlus size={10} />
                                        </button>
                                    </div>
                                ) : (
                                    <div style={{ height: '32px' }} /> // Spacer to keep card size consistent
                                )}
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </div>

            {totalCost > 0 && (
                <div className="selection-summary">
                    <span className="summary-text">Total Snacks:</span>
                    <span>₹{totalCost}</span>
                </div>
            )}
        </div>
    );
};

export default SnackSelector;
