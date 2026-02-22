'use client';

import React, { useState } from 'react';
import { TeamMember } from '@/lib/types';
import { saveNameResolution } from '@/lib/storage';
import { X, User, Check, AlertTriangle } from 'lucide-react';

interface Conflict {
    name: string;
    candidates: TeamMember[];
}

interface TripNameResolverDialogProps {
    isOpen: boolean;
    onClose: () => void;
    conflicts: Conflict[];
    onResolve: () => void;
}

export function TripNameResolverDialog({ isOpen, onClose, conflicts, onResolve }: TripNameResolverDialogProps) {
    const [selections, setSelections] = useState<Record<string, string>>({});

    if (!isOpen) return null;

    const handleSelect = (name: string, knoxId: string) => {
        setSelections(prev => ({ ...prev, [name]: knoxId }));
    };

    const handleSave = () => {
        // Save all selections
        Object.entries(selections).forEach(([name, knoxId]) => {
            saveNameResolution(name, knoxId);
        });
        onResolve();
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
                <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-orange-500" />
                        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">동명이인/미확인 해결</h3>
                    </div>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-6">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                        다음 이름들이 여러 명의 팀원과 매칭되거나 확인이 필요합니다.<br />
                        정확한 팀원을 선택해주세요. (선택 내용은 저장됩니다)
                    </p>

                    {conflicts.map(conflict => (
                        <div key={conflict.name} className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                            <div className="font-semibold text-gray-800 dark:text-gray-200 mb-3 flex items-center gap-2">
                                <User className="w-4 h-4 text-gray-500" />
                                {conflict.name}
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {conflict.candidates.map(candidate => (
                                    <button
                                        key={candidate.knoxId}
                                        onClick={() => handleSelect(conflict.name, candidate.knoxId)}
                                        className={`flex items-center justify-between p-3 rounded-md border text-left transition-all ${selections[conflict.name] === candidate.knoxId
                                                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 ring-1 ring-blue-500'
                                                : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700'
                                            }`}
                                    >
                                        <div>
                                            <div className="font-medium text-sm text-gray-900 dark:text-gray-100">
                                                {candidate.name}
                                            </div>
                                            <div className="text-xs text-gray-500 dark:text-gray-400">
                                                {candidate.group} / {candidate.part} / {candidate.position}
                                            </div>
                                        </div>
                                        {selections[conflict.name] === candidate.knoxId && (
                                            <Check className="w-4 h-4 text-blue-500" />
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ))}

                    {conflicts.length === 0 && (
                        <div className="text-center text-gray-500 py-8">
                            해결할 충돌이 없습니다.
                        </div>
                    )}
                </div>

                <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-2">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                    >
                        취소
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={Object.keys(selections).length === 0}
                        className="px-4 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        저장 및 적용
                    </button>
                </div>
            </div>
        </div>
    );
}
