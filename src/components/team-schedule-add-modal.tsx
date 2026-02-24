"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { CalendarIcon, Clock, User, Link, Star, X, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { addTask, updateTask, deleteTask } from '@/lib/storage';
import { Task } from '@/lib/types';

interface TeamScheduleAddModalProps {
    isOpen: boolean;
    onClose: () => void;
    onScheduleAdded: () => void;
    initialDate?: Date;
    teamScheduleCategoryId: string;
    existingTask?: Task | null;
}

export function TeamScheduleAddModal({
    isOpen,
    onClose,
    onScheduleAdded,
    initialDate,
    teamScheduleCategoryId,
    existingTask,
}: TeamScheduleAddModalProps) {
    const [title, setTitle] = useState('');
    const [date, setDate] = useState<Date | undefined>(initialDate || new Date());
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');
    const [highlightLevel, setHighlightLevel] = useState<string>('0');
    const [organizer, setOrganizer] = useState('');
    const [resourceUrls, setResourceUrls] = useState<string[]>(['']);
    const [isFavorite, setIsFavorite] = useState(false);
    const [isCalendarOpen, setIsCalendarOpen] = useState(false);

    // Reset form when modal opens
    useEffect(() => {
        if (isOpen) {
            if (existingTask) {
                // Edit mode
                setTitle(existingTask.title);
                setDate(existingTask.dueDate ? new Date(existingTask.dueDate) : new Date());

                // Parse time
                if (existingTask.dueTime) {
                    const rangeMatch = existingTask.dueTime.match(/(\d{2}:\d{2})\s*-\s*(\d{2}:\d{2})/);
                    if (rangeMatch) {
                        setStartTime(rangeMatch[1]);
                        setEndTime(rangeMatch[2]);
                    } else {
                        setStartTime(existingTask.dueTime);
                        // Auto-calc end time handled by effect below, but we set it manually if needed or let user adjust
                    }
                } else {
                    setStartTime('');
                    setEndTime('');
                }

                setHighlightLevel(existingTask.highlightLevel?.toString() || '0');
                setOrganizer(existingTask.organizer || '');
                // Load resourceUrls (with fallback to resourceUrl for legacy)
                const initialUrls = existingTask.resourceUrls && existingTask.resourceUrls.length > 0
                    ? existingTask.resourceUrls
                    : (existingTask.resourceUrl ? [existingTask.resourceUrl] : ['']);
                setResourceUrls(initialUrls);
                setIsFavorite(existingTask.isFavorite || false);
            } else {
                // Create mode - set default time to next full hour
                const now = new Date();
                const nextHour = new Date(now);
                nextHour.setMinutes(0, 0, 0);
                nextHour.setHours(now.getHours() + 1);

                const defaultStartTime = `${nextHour.getHours().toString().padStart(2, '0')}:00`;
                const endHour = (nextHour.getHours() + 1) % 24;
                const defaultEndTime = `${endHour.toString().padStart(2, '0')}:00`;

                setTitle('');
                setDate(initialDate || new Date());
                setStartTime(defaultStartTime);
                setEndTime(defaultEndTime);
                setHighlightLevel('0');
                setOrganizer('');
                setResourceUrls(['']);
                setIsFavorite(false);
            }
        }
    }, [isOpen, initialDate, existingTask]);

    // Auto-fill end time when start time changes (only if endTime is empty or we are creating new)
    useEffect(() => {
        if (startTime && (!endTime || !existingTask)) {
            const [hours, minutes] = startTime.split(':').map(Number);
            const endHours = (hours + 1) % 24;
            setEndTime(`${endHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`);
        }
    }, [startTime]);

    const handleSave = async () => {
        if (!title.trim() || !date || !startTime) return;

        const dueTimeString = endTime ? `${startTime} - ${endTime}` : startTime;

        // Filter out empty URLs and prepare for save
        const validUrls = resourceUrls.filter(u => u.trim());
        const legacyUrl = validUrls.length > 0 ? validUrls[0] : '';

        if (existingTask) {
            await updateTask(existingTask.id, {
                title: title.trim(),
                dueDate: date.toISOString(),
                dueTime: dueTimeString,
                highlightLevel: parseInt(highlightLevel, 10) as 0 | 1 | 2 | 3,
                organizer: organizer.trim() || undefined,
                resourceUrl: legacyUrl || undefined,
                resourceUrls: validUrls.length > 0 ? validUrls : undefined,
                isFavorite,
            });
        } else {
            await addTask(
                teamScheduleCategoryId,
                title.trim(),
                date.toISOString(),
                {
                    dueTime: dueTimeString,
                    highlightLevel: parseInt(highlightLevel, 10) as 0 | 1 | 2 | 3,
                    organizer: organizer.trim() || undefined,
                    resourceUrl: legacyUrl || undefined,
                    resourceUrls: validUrls.length > 0 ? validUrls : undefined,
                    isFavorite,
                    source: 'manual', // Mark as manually created - protected from team schedule import
                }
            );
        }

        onScheduleAdded();
        onClose();
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        // IME composition check
        if (e.nativeEvent.isComposing) return;

        // Enter or Ctrl+Enter to save (but not from textarea or if shift is pressed)
        if (e.key === 'Enter' && !e.shiftKey) {
            const target = e.target as HTMLElement;
            if (target.tagName !== 'TEXTAREA' && target.tagName !== 'SELECT') {
                e.preventDefault();
                e.stopPropagation();
                handleSave();
            }
        }
    };

    // Generate time options (00:00 to 23:30, 30min intervals)
    const timeOptions = React.useMemo(() => {
        const options: string[] = [];
        for (let h = 0; h < 24; h++) {
            options.push(`${h.toString().padStart(2, '0')}:00`);
            options.push(`${h.toString().padStart(2, '0')}:30`);
        }
        return options;
    }, []);

    // Work hours first for convenience
    const workHours = timeOptions.filter(t => {
        const hour = parseInt(t.split(':')[0], 10);
        return hour >= 8 && hour <= 18;
    });
    const otherHours = timeOptions.filter(t => {
        const hour = parseInt(t.split(':')[0], 10);
        return hour < 8 || hour > 18;
    });

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent
                className="sm:max-w-md"
                onKeyDown={handleKeyDown}
            >
                <DialogHeader>
                    <div className="flex items-center justify-between">
                        <DialogTitle>{existingTask ? '팀 일정 수정' : '팀 일정 추가'}</DialogTitle>
                        <button
                            type="button"
                            onClick={() => setIsFavorite(!isFavorite)}
                            className={`p-1 rounded-md transition-colors text-gray-400 hover:text-yellow-500 hover:bg-gray-100 dark:hover:bg-gray-800 mr-12 ${isFavorite ? 'text-yellow-500' : ''}`}
                        >
                            <Star className={`w-6 h-6 ${isFavorite ? 'fill-yellow-500' : ''}`} />
                        </button>
                    </div>
                </DialogHeader>

                <div className="space-y-4">
                    {/* Title */}
                    <div>
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            일정 제목
                        </label>
                        <Input
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="회의명 또는 일정 제목"
                            className="mt-1"
                            autoFocus
                        />
                    </div>

                    {/* Date */}
                    <div>
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            날짜
                        </label>
                        <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    className="w-full justify-start text-left font-normal mt-1"
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {date ? format(date, 'PPP', { locale: ko }) : '날짜 선택'}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                    mode="single"
                                    selected={date}
                                    onSelect={(d) => {
                                        setDate(d);
                                        setIsCalendarOpen(false);
                                    }}
                                    initialFocus
                                />
                            </PopoverContent>
                        </Popover>
                    </div>

                    {/* Time (Start - End) */}
                    <div>
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            시간
                        </label>
                        <div className="flex items-center gap-2 mt-1">
                            <select
                                value={startTime}
                                onChange={(e) => setStartTime(e.target.value)}
                                className="flex-1 h-10 px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">시작 시간</option>
                                <optgroup label="업무 시간">
                                    {workHours.map(t => (
                                        <option key={`start-${t}`} value={t}>{t}</option>
                                    ))}
                                </optgroup>
                                <optgroup label="기타 시간">
                                    {otherHours.map(t => (
                                        <option key={`start-${t}`} value={t}>{t}</option>
                                    ))}
                                </optgroup>
                            </select>
                            <span className="text-gray-500">~</span>
                            <select
                                value={endTime}
                                onChange={(e) => setEndTime(e.target.value)}
                                className="flex-1 h-10 px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">끝 시간</option>
                                <optgroup label="업무 시간">
                                    {workHours.map(t => (
                                        <option key={`end-${t}`} value={t}>{t}</option>
                                    ))}
                                </optgroup>
                                <optgroup label="기타 시간">
                                    {otherHours.map(t => (
                                        <option key={`end-${t}`} value={t}>{t}</option>
                                    ))}
                                </optgroup>
                            </select>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                            시작 시간 선택 시 끝 시간이 자동으로 +1시간 설정됩니다
                        </p>
                    </div>

                    {/* Highlight Level (주관) */}
                    <div>
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1">
                            <User className="w-4 h-4" />
                            주관
                        </label>
                        <select
                            value={highlightLevel}
                            onChange={(e) => setHighlightLevel(e.target.value)}
                            className="mt-1 w-full h-10 px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="0">⚪ 없음</option>
                            <option value="1">🔴 대표</option>
                            <option value="2">🟢 사업부</option>
                            <option value="3">🟣 센터</option>
                        </select>
                    </div>

                    {/* Resource URLs */}
                    <div>
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1">
                            <Link className="w-4 h-4" />
                            자료 (선택)
                        </label>
                        <div className="mt-1 space-y-2">
                            {resourceUrls.map((url, index) => (
                                <div key={index} className="flex items-center gap-2">
                                    <Input
                                        value={url}
                                        onChange={(e) => {
                                            const newUrls = [...resourceUrls];
                                            newUrls[index] = e.target.value;
                                            setResourceUrls(newUrls);
                                        }}
                                        placeholder="https://example.com/... (관련 자료 URL)"
                                        className="flex-1"
                                    />
                                    {url && (
                                        <button
                                            type="button"
                                            onClick={() => window.open(url, '_blank')}
                                            className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
                                            title="링크 열기"
                                        >
                                            <Link className="w-4 h-4 text-blue-500" />
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const newUrls = resourceUrls.filter((_, i) => i !== index);
                                            setResourceUrls(newUrls.length > 0 ? newUrls : ['']);
                                        }}
                                        className="p-2 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                                        title="삭제"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                            <button
                                type="button"
                                onClick={() => setResourceUrls([...resourceUrls, ''])}
                                className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-2 py-1 rounded"
                            >
                                <Plus className="w-3 h-3" /> 추가
                            </button>
                        </div>
                    </div>
                </div>

                <DialogFooter className="mt-4 flex justify-between sm:justify-between">
                    {existingTask ? (
                        <Button
                            variant="destructive"
                            onClick={() => {
                                if (window.confirm('일정을 삭제하시겠습니까?')) {
                                    deleteTask(existingTask.id);
                                    onScheduleAdded();
                                    onClose();
                                }
                            }}
                            className="mr-auto"
                        >
                            삭제
                        </Button>
                    ) : <div></div>}
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={onClose}>
                            취소
                        </Button>
                        <Button
                            onClick={handleSave}
                            disabled={!title.trim() || !date || !startTime}
                        >
                            {existingTask ? '수정' : '추가'}
                        </Button>
                    </div>
                </DialogFooter>

                <p className="text-xs text-gray-400 text-center">
                    Ctrl + Enter로 빠르게 저장
                </p>
            </DialogContent>
        </Dialog >
    );
}
