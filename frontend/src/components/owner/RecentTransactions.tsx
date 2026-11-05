import React, { useEffect, useState, useCallback, useRef } from 'react';
import { GlassCard, GradientTitle } from './ui/ModernComponents';
import { FaClock, FaCheckCircle, FaPlayCircle } from 'react-icons/fa';
import type { ReportingMonth, DayFilter } from '../../utils/reportingPeriods';
import TransactionDetailDrawer from './TransactionDetailDrawer';
import type { TransactionDetail } from './TransactionDetailDrawer';
import api from '../../utils/api';

interface Transaction extends TransactionDetail {
    // Inherits all fields from TransactionDetail
}

interface Props {
    timeFilter?: string;
    selectedMonth?: ReportingMonth;
    dayFilter?: DayFilter;
}

const formatTimestamp = (timestamp: string | null | undefined) => {
    if (!timestamp) return '—';
    try {
        const date = new Date(timestamp);
        if (isNaN(date.getTime())) return '—';
        const options: Intl.DateTimeFormatOptions = {
            timeZone: 'Asia/Kolkata',
            day: 'numeric',
            month: 'short',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        };
        return new Intl.DateTimeFormat('en-IN', options).format(date);
    } catch {
        return '—';
    }
};

const RecentTransactions: React.FC<Props> = React.memo(({ timeFilter, selectedMonth, dayFilter }) => {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [selectedTxn, setSelectedTxn] = useState<Transaction | null>(null);
    const exportCacheRef = useRef<Record<string, any[]>>({});

    useEffect(() => {
        let isMounted = true;
        const fetchTransactions = async () => {
            try {
                const queryParam = selectedMonth
                    ? `month=${encodeURIComponent(selectedMonth.key)}${dayFilter ? `&dayFilter=${encodeURIComponent(dayFilter)}` : ''}`
                    : `range=${(timeFilter || 'today').toLowerCase().replace(' ', '')}`;

                let rawData: any[] = [];
                try {
                    const res = await api.get(`/api/owner/transactions?${queryParam}`);
                    rawData = Array.isArray(res.data) ? res.data : [];
                } catch {
                    const res = await fetch(`/api/owner/transactions?${queryParam}`);
                    const json = await res.json();
                    rawData = Array.isArray(json) ? json : [];
                }

                if (isMounted) {
                    setTransactions(rawData);
                }
            } catch (err) {
                console.error('❌ Transactions fetch failed', err);
            }
        };

        fetchTransactions();

        return () => {
            isMounted = false;
        };
    }, [timeFilter, selectedMonth, dayFilter]);

    // Handle transaction click & enrich details if older backend payload was received
    const handleTxnClick = useCallback(async (txn: Transaction) => {
        if (selectedTxn?.id === txn.id) {
            setSelectedTxn(null);
            return;
        }

        // If the transaction already has complete detail fields, show immediately
        if (txn.contactNumber !== undefined && txn.devices !== undefined && txn.isRenewed !== undefined) {
            setSelectedTxn(txn);
            return;
        }

        // Fallback: If detail fields are missing (e.g. from an older/un-updated API endpoint),
        // fetch session export data to enrich this record seamlessly.
        setSelectedTxn(txn);

        try {
            const monthKey = selectedMonth?.key || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
            let exportRows = exportCacheRef.current[monthKey];

            if (!exportRows) {
                try {
                    const res = await api.get(`/api/sessions/export?month=${encodeURIComponent(monthKey)}`);
                    exportRows = Array.isArray(res.data) ? res.data : (res.data?.data || []);
                } catch {
                    const res = await fetch(`/api/sessions/export?month=${encodeURIComponent(monthKey)}`);
                    const json = await res.json();
                    exportRows = Array.isArray(json) ? json : (json?.data || []);
                }
                exportCacheRef.current[monthKey] = exportRows;
            }

            if (exportRows && exportRows.length > 0) {
                const cleanTxnName = (txn.customerName || txn.item || '').toLowerCase().replace(/\s*\(.*?\)/, '').trim();
                const matched = exportRows.find((row: any) => {
                    const rowName = (row["Name"] || '').toLowerCase().trim();
                    const rowAmount = Number(row["Total Amount"] || 0);
                    return (rowName && cleanTxnName && (rowName.includes(cleanTxnName) || cleanTxnName.includes(rowName))) &&
                           (Math.abs(rowAmount - (txn.amount || 0)) < 2);
                }) || exportRows.find((row: any) => {
                    const rowAmount = Number(row["Total Amount"] || 0);
                    return Math.abs(rowAmount - (txn.amount || 0)) < 1;
                });

                if (matched) {
                    const enriched: Transaction = {
                        ...txn,
                        customerName: txn.customerName || matched["Name"] || 'Customer',
                        contactNumber: txn.contactNumber ?? (matched["Phone Number"] !== 'N/A' && matched["Phone Number"] ? String(matched["Phone Number"]).trim() : null),
                        devices: txn.devices ?? (matched["Devices"] && matched["Devices"] !== 'None' ? matched["Devices"].split(', ') : []),
                        cashAmount: txn.cashAmount ?? Number(matched["Cash"] || 0),
                        onlineAmount: txn.onlineAmount ?? Number(matched["Online"] || 0),
                        isRenewed: txn.isRenewed ?? (matched["Session Renewed"] === 'Yes'),
                        snacks: txn.snacks ?? (matched["Snacks"] && matched["Snacks"] !== 'None' ? [{ name: matched["Snacks"], quantity: 1, price: 0 }] : [])
                    };
                    setSelectedTxn(enriched);
                }
            }
        } catch (enrichErr) {
            console.warn('Could not enrich transaction details:', enrichErr);
        }
    }, [selectedTxn, selectedMonth]);

    const handleDrawerClose = useCallback(() => {
        setSelectedTxn(null);
    }, []);

    const isCurrent = !selectedMonth || selectedMonth.isCurrent;

    return (
        <>
            <GlassCard className="txn-panel">
                <div className="panel-header">
                    <GradientTitle size="medium">
                        {isCurrent ? 'Live Transactions' : `Transactions (${selectedMonth?.label})`}
                    </GradientTitle>
                    <span className={isCurrent ? "live-badge" : "live-badge archive"}>
                        {isCurrent ? '● LIVE FEED' : 'RECORDED'}
                    </span>
                </div>

                <div className="txn-list custom-scrollbar">
                    {transactions.map((txn) => (
                        <div
                            key={txn.id}
                            className={`txn-item txn-item--fade txn-item--clickable${selectedTxn?.id === txn.id ? ' txn-item--selected' : ''}`}
                            onClick={() => handleTxnClick(txn)}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleTxnClick(txn); }}
                            aria-expanded={selectedTxn?.id === txn.id}
                            aria-label={`View details for ${txn.item}`}
                        >
                            <div className="txn-left">
                                <div className={`txn-icon ${txn.status}`}>
                                    {txn.status === 'completed'
                                        ? <FaCheckCircle size={12} />
                                        : <FaPlayCircle size={12} />
                                    }
                                </div>

                                <div className="txn-info">
                                    <p className="txn-name">{txn.item}</p>
                                    <p className="txn-time">
                                        <FaClock size={10} /> {formatTimestamp(txn.timestamp)}
                                    </p>
                                </div>
                            </div>

                            <div className="txn-right">
                                <p className="txn-amount">₹{txn.amount ?? 0}</p>
                                <p className={`txn-status ${txn.status}`}>
                                    {txn.status.toUpperCase()}
                                </p>
                            </div>
                        </div>
                    ))}

                    {transactions.length === 0 && (
                        <p className="empty-state">No transactions yet</p>
                    )}
                </div>
            </GlassCard>

            {/* Drawer renders outside the card so it can overlay the full screen */}
            <TransactionDetailDrawer txn={selectedTxn} onClose={handleDrawerClose} />
        </>
    );
});

RecentTransactions.displayName = 'RecentTransactions';

export default RecentTransactions;
