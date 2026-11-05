import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaCalendarAlt, FaChevronDown, FaCheck } from 'react-icons/fa';
import type { ReportingMonth } from '../../utils/reportingPeriods';
import './MonthSelector.css';

interface MonthSelectorProps {
  currentMonth: ReportingMonth;
  previousMonth: ReportingMonth;
  selectedMonth: ReportingMonth;
  onChange: (month: ReportingMonth) => void;
}

export const MonthSelector: React.FC<MonthSelectorProps> = ({
  currentMonth,
  previousMonth,
  selectedMonth,
  onChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const options = [currentMonth, previousMonth];

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleSelect = (month: ReportingMonth) => {
    onChange(month);
    setIsOpen(false);
  };

  return (
    <div className="month-selector-container" ref={containerRef}>
      <button
        type="button"
        className="month-selector-btn"
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <FaCalendarAlt className="month-icon" />
        <span>{selectedMonth.label}</span>
        <span className={`month-badge ${selectedMonth.isCurrent ? 'current' : 'previous'}`}>
          {selectedMonth.isCurrent ? 'Current' : 'Previous'}
        </span>
        <FaChevronDown className={`month-chevron ${isOpen ? 'open' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="month-dropdown-menu"
            initial={{ opacity: 0, y: -6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.96 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
            role="listbox"
          >
            {options.map((month) => {
              const isSelected = selectedMonth.key === month.key;
              return (
                <button
                  key={month.key}
                  type="button"
                  className={`month-dropdown-item ${isSelected ? 'active' : ''}`}
                  onClick={() => handleSelect(month)}
                  onMouseDown={(e) => {
                    // Prevent mousedown from bubbling to document and triggering handleClickOutside prematurely
                    e.stopPropagation();
                  }}
                  role="option"
                  aria-selected={isSelected}
                >
                  <div className="item-label">
                    <span>{month.label}</span>
                    <span className={`month-badge ${month.isCurrent ? 'current' : 'previous'}`}>
                      {month.isCurrent ? 'Current' : 'Previous'}
                    </span>
                  </div>
                  {isSelected && <FaCheck className="check-icon" />}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default React.memo(MonthSelector);
