'use client';

import React, { useState } from 'react';
import { DestinationMatch, saveDestinationMappings } from '@/lib/trip-destination-resolver';
import { X, MapPin, Check, AlertTriangle } from 'lucide-react';

interface DestinationConflict {
    tripId: string;
    tripName: string;
    tripPurpose: string;
    tripStartDate: string;
    tripEndDate: string;
    candidates: DestinationMatch[];
}

interface TripDestinationPickerDialogProps {
    isOpen: boolean;
    onClose: () => void;
    conflicts: DestinationConflict[];
    onResolve: () => void;
}

export type { DestinationConflict };

export function TripDestinationPickerDialog({ isOpen, onClose, conflicts, onResolve }: TripDestinationPickerDialogProps) {
    const [selections, setSelections] = useState<Record<string, string>>({});

    if (!isOpen || conflicts.length === 0) return null;

    const handleSelect = (tripId: string, recordId: string) => {
        setSelections(prev => ({ ...prev, [tripId]: recordId }));
    };

    const handleSave = () => {
        if (Object.keys(selections).length === 0) return;
        saveDestinationMappings(selections);
        onResolve();
        onClose();
        setSelections({});
    };

    const allResolved = conflicts.every(c => selections[c.tripId]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-3xl max-h-[80vh] flex flex-col">
                <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-orange-500" />
                        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">출장지 매칭 (동명이인)</h3>
                    </div>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-6">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                        같은 이름의 팀원이 여러 명 있습니다. 정확한 출장지를 선택해주세요.
                    </p>

                    {conflicts.map(conflict => (
                        <div key={conflict.tripId} className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                            {/* Trip Info */}
                            <div className="mb-3 pb-3 border-b border-gray-200 dark:border-gray-700">
                                <div className="font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                                    <MapPin className="w-4 h-4 text-blue-500" />
                                    {conflict.tripName}
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    근태기반: {conflict.tripPurpose} ({conflict.tripStartDate} ~ {conflict.tripEndDate})
                                </div>
                            </div>

                            {/* Candidate Cards */}
                            <div className="grid grid-cols-1 gap-2">
                                {conflict.candidates.map(candidate => (
                                    <button
                                        key={candidate.recordId}
                                        onClick={() => handleSelect(conflict.tripId, candidate.recordId)}
                                        className={`flex items-center justify-between p-3 rounded-md border text-left transition-all ${selections[conflict.tripId] === candidate.recordId
                                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 ring-1 ring-blue-500'
                                            : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700'
                                            }`}
                                    >
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium text-sm text-gray-900 dark:text-gray-100">
                                                    {candidate.knoxId}
                                                </span>
                                                <span className="text-xs px-1.5 py-0.5 bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 rounded font-medium">
                                                    {candidate.destination}
                                                </span>
                                            </div>
                                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                {candidate.group} / {candidate.part} · {candidate.startDate} ~ {candidate.endDate} · {candidate.purpose}
                                            </div>
                                        </div>
                                        {selections[conflict.tripId] === candidate.recordId && (
                                            <Check className="w-4 h-4 text-blue-500 flex-shrink-0 ml-2" />
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
                    <span className="text-xs text-gray-500">
                        {Object.keys(selections).length} / {conflicts.length} 선택됨
                    </span>
                    <div className="flex gap-2">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                        >
                            취소
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={!allResolved}
                            className="px-4 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            저장 및 적용
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
