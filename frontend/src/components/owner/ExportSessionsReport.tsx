import { useState } from 'react';
import * as XLSX from 'xlsx';
import type { ReportingMonth, DayFilter } from '../../utils/reportingPeriods';
import api from '../../utils/api';

/**
 * Custom Hook for handling Month-Scoped Session Exports
 * Returns { exportData, loading }
 */
export const useSessionExport = () => {
    const [loading, setLoading] = useState(false);

    const exportData = async (
        selectedMonth: ReportingMonth,
        dayFilter: DayFilter = 'all',
        format: 'csv' | 'xlsx' = 'csv'
    ) => {
        if (loading) return;
        setLoading(true);

        try {
            const queryParam = `month=${encodeURIComponent(selectedMonth.key)}&dayFilter=${encodeURIComponent(dayFilter)}`;
            const response = await api.get(`/api/sessions/export?${queryParam}`);
            const resJson = response.data;
            const sessionData = Array.isArray(resJson) ? resJson : (resJson.data || []);
            const reportTitle = resJson.title || `SB GAMING DATABASE [ ${selectedMonth.name.toUpperCase()} ]`;

            if (!sessionData || sessionData.length === 0) {
                alert(`No session records found for ${dayFilter !== 'all' ? dayFilter : selectedMonth.label}.`);
                setLoading(false);
                return;
            }

            // 1. Create a new Workbook
            const wb = XLSX.utils.book_new();
            wb.Props = {
                Title: reportTitle,
                Subject: `Report - ${selectedMonth.label}`,
                Author: 'SB Gaming Admin',
                CreatedDate: new Date()
            };

            // 2. Build Title Header & JSON Data
            // Prepend title row and blank spacer row
            const ws = XLSX.utils.aoa_to_sheet([
                [reportTitle],
                [] // empty row
            ]);

            // Append json records starting at row 3 (A3)
            XLSX.utils.sheet_add_json(ws, sessionData, { origin: 'A3' });

            // Merge Title row across columns A1:M1
            ws['!merges'] = [
                { s: { r: 0, c: 0 }, e: { r: 0, c: 12 } }
            ];

            // 3. Auto-width columns
            const wscols = [
                { wch: 25 }, // Session Entry
                { wch: 12 }, // Date
                { wch: 10 }, // Time
                { wch: 20 }, // Name
                { wch: 15 }, // Phone Number
                { wch: 25 }, // Devices
                { wch: 12 }, // Duration
                { wch: 30 }, // Snacks
                { wch: 15 }, // Session Renewed
                { wch: 14 }, // Total Amount
                { wch: 10 }, // Cash
                { wch: 10 }, // Online
                { wch: 15 }, // Joined During
            ];
            ws['!cols'] = wscols;

            // 4. Append Sheet with safe sheet title (max 31 characters, no brackets in Excel sheet name)
            const sheetTag = dayFilter !== 'all' ? dayFilter.toUpperCase().slice(0, 10) : selectedMonth.name.toUpperCase().slice(0, 3);
            const sanitizedSheetName = `SB GAMING ${sheetTag} ${selectedMonth.year}`;
            XLSX.utils.book_append_sheet(wb, ws, sanitizedSheetName);

            // 5. Generate File Name: e.g. admin-report-today-2026.csv or admin-report-november-2026.csv
            const tag = dayFilter !== 'all' ? dayFilter : selectedMonth.name.toLowerCase();
            const fileName = `admin-report-${tag}-${selectedMonth.year}.${format}`;

            // 6. Download
            if (format === 'csv') {
                XLSX.writeFile(wb, fileName, { bookType: 'csv' });
            } else {
                XLSX.writeFile(wb, fileName, { bookType: 'xlsx' });
            }

        } catch (error: any) {
            console.error('Export Error:', error);
            alert(`Failed to export session report: ${error.message || 'Please check console'}`);
        } finally {
            setLoading(false);
        }
    };

    return { exportData, loading };
};
