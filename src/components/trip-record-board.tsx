'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { TripRecord } from '@/lib/types';
import { saveTripRecords, deleteTripRecord, addTripRecord } from '@/lib/storage';
import { parseTripRecordText } from '@/lib/trip-record-parser';
import { Trash2, ClipboardPaste, AlertCircle, Calendar, MapPin, Briefcase } from 'lucide-react';
import { useData } from '@/providers/data-provider';

export function TripRecordBoard({ lastUpdate }: { lastUpdate?: number }) {
    const { tripRecords: records, refreshData } = useData();
    const [searchQuery, setSearchQuery] = useState('');
    const [importToast, setImportToast] = useState<string | null>(null);

    const [columnCount, setColumnCount] = useState(8);
    const [headers, setHeaders] = useState<string[]>([]);

    useEffect(() => {
        // Load desired column count & headers
        if (typeof window !== 'undefined') {
            const savedCols = localStorage.getItem('tripRecordColumns');
            if (savedCols) {
                setColumnCount(parseInt(savedCols, 10));
            }

            const savedHeaders = localStorage.getItem('tripRecordHeaders');
            if (savedHeaders) {
                try {
                    setHeaders(JSON.parse(savedHeaders));
                } catch (e) {
                    // ignore
                }
            } else {
                setHeaders([]);
            }
        }
    }, [lastUpdate]);

    const showToast = (msg: string) => {
        setImportToast(msg);
        setTimeout(() => setImportToast(null), 3000);
    };

    // Paste handled by parent TripBoard


    const handleDelete = async (id: string) => {
        if (!confirm('삭제하시겠습니까?')) return;
        await deleteTripRecord(id);
        refreshData();
    };

    // Filter
    const filteredRecords = records.filter(r => {
        const q = searchQuery.toLowerCase();
        if (!q) return true;

        // Search in structured fields
        if (r.name.toLowerCase().includes(q) ||
            r.group.toLowerCase().includes(q) ||
            r.part.toLowerCase().includes(q) ||
            r.destination.toLowerCase().includes(q) ||
            r.purpose.toLowerCase().includes(q)) {
            return true;
        }

        // Search in rawData
        if (r.rawData && r.rawData.some(cell => cell.toLowerCase().includes(q))) {
            return true;
        }

        return false;
    });

    return (
        <div className="flex flex-col h-full bg-white dark:bg-gray-900">
            {/* Header */}
            <div className="flex-shrink-0 border-b border-gray-200 dark:border-gray-700 p-4">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <Briefcase className="w-5 h-5 text-purple-500" />
                        <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200">출장 현황 DB (수동)</h2>
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                            ({filteredRecords.length}건)
                        </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-gray-400">
                        <ClipboardPaste className="w-3.5 h-3.5" />
                        <span>Ctrl+Shift+V: 엑셀 붙여넣기</span>
                    </div>
                </div>

                {/* Search */}
                <input
                    type="text"
                    placeholder="이름, 그룹, 파트, 출장지, 목적 검색..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-200"
                />
            </div>

            {/* Toast */}
            {importToast && (
                <div className="flex-shrink-0 px-4 py-2 bg-purple-50 dark:bg-purple-900/20 border-b border-purple-200 dark:border-purple-800">
                    <p className="text-sm text-purple-700 dark:text-purple-300 whitespace-pre-line">{importToast}</p>
                </div>
            )}

            {/* List */}
            <div className="flex-1 overflow-auto min-h-0">
                <table className="text-sm whitespace-nowrap" style={{ minWidth: `${columnCount * 128 + 64}px` }}>
                    <thead className="sticky top-0 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 z-10">
                        <tr>
                            {Array.from({ length: columnCount }).map((_, i) => (
                                <th key={i} className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 border-r border-gray-100 dark:border-gray-800" style={{ minWidth: '128px' }}>
                                    {headers[i] || `Column ${i + 1}`}
                                </th>
                            ))}
                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400 sticky right-0 bg-gray-50 dark:bg-gray-800 shadow-l" style={{ minWidth: '64px' }}>
                                관리
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                        {filteredRecords.map(record => (
                            <tr key={record.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                {Array.from({ length: columnCount }).map((_, i) => {
                                    // Use rawData if available, otherwise map legacy fields to standard 8 cols
                                    let content = '';
                                    if (record.rawData && record.rawData[i] !== undefined) {
                                        content = record.rawData[i];
                                    } else if (!record.rawData) {
                                        // Legacy handling (fallback mapping)
                                        switch (i) {
                                            case 0: content = record.knoxId || ''; break;
                                            case 1: content = record.name; break;
                                            case 2: content = record.group; break;
                                            case 3: content = record.part; break;
                                            case 4: content = record.destination; break;
                                            case 5: content = record.startDate; break;
                                            case 6: content = record.endDate; break;
                                            case 7: content = record.purpose; break;
                                        }
                                    }
                                    return (
                                        <td key={i} className="px-4 py-3 text-gray-900 dark:text-gray-100 border-r border-gray-100 dark:border-gray-800 overflow-hidden text-ellipsis" style={{ minWidth: '128px', maxWidth: '256px' }}>
                                            {content}
                                        </td>
                                    );
                                })}
                                <td className="px-4 py-3 text-right sticky right-0 bg-white dark:bg-gray-900 shadow-l" style={{ minWidth: '64px' }}>
                                    <button
                                        onClick={() => handleDelete(record.id)}
                                        className="p-1 text-gray-400 hover:text-red-500 transition-all"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {filteredRecords.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                        <AlertCircle className="w-10 h-10 mb-2 opacity-20" />
                        <p>데이터가 없습니다.</p>
                        <p className="text-xs mt-1">Ctrl+Shift+V로 엑셀 데이터를 붙여넣으세요.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
