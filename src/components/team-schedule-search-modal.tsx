"use client";

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Task } from '@/lib/types';
import { format, isSameMonth } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Search, Calendar, Clock, X } from 'lucide-react';

interface TeamScheduleSearchModalProps {
    isOpen: boolean;
    onClose: () => void;
    tasks: Task[];
    teamScheduleCategoryId: string;
    onNavigateToDate: (date: Date) => void;
}

export function TeamScheduleSearchModal({
    isOpen,
    onClose,
    tasks,
    teamScheduleCategoryId,
    onNavigateToDate,
}: TeamScheduleSearchModalProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    // Focus input when modal opens
    useEffect(() => {
        if (isOpen) {
            setSearchQuery('');
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [isOpen]);

    // Filter team schedules based on search query
    const searchResults = useMemo(() => {
        if (!searchQuery.trim()) {
            // Show recent team schedules when no query (sorted by date descending)
            return tasks
                .filter(t => t.categoryId === teamScheduleCategoryId && t.dueDate)
                .sort((a, b) => new Date(b.dueDate!).getTime() - new Date(a.dueDate!).getTime())
                .slice(0, 20);
        }

        const query = searchQuery.toLowerCase();
        return tasks
            .filter(t => {
                if (t.categoryId !== teamScheduleCategoryId) return false;
                const titleMatch = t.title.toLowerCase().includes(query);
                const timeMatch = t.dueTime?.toLowerCase().includes(query);
                return titleMatch || timeMatch;
            })
            .sort((a, b) => new Date(b.dueDate!).getTime() - new Date(a.dueDate!).getTime())
            .slice(0, 20);
    }, [tasks, teamScheduleCategoryId, searchQuery]);

    const handleResultClick = (task: Task) => {
        if (task.dueDate) {
            onNavigateToDate(new Date(task.dueDate));
            onClose();
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            onClose();
        }
    };

    const getHighlightColor = (level: number | undefined) => {
        switch (level) {
            case 1: return 'bg-red-500';
            case 2: return 'bg-green-500';
            case 3: return 'bg-purple-500';
            default: return 'bg-gray-400';
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-lg max-h-[80vh] flex flex-col" onKeyDown={handleKeyDown}>
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Search className="w-5 h-5" />
                        팀 일정 검색
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
                    {/* Search Input */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                            ref={inputRef}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="제목 또는 시간으로 검색..."
                            className="pl-10 pr-10"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>

                    {/* Results */}
                    <div className="flex-1 overflow-y-auto space-y-1 min-h-[200px] max-h-[400px]">
                        {searchResults.length === 0 ? (
                            <div className="text-center text-gray-500 py-8">
                                {searchQuery ? '검색 결과가 없습니다' : '팀 일정이 없습니다'}
                            </div>
                        ) : (
                            <>
                                <div className="text-xs text-gray-500 px-1 mb-2">
                                    {searchQuery ? `${searchResults.length}개 결과` : '최근 팀 일정'}
                                </div>
                                {searchResults.map((task) => (
                                    <div
                                        key={task.id}
                                        onClick={() => handleResultClick(task)}
                                        className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer transition-colors group"
                                    >
                                        {/* Highlight indicator */}
                                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${getHighlightColor(task.highlightLevel)}`} />

                                        {/* Date */}
                                        <div className="flex items-center gap-1 text-sm text-gray-500 w-20 flex-shrink-0">
                                            <Calendar className="w-3.5 h-3.5" />
                                            {task.dueDate && format(new Date(task.dueDate), 'MM/dd', { locale: ko })}
                                        </div>

                                        {/* Time */}
                                        <div className="flex items-center gap-1 text-sm text-gray-500 w-24 flex-shrink-0">
                                            <Clock className="w-3.5 h-3.5" />
                                            {task.dueTime || '--:--'}
                                        </div>

                                        {/* Title */}
                                        <div className="flex-1 truncate font-medium text-gray-900 dark:text-gray-100">
                                            {task.title}
                                        </div>
                                    </div>
                                ))}
                            </>
                        )}
                    </div>

                    {/* Tip */}
                    <div className="text-xs text-gray-400 text-center pt-2 border-t">
                        클릭하면 해당 날짜로 이동합니다
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
