"use client";

import React, { useState, useEffect } from 'react';
import { Task, QuickLink, Note, Category } from '@/lib/types';
import { useData } from '@/providers/data-provider';
import { Star, Calendar, FileText, ExternalLink, Paperclip } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

interface FavoritesViewProps {
    categories: Category[];
    onTaskClick?: (task: Task) => void;
    onNoteClick?: (noteId: string) => void;
    onScheduleClick?: (task: Task) => void;
    onDataChange?: () => void;
}

export function FavoritesView({ categories, onTaskClick, onNoteClick, onScheduleClick, onDataChange }: FavoritesViewProps) {
    const { tasks, quickLinks, notes, updateTask, updateQuickLink, updateNote } = useData();
    const [favoriteTasks, setFavoriteTasks] = useState<Task[]>([]);
    const [favoriteLinks, setFavoriteLinks] = useState<QuickLink[]>([]);
    const [favoriteNotes, setFavoriteNotes] = useState<Note[]>([]);
    const [showCopyToast, setShowCopyToast] = useState(false);

    // Date Filter State (Default: Today +/- 2 weeks)
    const [startDate, setStartDate] = useState<string>(() => {
        const d = new Date();
        d.setDate(d.getDate() - 14);
        return format(d, 'yyyy-MM-dd');
    });
    const [endDate, setEndDate] = useState<string>(() => {
        const d = new Date();
        d.setDate(d.getDate() + 14);
        return format(d, 'yyyy-MM-dd');
    });


    useEffect(() => {
        setFavoriteTasks(tasks.filter(t => t.isFavorite));
        setFavoriteLinks(quickLinks.filter(l => l.isFavorite));
        setFavoriteNotes(notes.filter(n => n.isFavorite));
    }, [tasks, quickLinks, notes]);

    const handleCopyUrl = (url: string) => {
        navigator.clipboard.writeText(url);
        setShowCopyToast(true);
        setTimeout(() => setShowCopyToast(false), 2000);
    };

    const handleToggleFavorite = async (type: 'task' | 'link' | 'note', id: string) => {
        if (type === 'task') {
            await updateTask(id, { isFavorite: false });
        } else if (type === 'link') {
            await updateQuickLink(id, { isFavorite: false });
        } else if (type === 'note') {
            await updateNote(id, { isFavorite: false });
        }
        onDataChange?.();
    };

    const getCategoryName = (categoryId: string) => {
        const cat = categories.find(c => c.id === categoryId);
        return cat?.name || '미분류';
    };

    const scheduleCategory = categories.find(c => c.name === '팀 일정');

    // Filter tasks by date range
    const filterByDate = (task: Task) => {
        if (!task.dueDate) return false; // Hide tasks without due date when filtering
        return task.dueDate >= startDate && task.dueDate <= endDate;
    };

    const scheduleTasks = favoriteTasks
        .filter(t => t.categoryId === scheduleCategory?.id)
        .filter(filterByDate);

    const regularTasks = favoriteTasks
        .filter(t => t.categoryId !== scheduleCategory?.id)
        .filter(filterByDate);

    const totalCount = scheduleTasks.length + regularTasks.length + favoriteLinks.length + favoriteNotes.length;

    // We don't return early for empty data anymore because the filter might be the reason it's empty
    // But if total favorites (before filter) is 0, we can still show empty state?
    // Let's stick to showing the UI so users can adjust filters if needed, unless absolutely no favorites exist.
    const hasAnyFavorites = favoriteTasks.length + favoriteLinks.length + favoriteNotes.length > 0;

    if (!hasAnyFavorites) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <Star className="w-16 h-16 mb-4 opacity-30" />
                <p className="text-lg">즐겨찾기가 없습니다</p>
                <p className="text-sm mt-2">각 항목에서 ⭐ 버튼을 눌러 추가하세요</p>
            </div>
        );
    }

    return (
        <div className="h-full overflow-y-auto p-6">
            <div className="max-w-4xl mx-auto space-y-8">
                {/* Header & Filters */}
                <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-3">
                        <Star className="w-6 h-6 text-yellow-500 fill-yellow-500" />
                        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-200">즐겨찾기</h1>
                        <span className="text-sm text-gray-500">({totalCount}개 표시)</span>
                    </div>

                    {/* Date Range Picker */}
                    <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800/50 p-2 rounded-lg w-fit">
                        <span className="text-sm font-medium text-gray-600 dark:text-gray-400 px-1">기간:</span>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded px-2 py-1 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                        <span className="text-gray-400">~</span>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded px-2 py-1 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                    </div>
                </div>

                {/* Team Schedule Tasks */}
                {scheduleTasks.length > 0 && (
                    <section>
                        <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3 flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            팀 일정 ({scheduleTasks.length})
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {scheduleTasks.map(task => (
                                <div
                                    key={task.id}
                                    className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow cursor-pointer"
                                    onClick={() => onScheduleClick ? onScheduleClick(task) : onTaskClick?.(task)}
                                >
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            {task.dueDate && (
                                                <span className="text-xs text-gray-500">
                                                    {format(new Date(task.dueDate), 'M/d', { locale: ko })}
                                                </span>
                                            )}
                                            {task.dueTime && (
                                                <span className="text-xs text-gray-400">{task.dueTime.split(' - ')[0]}</span>
                                            )}
                                            <span className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                                                {task.title}
                                            </span>
                                            {task.resourceUrl && (
                                                <Paperclip
                                                    className="w-3 h-3 text-purple-500 cursor-pointer hover:text-purple-700 dark:hover:text-purple-400"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleCopyUrl(task.resourceUrl!);
                                                        if (!e.ctrlKey && !e.metaKey) {
                                                            window.open(task.resourceUrl, '_blank');
                                                        }
                                                    }}
                                                />
                                            )}
                                        </div>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 w-8 p-0 text-yellow-500"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleToggleFavorite('task', task.id);
                                        }}
                                    >
                                        <Star className="w-4 h-4 fill-yellow-500" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* Regular Tasks */}
                {regularTasks.length > 0 && (
                    <section>
                        <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3 flex items-center gap-2">
                            <FileText className="w-4 h-4" />
                            할 일 ({regularTasks.length})
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {regularTasks.map(task => (
                                <div
                                    key={task.id}
                                    className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow cursor-pointer"
                                    onClick={() => onTaskClick?.(task)}
                                >
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                                                {getCategoryName(task.categoryId)}
                                            </span>
                                            <span className={`text-sm font-medium truncate ${task.completed ? 'line-through text-gray-400' : 'text-gray-800 dark:text-gray-200'}`}>
                                                {task.title}
                                            </span>
                                        </div>
                                        {task.dueDate && (
                                            <span className="text-xs text-gray-400 mt-1 block">
                                                {format(new Date(task.dueDate), 'M월 d일', { locale: ko })}
                                            </span>
                                        )}
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 w-8 p-0 text-yellow-500"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleToggleFavorite('task', task.id);
                                        }}
                                    >
                                        <Star className="w-4 h-4 fill-yellow-500" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* Quick Links */}
                {favoriteLinks.length > 0 && (
                    <section>
                        <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3 flex items-center gap-2">
                            <ExternalLink className="w-4 h-4" />
                            자주 쓰는 파일 ({favoriteLinks.length})
                        </h2>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            {favoriteLinks.map(link => (
                                <div
                                    key={link.id}
                                    className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow cursor-pointer"
                                    onClick={() => window.open(link.url, '_blank')}
                                >
                                    <FileText className="w-4 h-4 text-blue-500 flex-shrink-0" />
                                    <span className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate flex-1">
                                        {link.name}
                                    </span>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 w-7 p-0 text-yellow-500"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleToggleFavorite('link', link.id);
                                        }}
                                    >
                                        <Star className="w-3.5 h-3.5 fill-yellow-500" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* Notes */}
                {favoriteNotes.length > 0 && (
                    <section>
                        <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3 flex items-center gap-2">
                            <FileText className="w-4 h-4" />
                            메모 ({favoriteNotes.length})
                        </h2>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                            {favoriteNotes.map(note => (
                                <div
                                    key={note.id}
                                    className="relative p-3 rounded-lg border shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                                    style={{ backgroundColor: note.color }}
                                    onClick={() => onNoteClick?.(note.id)}
                                >
                                    {note.title && (
                                        <h4 className="font-medium text-sm text-gray-800 mb-1 line-clamp-1 pr-6">
                                            {note.title}
                                        </h4>
                                    )}
                                    {note.content && (
                                        <div
                                            className="text-xs text-gray-600 line-clamp-3"
                                            dangerouslySetInnerHTML={{ __html: note.content }}
                                        />
                                    )}
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="absolute top-1 right-1 h-6 w-6 p-0 text-yellow-500"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleToggleFavorite('note', note.id);
                                        }}
                                    >
                                        <Star className="w-3.5 h-3.5 fill-yellow-500" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </section>
                )}
            </div>

            {/* Copy Toast */}
            {showCopyToast && (
                <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-gray-800 text-white px-4 py-2 rounded-lg shadow-lg z-50 animate-in fade-in zoom-in duration-200 pointer-events-none">
                    링크가 복사되었습니다
                </div>
            )}
        </div>
    );
}
