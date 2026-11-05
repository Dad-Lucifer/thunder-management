import React, { useEffect, useState, useCallback } from 'react';
import api from '../../utils/api';
import { FaTrash, FaUserShield, FaUserTie, FaRedo, FaHistory } from 'react-icons/fa';
import type { ReportingMonth, DayFilter } from '../../utils/reportingPeriods';
import './DeletionLogs.css';

interface DeletionLog {
    id: string;
    source: string; // 'Active Session' | 'Upcoming Booking'
    customerName: string;
    deletedBy: string; // 'Owner' | 'Employee'
    deletedByName: string;
    deletedAt: string;
    details: any;
}

interface DeletionLogsProps {
    selectedMonth?: ReportingMonth;
    dayFilter?: DayFilter;
}

const DeletionLogs: React.FC<DeletionLogsProps> = React.memo(({ selectedMonth, dayFilter }) => {
    const [logs, setLogs] = useState<DeletionLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchLogs = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const queryParam = selectedMonth
                ? `month=${encodeURIComponent(selectedMonth.key)}${dayFilter ? `&dayFilter=${encodeURIComponent(dayFilter)}` : ''}`
                : 'range=thismonth';
            const res = await api.get(`/api/owner/logs?${queryParam}`);
            setLogs(Array.isArray(res.data) ? res.data : []);
        } catch (err: any) {
            console.error('Failed to fetch deletion logs', err);
            setError('System audit service unavailable');
        } finally {
            setLoading(false);
        }
    }, [selectedMonth, dayFilter]);

    useEffect(() => {
        fetchLogs();
    }, [fetchLogs]);

    const getRoleIcon = (role: string) => {
        return role.toLowerCase() === 'owner' ? <FaUserShield className="text-purple-400" /> : <FaUserTie className="text-blue-400" />;
    };

    return (
        <div className="deletion-logs-card">
            <div className="logs-header">
                <div className="logs-title">
                    <div className="icon-box">
                        <FaTrash className="icon-red" />
                    </div>
                    <span>Deletion Audit</span>
                </div>

                <div className="logs-filter-wrapper flex gap-1 items-center">
                    <span className="filter-tab active" style={{ cursor: 'default' }}>
                        {selectedMonth?.label || 'This Month'}
                    </span>
                    <button
                        onClick={fetchLogs}
                        className="filter-tab"
                        title="Refresh Logs"
                        style={{ padding: '0.4rem 0.6rem' }}
                    >
                        <FaRedo size={12} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            <div className="logs-list custom-scrollbar">
                {loading ? (
                    <div className="logs-loading">
                        <div className="loading-dots">
                            <div className="dot"></div>
                            <div className="dot"></div>
                            <div className="dot"></div>
                        </div>
                        <span className="text-xs uppercase tracking-widest mt-4">Syncing Audit Trail...</span>
                    </div>
                ) : error ? (
                    <div className="logs-error">
                        <p className="error-msg">{error}</p>
                        <button onClick={fetchLogs} className="retry-btn">
                            <FaRedo /> Retry Connection
                        </button>
                    </div>
                ) : logs.length === 0 ? (
                    <div className="logs-empty">
                        <div className="empty-icon"><FaHistory /></div>
                        <p>No deletion records found for this period.</p>
                    </div>
                ) : (
                    <div className="flex flex-col gap-3">
                        {logs.map((log) => (
                            <div
                                key={log.id}
                                className="log-item log-item--animate"
                            >
                                <div className="log-avatar">
                                    {getRoleIcon(log.deletedBy)}
                                </div>

                                <div className="log-content">
                                    <div className="log-details-top">
                                        <span className="log-target">{log.customerName}</span>
                                        <span className="log-time">
                                            {new Date(log.deletedAt).toLocaleTimeString('en-US', {
                                                hour: '2-digit', minute: '2-digit'
                                            })}
                                        </span>
                                    </div>

                                    <div className="log-details-bottom">
                                        <span className="text-xs text-slate-400">Deleted from {log.source}</span>
                                        <span className="mx-1">•</span>
                                        <span className={`badge ${log.deletedBy.toLowerCase()}`}>
                                            {log.deletedBy.toUpperCase()}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
});

export default DeletionLogs;
