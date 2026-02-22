"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Category, Task } from '@/lib/types';
import { format } from 'date-fns';
import { getTheme, setTheme, Theme, getLayoutState, saveLayoutState, getLayoutPreset, saveLayoutPreset, Layout, LayoutState, generateId } from '@/lib/storage';
import { Sidebar } from '@/components/sidebar';
import { TaskList } from '@/components/task-list';
import { CalendarView } from '@/components/calendar-view';
import { KeepView } from '@/components/keep-view';
import { FavoritesView } from '@/components/favorites-view';
import { TaskDetailDialog } from '@/components/task-detail-dialog';
import { ImportExportDialog } from '@/components/import-export-dialog';
import { ScheduleImportDialog } from '@/components/schedule-import-dialog';
import { TeamScheduleAddModal } from '@/components/team-schedule-add-modal';
import { SearchCommandDialog } from '@/components/search-command-dialog';
import { TeamMemberBoard } from '@/components/team-member-board';
import { TripBoard } from '@/components/trip-board';

import { ParsedSchedule, parseScheduleText } from '@/lib/schedule-parser';
import { Button } from '@/components/ui/button';
import { PanelLeftClose, PanelLeft, Sun, Moon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { DataProvider, useData } from '@/providers/data-provider';

function HomeContent() {
  const {
    isDBLoading,
    categories,
    tasks,
    addCategory,
    updateCategory,
    addTask,
    deleteTask,
    updateTask,
    addNote,
    updateNote,
    refreshData
  } = useData();

  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [dialogType, setDialogType] = useState<'export' | 'import' | null>(null);
  const [isScheduleImportOpen, setIsScheduleImportOpen] = useState(false);
  const [isSidebarVisible, setIsSidebarVisible] = useState(true);
  const [detailTask, setDetailTask] = useState<Task | null>(null);
  const [taskListWidth, setTaskListWidth] = useState(400);
  const [isResizing, setIsResizing] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [theme, setThemeState] = useState<Theme>('light');
  const [layout, setLayoutState] = useState<Layout>(1);
  const [showWeekends, setShowWeekends] = useState(true);
  const [viewMode, setViewMode] = useState<'calendar' | 'keep' | 'favorites' | 'team' | 'trip'>('calendar');
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [notesVersion, setNotesVersion] = useState(0);
  const [isTeamScheduleModalOpen, setIsTeamScheduleModalOpen] = useState(false);
  const [editingScheduleTask, setEditingScheduleTask] = useState<Task | null>(null);
  const [collectionGroups, setCollectionGroups] = useState<string[]>(['CP', 'OLB', 'LASER', '라미1', '라미2']);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const viewModeRef = useRef(viewMode);

  // Ensure default categories are selected once loaded
  useEffect(() => {
    if (!isDBLoading && categories.length > 0 && selectedCategoryIds.length === 0) {
      const defaultIds = [categories[0].id];
      const teamSchedule = categories.find(c => c.name === '팀 일정');
      if (teamSchedule && teamSchedule.id !== categories[0].id) {
        defaultIds.push(teamSchedule.id);
      }
      setSelectedCategoryIds(defaultIds);
    }
  }, [isDBLoading, categories, selectedCategoryIds.length]);

  // Load collectionGroups from calendar settings in localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('calendar-settings');
      if (saved) {
        const settings = JSON.parse(saved);
        if (settings.collectionGroups && Array.isArray(settings.collectionGroups)) {
          setCollectionGroups(settings.collectionGroups);
        }
      }
    } catch (e) {
      console.error('Failed to load collectionGroups:', e);
    }
  }, []);

  // Keyboard shortcuts: Ctrl+` (sidebar toggle), Ctrl+1/2/3 (layout switch), Ctrl+6~0 (presets), Ctrl+Arrow (view toggle)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl + ` : Toggle sidebar
      if ((e.ctrlKey || e.metaKey) && e.key === '`') {
        e.preventDefault();
        setIsSidebarVisible(prev => {
          const newValue = !prev;
          saveLayoutState({ isSidebarVisible: newValue });
          return newValue;
        });
      }
      // Ctrl + 1/2/3 : Switch layout
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && ['1', '2', '3'].includes(e.key)) {
        e.preventDefault();
        const newLayout = parseInt(e.key) as Layout;
        setLayoutState(newLayout);
        saveLayoutState({ layout: newLayout });
      }
      // Ctrl + Left/Right Arrow : Cycle through Calendar -> Keep -> Favorites
      if ((e.ctrlKey || e.metaKey) && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
        e.preventDefault();
        setViewMode(prev => {
          const views: ('calendar' | 'keep' | 'favorites' | 'team' | 'trip')[] = ['calendar', 'favorites', 'keep', 'team', 'trip'];
          const currentIdx = views.indexOf(prev);
          if (e.key === 'ArrowRight') {
            return views[(currentIdx + 1) % views.length];
          } else {
            return views[(currentIdx - 1 + views.length) % views.length];
          }
        });
      }

      // Layout Presets: Ctrl+6~0 (load), Ctrl+Shift+6~0 (save)
      // Use event.code instead of event.key because Shift changes the key value
      const presetCodes = ['Digit6', 'Digit7', 'Digit8', 'Digit9', 'Digit0'];
      if ((e.ctrlKey || e.metaKey) && presetCodes.includes(e.code)) {
        e.preventDefault();
        const presetIndex = presetCodes.indexOf(e.code);

        if (e.shiftKey) {
          // Save current state to preset
          const currentState: LayoutState = {
            layout,
            taskListWidth,
            isSidebarVisible,
            showWeekends,
          };
          saveLayoutPreset(presetIndex, currentState);
          // Show brief notification (optional)
          console.log(`프리셋 ${presetIndex + 1} 저장됨`);
        } else {
          // Load preset
          const preset = getLayoutPreset(presetIndex);
          if (preset) {
            setLayoutState(preset.layout);
            setTaskListWidth(preset.taskListWidth);
            setIsSidebarVisible(preset.isSidebarVisible);
            setShowWeekends(preset.showWeekends);
            saveLayoutState(preset); // Also update auto-save state
            console.log(`프리셋 ${presetIndex + 1} 불러옴`);
          } else {
            console.log(`프리셋 ${presetIndex + 1} 없음`);
          }
        }
      }
      // Search: Ctrl + K
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(prev => !prev);
      }

      // Clipboard Import: Ctrl + Shift + V - Import team schedule directly from clipboard
      // (only when NOT in team/trip view - they have their own handlers)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'V' && viewModeRef.current !== 'team' && viewModeRef.current !== 'trip') {
        e.preventDefault();
        // Read from clipboard and import
        navigator.clipboard.readText().then(clipboardText => {
          if (!clipboardText.trim()) {
            alert('클립보드가 비어있습니다.');
            return;
          }
          const result = parseScheduleText(clipboardText, currentMonth.getFullYear(), currentMonth.getMonth());
          if (result.length === 0) {
            alert('감지된 일정이 없습니다. 텍스트 형식을 확인해주세요.');
            return;
          }
          handleScheduleImport(result);
        }).catch(err => {
          console.error('클립보드 읽기 실패:', err);
          alert('클립보드를 읽을 수 없습니다. 브라우저 권한을 확인해주세요.');
        });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [layout, taskListWidth, isSidebarVisible, showWeekends]);

  // Keep viewModeRef in sync
  useEffect(() => {
    viewModeRef.current = viewMode;
  }, [viewMode]);

  // Load layout state from localStorage on mount
  useEffect(() => {
    const savedState = getLayoutState();
    setLayoutState(savedState.layout);
    setTaskListWidth(savedState.taskListWidth);
    setIsSidebarVisible(savedState.isSidebarVisible);
    setShowWeekends(savedState.showWeekends);
  }, []);

  // Theme initialization and application
  useEffect(() => {
    const savedTheme = getTheme();
    setThemeState(savedTheme);
    document.documentElement.classList.toggle('dark', savedTheme === 'dark');
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setThemeState(newTheme);
    setTheme(newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
  };

  // Handle resize - layout-aware
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing || !containerRef.current) return;

      const containerRect = containerRef.current.getBoundingClientRect();
      const sidebarWidth = isSidebarVisible ? 300 : 0;

      let newWidth: number;

      // Calculate based on layout
      if (layout === 3) {
        // Layout 3: Calendar | ResizeHandle | TaskList | Sidebar
        // TaskList width = distance from mouse to left edge of Sidebar
        newWidth = containerRect.right - sidebarWidth - e.clientX;
      } else if (layout === 2) {
        // Layout 2: Sidebar | Calendar | TaskList
        // TaskList is on right, width = container right - mouse position
        newWidth = containerRect.right - e.clientX;
      } else {
        // Layout 1: Sidebar | TaskList | Calendar
        // TaskList is after sidebar
        newWidth = e.clientX - containerRect.left - sidebarWidth;
      }

      // Clamp between 250 and 600
      const clampedWidth = Math.max(250, Math.min(600, newWidth));
      setTaskListWidth(clampedWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      // Save taskListWidth when resize ends
      saveLayoutState({ taskListWidth });
    };

    if (isResizing) {
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, isSidebarVisible, layout, taskListWidth]);

  const handleCategoriesChange = () => {
    refreshData();
  };

  const handleTasksChange = () => {
    refreshData();
    setNotesVersion(prev => prev + 1);
  };

  const handleTaskUpdate = async (taskId: string, updates: Partial<Task>) => {
    await updateTask(taskId, updates);
  };

  const handleDataChange = () => {
    // Force reload to apply all imported settings (Theme, Layout, Notes, etc.)
    window.location.reload();
  };

  const handleDateClick = (date: Date) => {
    // Priority: 
    // 1. Currently selected category (if it's NOT 'Team Schedule')
    // 2. First category that is NOT 'Team Schedule'

    let targetCategoryId = selectedCategoryIds[0];
    const scheduleCategory = categories.find(c => c.name === '팀 일정');

    // If current selection is Team Schedule (or empty), try to find a better one
    if (scheduleCategory && targetCategoryId === scheduleCategory.id) {
      const defaultCategory = categories.find(c => c.name !== '팀 일정');
      if (defaultCategory) {
        targetCategoryId = defaultCategory.id;
      }
    }

    if (targetCategoryId) {
      // Ensure the target category is visible
      if (!selectedCategoryIds.includes(targetCategoryId)) {
        setSelectedCategoryIds(prev => [...prev, targetCategoryId]);
      }

      // Ensure the target category is visible
      if (!selectedCategoryIds.includes(targetCategoryId)) {
        setSelectedCategoryIds(prev => [...prev, targetCategoryId]);
      }

      // Create a temporary task object (not saved to storage yet)
      const tempTask: Task = {
        id: generateId(), // Temporary ID
        categoryId: targetCategoryId,
        title: '',
        assignee: '',
        resourceUrl: '',
        notes: '',
        dueDate: date.toISOString(),
        dueTime: null,
        tags: [],
        completed: false,
        completedAt: null,
        isPinned: false,
        order: -1,
        createdAt: new Date().toISOString()
      };

      setDetailTask(tempTask);
    }
  };

  const handleTaskDrop = async (taskId: string, newDate: Date) => {
    // Find the task to get its categoryId
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    await updateTask(taskId, { dueDate: newDate.toISOString() });

    // Refresh to re-sort visually if needed
    refreshData();
  };

  const handleTaskCopy = async (taskId: string, newDate: Date) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    // Create a new task via useData
    const newTask = await addTask(task.categoryId, task.title, newDate.toISOString());

    // Update other properties to match the original task
    await updateTask(newTask.id, {
      assignee: task.assignee,
      resourceUrl: task.resourceUrl,
      notes: task.notes,
      dueTime: task.dueTime,
      tags: task.tags,
      // We explicitly default to not completed for a new copy
      completed: false,
      completedAt: null
    });

    refreshData();
  };

  // Handle category selection with Ctrl support
  const handleSelectCategory = (categoryId: string, ctrlKey: boolean) => {
    if (ctrlKey) {
      // Toggle in multi-select
      setSelectedCategoryIds(prev =>
        prev.includes(categoryId)
          ? prev.filter(id => id !== categoryId)
          : [...prev, categoryId]
      );
    } else {
      // Single select
      setSelectedCategoryIds([categoryId]);
    }
  };

  const handleScheduleImport = useCallback(async (schedules: ParsedSchedule[]) => {
    // 1. Find or create "Team Schedule" category
    let scheduleCategory = categories.find(c => c.name === '팀 일정');
    if (!scheduleCategory) {
      scheduleCategory = await addCategory('팀 일정');
    }

    // 2. Clear existing tasks in the Team Schedule category (Smart Overwrite Strategy)
    const targetMonths = new Set<string>();
    schedules.forEach(s => {
      const yearMonth = `${s.date.getFullYear()}-${s.date.getMonth()}`;
      targetMonths.add(yearMonth);
    });

    const backupMap = new Map<string, Partial<Task>>();

    const existingTasks = tasks.filter(t => t.categoryId === scheduleCategory!.id);
    for (const t of existingTasks) {
      if (t.source === 'manual') continue;

      if (t.dueDate) {
        const taskDate = new Date(t.dueDate);
        const taskYearMonth = `${taskDate.getFullYear()}-${taskDate.getMonth()}`;

        if (targetMonths.has(taskYearMonth)) {
          const dateStr = format(taskDate, 'yyyy-MM-dd');
          const key = `${dateStr}|${t.title.trim()}`;

          backupMap.set(key, {
            resourceUrl: t.resourceUrl,
            notes: t.notes,
            tags: t.tags,
            isPinned: t.isPinned,
            completed: t.completed
          });

          await deleteTask(t.id);
        }
      }
    }

    // 3. Add new tasks
    for (const schedule of schedules) {
      if (!scheduleCategory) continue;

      const dateStr = format(schedule.date, 'yyyy-MM-dd');
      const key = `${dateStr}|${schedule.title.trim()}`;
      const backup = backupMap.get(key);

      const newTask = await addTask(
        scheduleCategory.id,
        schedule.title,
        schedule.date.toISOString(),
        {
          dueTime: schedule.time,
          highlightLevel: schedule.highlightLevel,
          organizer: schedule.organizer,
          source: 'team'
        }
      );

      if (backup) {
        await updateTask(newTask.id, {
          resourceUrl: backup.resourceUrl,
          notes: backup.notes,
          tags: backup.tags,
          isPinned: backup.isPinned,
          completed: backup.completed
        });
        backupMap.delete(key);
      }
    }

    // 4. Handle Orphaned Data
    let orphanedCount = 0;
    if (backupMap.size > 0) {
      for (const [key, data] of backupMap.entries()) {
        if (data.resourceUrl || data.notes || (data.tags && data.tags.length > 0)) {
          const [dateStr, title] = key.split('|');
          let noteContent = '';
          if (data.resourceUrl) noteContent += `🔗 자료: ${data.resourceUrl}\n`;
          if (data.tags && data.tags.length > 0) noteContent += `🏷️ 태그: ${data.tags.join(', ')}\n`;
          if (data.notes) noteContent += `📝 메모:\n${data.notes}`;

          const noteTitle = `[자동백업] ${dateStr} ${title}`;
          const newNote = await addNote(noteTitle, noteContent, 'yellow');
          await updateNote(newNote.id, { isPinned: true });

          orphanedCount++;
        }
      }
    }

    // 5. Reload
    await refreshData();
    setNotesVersion(prev => prev + 1);

    // 6. Select category
    if (scheduleCategory && !selectedCategoryIds.includes(scheduleCategory.id)) {
      setSelectedCategoryIds(prev => [...prev, scheduleCategory!.id]);
    }

    // 7. Notification
    setTimeout(() => {
      if (orphanedCount > 0) {
        window.alert(`총 ${schedules.length}개의 일정이 업데이트되었습니다.\n\n⚠️ ${orphanedCount}개의 변경된 일정 데이터가 사이드바 [고정 메모]에 안전하게 백업되었습니다.\n\n사이드바에서 메모를 캘린더 일정 위로 드래그하여 병합할 수 있습니다.`);
      } else {
        window.alert(`총 ${schedules.length}개의 일정이 성공적으로 업데이트되었습니다.`);
      }
    }, 100);
  }, [categories, tasks, selectedCategoryIds, addCategory, addNote, updateNote, addTask, updateTask, deleteTask, refreshData]);

  // Listen for 'SCHEDULE_SYNC' messages from Chrome Extension
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Expect event.data to have { type: 'SCHEDULE_SYNC', text: string, year?: number, month?: number }
      if (event.data?.type === 'SCHEDULE_SYNC' && event.data?.text) {
        try {
          // Use provided year/month or fallback to current state
          const year = event.data.year || currentMonth.getFullYear();
          const month = event.data.month !== undefined ? event.data.month : currentMonth.getMonth();

          console.log(`Auto-syncing schedule for ${year}-${month + 1}`);

          const result = parseScheduleText(event.data.text, year, month);

          if (result.length > 0) {
            handleScheduleImport(result);
            // Show a simple browser notification or alert (optional, keeping it silent or subtle is better for automation)
            console.log('Schedule synced successfully via extension');
          } else {
            console.warn('Sync received but no schedules parsed');
          }
        } catch (e) {
          console.error('Auto sync failed:', e);
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [currentMonth, handleScheduleImport]);

  const selectedCategory = categories.find(c => selectedCategoryIds.includes(c.id)) || null;

  if (isDBLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-gray-500">로딩 중...</div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className={`flex h-screen relative transition-colors duration-300 ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {/* Theme Toggle Button Removed as per request */}

      {/* Sidebar Toggle Button - position based on layout */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsSidebarVisible(!isSidebarVisible)}
        className={`absolute top-4 z-50 bg-white shadow-md hover:shadow-lg transition-all duration-200 ${layout === 3
          ? (isSidebarVisible ? 'right-[252px]' : 'right-4')
          : (isSidebarVisible ? 'left-[252px]' : 'left-4')
          }`}
        title={isSidebarVisible ? "사이드바 숨기기 (Ctrl+`)" : "사이드바 보이기 (Ctrl+`)"}
      >
        {isSidebarVisible ? (
          <PanelLeftClose className="w-5 h-5" />
        ) : (
          <PanelLeft className="w-5 h-5" />
        )}
      </Button>

      {/* Define reusable panel elements */}
      {(() => {
        const sidebarPanel = (
          <AnimatePresence key="sidebar">
            {isSidebarVisible && (
              <motion.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 300, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ duration: 0.2, ease: "easeInOut" }}
                className="overflow-hidden flex-shrink-0"
              >
                <Sidebar
                  categories={categories}
                  selectedCategoryIds={selectedCategoryIds}
                  tasks={tasks}
                  currentMonth={currentMonth}
                  selectedDate={selectedDate}
                  onSelectCategory={handleSelectCategory}
                  onCategoriesChange={handleCategoriesChange}
                  onExportClick={() => setDialogType('export')}
                  onImportClick={() => setDialogType('import')}
                  onMonthChange={setCurrentMonth}
                  onDateSelect={(date) => {
                    setSelectedDate(date);
                    setCurrentMonth(date);
                  }}
                  onImportSchedule={() => setIsScheduleImportOpen(true)}
                  onTeamViewClick={() => setViewMode('team')}
                  onTripViewClick={() => setViewMode('trip')}
                  onPinnedMemoClick={(noteId) => {
                    setViewMode('keep');
                    if (noteId) {
                      setSelectedNoteId(noteId);
                    }
                  }}
                  notesVersion={notesVersion}
                />

              </motion.div>
            )}
          </AnimatePresence>
        );

        const taskListPanel = (
          <div
            key="tasklist"
            className="flex-shrink-0 bg-white overflow-hidden"
            style={{
              width: taskListWidth,
              transition: isResizing ? 'none' : 'width 0.15s ease-out'
            }}
          >
            <TaskList
              category={selectedCategory}
              categories={categories}
              tasks={tasks.filter(t => {
                const category = categories.find(c => c.id === t.categoryId);
                return category?.name !== '팀 일정';
              })}
              onTasksChange={handleTasksChange}
              collectionGroups={collectionGroups}
            />
          </div>
        );

        const resizeHandle = (
          <div
            key="resize-handle"
            className={`w-2 flex-shrink-0 cursor-col-resize group ${isResizing ? 'bg-blue-500' : 'bg-gray-100 hover:bg-blue-400'}`}
            onMouseDown={(e) => {
              e.preventDefault();
              setIsResizing(true);
            }}
          >
            <div className={`w-full h-full flex items-center justify-center ${isResizing ? '' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}>
              <div className="w-0.5 h-8 bg-gray-400 rounded-full" />
            </div>
          </div>
        );

        const mainPanel = (
          <div key="main-view" className="flex-1 overflow-hidden">
            {viewMode === 'calendar' ? (
              <CalendarView
                tasks={tasks}
                categories={categories}
                currentMonth={currentMonth}
                selectedDate={selectedDate}
                showWeekends={showWeekends}
                onShowWeekendsChange={(show) => {
                  setShowWeekends(show);
                  saveLayoutState({ showWeekends: show });
                }}
                onTaskClick={(task) => setDetailTask(task)}
                onDateClick={handleDateClick}
                onMonthChange={setCurrentMonth}
                onTaskDrop={handleTaskDrop}
                onTaskCopy={handleTaskCopy}
                onTaskDelete={handleTasksChange}
                onDataChange={handleTasksChange}
              />
            ) : viewMode === 'keep' ? (
              <KeepView
                selectedNoteId={selectedNoteId}
                onNoteSelected={() => setSelectedNoteId(null)}
                onNotesChange={() => setNotesVersion(v => v + 1)}
              />
            ) : viewMode === 'favorites' ? (
              <FavoritesView
                categories={categories}
                onTaskClick={(task) => setDetailTask(task)}
                onNoteClick={(noteId) => {
                  setViewMode('keep');
                  setSelectedNoteId(noteId);
                }}
                onDataChange={handleTasksChange}
                onScheduleClick={(task) => {
                  setEditingScheduleTask(task);
                  setIsTeamScheduleModalOpen(true);
                }}
              />
            ) : viewMode === 'team' ? (
              <TeamMemberBoard
                onDataChange={handleTasksChange}
              />
            ) : viewMode === 'trip' ? (
              <TripBoard
                onDataChange={handleTasksChange}
              />
            ) : null}
          </div>
        );

        // Render based on layout
        // For 'team' or 'trip' views, we hide the task list to give full width to the board
        if (viewMode === 'team' || viewMode === 'trip') {
          // Respect Layout 3 (Sidebar on Right)
          if (layout === 3) {
            return <>{mainPanel}{sidebarPanel}</>;
          }
          return <>{sidebarPanel}{mainPanel}</>;
        }

        // Standard Layouts
        // Layout 1: Sidebar | TaskList | ResizeHandle | Calendar (Default)
        // Layout 2: Sidebar | Calendar | ResizeHandle | TaskList
        // Layout 3: Calendar | ResizeHandle | TaskList | Sidebar
        if (layout === 2) {
          return <>{sidebarPanel}{mainPanel}{resizeHandle}{taskListPanel}</>;
        } else if (layout === 3) {
          return <>{mainPanel}{resizeHandle}{taskListPanel}{sidebarPanel}</>;
        } else {
          // Layout 1 (default)
          return <>{sidebarPanel}{taskListPanel}{resizeHandle}{mainPanel}</>;
        }
      })()}

      {/* Task Detail Dialog */}
      <TaskDetailDialog
        task={detailTask}
        isOpen={!!detailTask}
        onClose={() => setDetailTask(null)}
        onTaskChange={handleTasksChange}
        isNewTask={detailTask ? !tasks.find(t => t.id === detailTask.id) : false}
        collectionGroups={collectionGroups}
      />

      <ImportExportDialog
        type={dialogType}
        onClose={() => setDialogType(null)}
        onDataChange={handleDataChange}
      />

      <ScheduleImportDialog
        isOpen={isScheduleImportOpen}
        onClose={() => setIsScheduleImportOpen(false)}
        onImport={handleScheduleImport}
        currentYear={currentMonth.getFullYear()}
        currentMonth={currentMonth.getMonth()} // 0-indexed
      />

      <TeamScheduleAddModal
        isOpen={isTeamScheduleModalOpen}
        onClose={() => {
          setIsTeamScheduleModalOpen(false);
          setEditingScheduleTask(null);
        }}
        onScheduleAdded={handleTasksChange}
        initialDate={new Date()} // Not used for edit
        teamScheduleCategoryId={categories.find(c => c.name === '팀 일정')?.id || ''}
        existingTask={editingScheduleTask}
      />
      <SearchCommandDialog
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelectTask={(task) => {
          setDetailTask(task);
        }}
        onSelectNote={(noteId) => {
          setViewMode('keep');
          // Wait for view switch then select?
          // We might need a way to pass 'initialSelectedNoteId' or similar.
          // For now, let's just switch view.
          // Actually, sidebar has onPinnedMemoClick which does setSelectedNoteId if we expose it?
          // Page doesn't have direct access to keepView state unless lifted.
          // But we have setSelectedNoteId in page!
          setSelectedNoteId(noteId);
        }}
      />
    </div>
  );
}

export default function Home() {
  return (
    <DataProvider>
      <HomeContent />
    </DataProvider>
  );
}
