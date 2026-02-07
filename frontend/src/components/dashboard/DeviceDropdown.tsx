import React from 'react';
import './SessionEntry.css'; // Reuse styles unless we make a new one

interface DeviceDropdownProps {
    label: string;
    limit: number;
    value: number;
    occupied: number[];
    icon: React.ReactNode;
    onChange: (val: number) => void;
}

const DeviceDropdown: React.FC<DeviceDropdownProps> = ({
    label,
    limit,
    value,
    occupied,
    icon,
    onChange
}) => {
    const isActive = value > 0;
    const availableCount = limit - occupied.length;
    const isEssentiallyFull = availableCount <= 0;

    return (
        <div className={`device-card-item ${isActive ? 'active' : ''} ${isEssentiallyFull ? 'sold-out' : ''}`}>
            <div className="device-icon-wrapper">
                {icon}
            </div>
            <div className="device-info">
                <span className="device-name">{label}</span>
                <span className="device-stock">
                    {isEssentiallyFull ? 'Occupied' : `${availableCount} available`}
                </span>
            </div>

            <div className="dropdown-control" onClick={(e) => e.stopPropagation()}>
                <select
                    className="mini-select"
                    value={value}
                    onChange={(e) => onChange(Number(e.target.value))}
                >
                    <option value={0}>None</option>
                    {Array.from({ length: limit }, (_, i) => i + 1).map(num => {
                        const isTaken = occupied.includes(num);
                        return (
                            <option key={num} value={num} disabled={isTaken}>
                                {num} {isTaken ? '(Occupied)' : ''}
                            </option>
                        );
                    })}
                </select>
            </div>
        </div>
    );
};

export default DeviceDropdown;
