import { Category, Task, AppData, CATEGORY_COLORS } from './types';
import { idbDelete, idbGetAll, idbSet, idbGet } from './indexeddb-storage';

const STORAGE_KEY = 'local-tasks-data';
const IDB_MIGRATION_KEY = 'local-tasks-idb-migrated-v1';

const IDB_SYNC_KEYS = [
    // Core data
    'local-tasks-data',
    'local-tasks-quick-links',
    'local-tasks-notes',
    'local-tasks-labels',
    'local-tasks-theme',
    'local-tasks-layout',
    'local-tasks-layout-state',
    'local-tasks-layout-presets',
    'local-tasks-team-members',
    'local-tasks-business-trips',
    'local-tasks-trip-records',
    'tripNameResolutions',
    'tripDestinationMappings',
    // UI/state keys
    'calendar-settings',
    'calendar-collapsed-weeks',
    'search-history',
    'sidebar_calendar_expanded',
    'sidebar_quicklinks_expanded',
    'sidebar_pinnedmemos_expanded',
    'team-member-custom-columns',
    'team-member-visible-columns',
    'tripViewMode',
    'tripCategoryColors',
    'ganttViewPrefs',
    'tripRecordColumns',
    'tripRecordHeaders',
    'local-tasks-current-view',
    'local-tasks-current-month',
    'local-tasks-selected-date',
    'local-tasks-selected-category-ids',
    IDB_MIGRATION_KEY,
] as const;

function shouldSyncKey(key: string): boolean {
    return (IDB_SYNC_KEYS as readonly string[]).includes(key);
}

function getStorageItem(key: string): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(key);
}

function setStorageItem(key: string, value: string): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(key, value);
    if (shouldSyncKey(key)) {
        void idbSet(key, value).catch(() => undefined);
    }
}

function removeStorageItem(key: string): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(key);
    if (shouldSyncKey(key)) {
        void idbDelete(key).catch(() => undefined);
    }
}

export async function initializeIndexedDBStorage(): Promise<void> {
    if (typeof window === 'undefined') return;
    try {
        // One-time migration from current localStorage data to IndexedDB.
        if (getStorageItem(IDB_MIGRATION_KEY) !== '2') {
            console.log("MIGRATING TO INDEXEDDB (V2)");
            // 1. Move all tracked heavy keys to IDB
            for (const key of IDB_SYNC_KEYS) {
                const valueStr = getStorageItem(key);
                if (valueStr !== null) {
                    try {
                        // Assuming the string is JSON, parse it to store natively
                        await idbSet(key, JSON.parse(valueStr));
                    } catch {
                        // If it's not JSON (like a simple string 'light'), store as string
                        await idbSet(key, valueStr);
                    }
                }
            }

            // 2. Mark migration complete
            setStorageItem(IDB_MIGRATION_KEY, '2');
            await idbSet(IDB_MIGRATION_KEY, '2');

            // 3. Clean up heavy items from localStorage to prevent 5MB crash
            const heavyKeys = [
                'local-tasks-data', 'local-tasks-quick-links', 'local-tasks-notes',
                'local-tasks-labels', 'local-tasks-team-members', 'local-tasks-business-trips',
                'local-tasks-trip-records', 'tripNameResolutions'
            ];
            heavyKeys.forEach(k => localStorage.removeItem(k));
            console.log("MIGRATION COMPLETE. CLEANED LOCALSTORAGE.");
        }
    } catch (e) {
        console.error('IndexedDB migration failed:', e);
    }
}

// Generate unique ID
export function generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Get all data from IndexedDB
export async function getAppData(): Promise<AppData> {
    if (typeof window === 'undefined') {
        return { categories: [], tasks: [] };
    }

    const data = await idbGet<AppData>(STORAGE_KEY);
    if (!data) {
        // Initialize with default category
        const defaultData: AppData = {
            categories: [
                {
                    id: generateId(),
                    name: '내할일',
                    color: CATEGORY_COLORS[0].value,
                    order: 0,
                    createdAt: new Date().toISOString(),
                },
            ],
            tasks: [],
        };
        await saveAppData(defaultData);
        return defaultData;
    }

    return data;
}

// Save all data natively to IndexedDB
export async function saveAppData(data: AppData): Promise<void> {
    if (typeof window === 'undefined') return;
    await idbSet(STORAGE_KEY, data);
}

// Category CRUD
export async function getCategories(): Promise<Category[]> {
    const data = await getAppData();
    return data.categories.sort((a, b) => a.order - b.order);
}

export async function addCategory(name: string): Promise<Category> {
    const data = await getAppData();
    const maxOrder = Math.max(...data.categories.map(c => c.order), -1);
    const colorIndex = data.categories.length % CATEGORY_COLORS.length;
    const newCategory: Category = {
        id: generateId(),
        name,
        color: CATEGORY_COLORS[colorIndex].value,
        order: maxOrder + 1,
        createdAt: new Date().toISOString(),
    };
    data.categories.push(newCategory);
    await saveAppData(data);
    return newCategory;
}

export async function updateCategory(id: string, updates: Partial<Category>): Promise<Category | null> {
    const data = await getAppData();
    const index = data.categories.findIndex(c => c.id === id);
    if (index === -1) return null;

    data.categories[index] = { ...data.categories[index], ...updates };
    await saveAppData(data);
    return data.categories[index];
}

export async function deleteCategory(id: string): Promise<boolean> {
    const data = await getAppData();
    const index = data.categories.findIndex(c => c.id === id);
    if (index === -1) return false;

    // Delete all tasks in this category
    data.tasks = data.tasks.filter(t => t.categoryId !== id);
    data.categories.splice(index, 1);
    await saveAppData(data);
    return true;
}

// Task CRUD
export async function getTasks(categoryId?: string): Promise<Task[]> {
    const data = await getAppData();
    let tasks = data.tasks;
    if (categoryId) {
        tasks = tasks.filter(t => t.categoryId === categoryId);
    }
    return tasks.sort((a, b) => a.order - b.order);
}

// Get all unique tags from all tasks
export async function getAllTags(): Promise<string[]> {
    const data = await getAppData();
    const tagSet = new Set<string>();
    data.tasks.forEach(task => {
        if (task.tags) {
            task.tags.forEach(tag => tagSet.add(tag));
        }
    });
    return Array.from(tagSet).sort();
}

export async function addTask(categoryId: string, title: string, dueDate?: string | null, options: Partial<Task> = {}): Promise<Task> {
    const data = await getAppData();
    const categoryTasks = data.tasks.filter(t => t.categoryId === categoryId);
    const maxOrder = Math.max(...categoryTasks.map(t => t.order), -1);

    const newTask: Task = {
        id: generateId(),
        categoryId,
        title,
        assignee: '',
        resourceUrl: '',
        notes: '',
        dueDate: dueDate || null,
        dueTime: null,
        tags: [],
        completed: false,
        completedAt: null,
        isPinned: false,
        order: maxOrder + 1,
        createdAt: new Date().toISOString(),
        ...options // Spread additional options like dueTime
    };

    data.tasks.push(newTask);

    // Auto-sort by due date after adding
    await _asyncSortTasksByDate(data, categoryId);
    await saveAppData(data);

    return newTask;
}

export async function updateTask(id: string, updates: Partial<Task>): Promise<Task | null> {
    const data = await getAppData();
    const index = data.tasks.findIndex(t => t.id === id);
    if (index === -1) return null;

    data.tasks[index] = { ...data.tasks[index], ...updates };
    await saveAppData(data);
    return data.tasks[index];
}

export async function deleteTask(id: string): Promise<boolean> {
    const data = await getAppData();
    const index = data.tasks.findIndex(t => t.id === id);
    if (index === -1) return false;

    data.tasks.splice(index, 1);
    await saveAppData(data);
    return true;
}

export async function restoreTask(task: Task): Promise<void> {
    const data = await getAppData();
    data.tasks.push(task);
    await saveAppData(data);
}

export async function toggleTaskComplete(id: string): Promise<Task | null> {
    const data = await getAppData();
    const index = data.tasks.findIndex(t => t.id === id);
    if (index === -1) return null;

    const newCompleted = !data.tasks[index].completed;
    data.tasks[index].completed = newCompleted;
    data.tasks[index].completedAt = newCompleted ? new Date().toISOString() : null;
    await saveAppData(data);
    return data.tasks[index];
}

// Reorder tasks
export async function reorderTasks(categoryId: string, taskIds: string[]): Promise<void> {
    const data = await getAppData();
    taskIds.forEach((id, index) => {
        const taskIndex = data.tasks.findIndex(t => t.id === id);
        if (taskIndex !== -1) {
            data.tasks[taskIndex].order = index;
        }
    });
    await saveAppData(data);
}

// Internal helper for auto-sorting without extraneous db round trips
async function _asyncSortTasksByDate(data: AppData, categoryId: string): Promise<void> {
    // Only sort non-completed tasks
    const activeTasks = data.tasks
        .filter(t => t.categoryId === categoryId && !t.completed)
        .sort((a, b) => {
            // Tasks without due date go to the end
            if (!a.dueDate && !b.dueDate) return 0;
            if (!a.dueDate) return 1;
            if (!b.dueDate) return -1;
            return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        });

    activeTasks.forEach((task, index) => {
        const taskIndex = data.tasks.findIndex(t => t.id === task.id);
        if (taskIndex !== -1) {
            data.tasks[taskIndex].order = index;
        }
    });
}

// Sort tasks by date (only non-completed tasks)
export async function sortTasksByDate(categoryId: string): Promise<void> {
    const data = await getAppData();
    await _asyncSortTasksByDate(data, categoryId);
    await saveAppData(data);
}

// Export data as JSON (includes all data including notes, settings, layout)
export async function exportData(): Promise<string> {
    const data = await getAppData();
    const labels = await getLabels();
    const quickLinks = await getQuickLinks();
    const notes = await getNotes();
    const teamMembers = await getTeamMembers();
    const businessTrips = await getBusinessTrips();
    const tripRecords = await getTripRecords();
    const nameResolutions = getNameResolutions();
    const theme = getTheme();
    const layoutState = getLayoutState();
    const layoutPresets = getAllLayoutPresets();

    // Calendar settings (read directly from localStorage as it's not managed fully in storage.ts)
    const calendarSettings = typeof window !== 'undefined' ? getStorageItem('calendar-settings') : null;
    const tripDestinationMappings = typeof window !== 'undefined' ? getStorageItem('tripDestinationMappings') : null;

    const UI_STATE_KEYS = [
        'calendar-settings',
        'calendar-collapsed-weeks',
        'search-history',
        'sidebar_calendar_expanded',
        'sidebar_quicklinks_expanded',
        'sidebar_pinnedmemos_expanded',
        'team-member-custom-columns',
        'team-member-visible-columns',
        'tripViewMode',
        'tripCategoryColors',
        'ganttViewPrefs',
        'tripRecordColumns',
        'tripRecordHeaders',
        'local-tasks-current-view',
        'local-tasks-current-month',
        'local-tasks-selected-date',
        'local-tasks-selected-category-ids',
    ] as const;

    const uiState: Record<string, string> = {};
    if (typeof window !== 'undefined') {
        UI_STATE_KEYS.forEach((key) => {
            const value = getStorageItem(key);
            if (value !== null) uiState[key] = value;
        });
    }

    return JSON.stringify({
        version: 3,
        timestamp: new Date().toISOString(),
        data,
        labels,
        quickLinks,
        notes,
        teamMembers,
        businessTrips,
        tripRecords,
        nameResolutions,
        theme,
        layoutState,
        layoutPresets,
        calendarSettings: calendarSettings ? JSON.parse(calendarSettings) : null,
        tripDestinationMappings: tripDestinationMappings ? JSON.parse(tripDestinationMappings) : null,
        uiState,
    }, null, 2);
}

// Import data from JSON
export async function importData(jsonString: string): Promise<boolean> {
    try {
        const parsed = JSON.parse(jsonString);

        if (typeof window === 'undefined') return false;

        // 1. Core Data (Tasks & Categories)
        if (parsed.data && parsed.data.categories) {
            await saveAppData(parsed.data);
        } else if (Array.isArray(parsed.categories) && Array.isArray(parsed.tasks)) {
            // Legacy format support
            await saveAppData(parsed as AppData);
        }

        // 2. Quick Links
        if (parsed.quickLinks) {
            saveQuickLinks(parsed.quickLinks);
        }

        // 3. Notes (Keep)
        if (parsed.notes) {
            saveNotes(parsed.notes);
        }

        // 4. Labels
        if (parsed.labels) {
            saveLabels(parsed.labels);
        }

        // 5. Team Members
        if (parsed.teamMembers) {
            saveTeamMembers(parsed.teamMembers);
        }

        // 6. Trips / Attendance DB
        if (parsed.businessTrips) {
            saveBusinessTrips(parsed.businessTrips);
        }
        if (parsed.tripRecords) {
            saveTripRecords(parsed.tripRecords);
        }
        if (parsed.nameResolutions) {
            setStorageItem(NAME_RESOLUTION_KEY, JSON.stringify(parsed.nameResolutions));
        }
        if (parsed.tripDestinationMappings) {
            setStorageItem('tripDestinationMappings', JSON.stringify(parsed.tripDestinationMappings));
        }

        // 7. Theme
        if (parsed.theme) {
            setTheme(parsed.theme);
        }

        // 8. Layout State
        if (parsed.layoutState) {
            setStorageItem(LAYOUT_STATE_KEY, JSON.stringify(parsed.layoutState));
        }

        // 9. Layout Presets
        if (parsed.layoutPresets) {
            setStorageItem(LAYOUT_PRESETS_KEY, JSON.stringify(parsed.layoutPresets));
        }

        // 10. Calendar Settings
        if (parsed.calendarSettings) {
            setStorageItem('calendar-settings', JSON.stringify(parsed.calendarSettings));
        }

        // 11. UI State Snapshot (current page/view/filter states)
        if (parsed.uiState && typeof parsed.uiState === 'object') {
            const UI_STATE_KEYS = [
                'calendar-settings',
                'calendar-collapsed-weeks',
                'search-history',
                'sidebar_calendar_expanded',
                'sidebar_quicklinks_expanded',
                'sidebar_pinnedmemos_expanded',
                'team-member-custom-columns',
                'team-member-visible-columns',
                'tripViewMode',
                'tripCategoryColors',
                'ganttViewPrefs',
                'tripRecordColumns',
                'tripRecordHeaders',
                'local-tasks-current-view',
                'local-tasks-current-month',
                'local-tasks-selected-date',
                'local-tasks-selected-category-ids',
            ] as const;

            UI_STATE_KEYS.forEach((key) => removeStorageItem(key));
            UI_STATE_KEYS.forEach((key) => {
                const value = parsed.uiState[key];
                if (typeof value === 'string') {
                    setStorageItem(key, value);
                }
            });
        }

        return true;
    } catch (error) {
        console.error('Import failed:', error);
        return false;
    }
}

// Quick Links - moved to IndexedDB
const QUICK_LINKS_KEY = 'local-tasks-quick-links';

import { QuickLink } from './types';

export async function getQuickLinks(): Promise<QuickLink[]> {
    if (typeof window === 'undefined') return [];
    const data = await idbGet<QuickLink[]>(QUICK_LINKS_KEY);
    if (!data) return [];
    return data.sort((a: QuickLink, b: QuickLink) => a.order - b.order);
}

export async function saveQuickLinks(links: QuickLink[]): Promise<void> {
    if (typeof window === 'undefined') return;
    await idbSet(QUICK_LINKS_KEY, links);
}

export async function addQuickLink(name: string, url: string, options: Partial<QuickLink> = {}): Promise<QuickLink> {
    const links = await getQuickLinks();
    const maxOrder = Math.max(...links.map(l => l.order), -1);
    const newLink: QuickLink = {
        id: generateId(),
        name,
        url,
        order: maxOrder + 1,
        ...options
    };
    links.push(newLink);
    await saveQuickLinks(links);
    return newLink;
}

export async function updateQuickLink(id: string, updates: Partial<QuickLink>): Promise<QuickLink | null> {
    const links = await getQuickLinks();
    const index = links.findIndex(l => l.id === id);
    if (index === -1) return null;
    links[index] = { ...links[index], ...updates };
    await saveQuickLinks(links);
    return links[index];
}

export async function deleteQuickLink(id: string): Promise<boolean> {
    const links = await getQuickLinks();
    const index = links.findIndex(l => l.id === id);
    if (index === -1) return false;
    links.splice(index, 1);
    await saveQuickLinks(links);
    return true;
}

export async function reorderQuickLinks(linkIds: string[]): Promise<void> {
    const links = await getQuickLinks();
    linkIds.forEach((id, index) => {
        const linkIndex = links.findIndex(l => l.id === id);
        if (linkIndex !== -1) {
            links[linkIndex].order = index;
        }
    });
    await saveQuickLinks(links);
}

// Theme settings
const THEME_KEY = 'local-tasks-theme';

export type Theme = 'light' | 'dark';

export function getTheme(): Theme {
    if (typeof window === 'undefined') return 'light';
    return (getStorageItem(THEME_KEY) as Theme) || 'light';
}

export function setTheme(theme: Theme): void {
    if (typeof window === 'undefined') return;
    setStorageItem(THEME_KEY, theme);
}

// Layout settings
const LAYOUT_KEY = 'local-tasks-layout';
const LAYOUT_STATE_KEY = 'local-tasks-layout-state';
const LAYOUT_PRESETS_KEY = 'local-tasks-layout-presets';

export type Layout = 1 | 2 | 3;

// Full layout state for persistence
export interface LayoutState {
    layout: Layout;
    taskListWidth: number;
    isSidebarVisible: boolean;
    showWeekends: boolean;
}

// Default layout state
const DEFAULT_LAYOUT_STATE: LayoutState = {
    layout: 1,
    taskListWidth: 400,
    isSidebarVisible: true,
    showWeekends: true,
};

// Get current layout state (auto-saved)
export function getLayoutState(): LayoutState {
    if (typeof window === 'undefined') return DEFAULT_LAYOUT_STATE;
    const data = getStorageItem(LAYOUT_STATE_KEY);
    if (!data) return DEFAULT_LAYOUT_STATE;
    try {
        return { ...DEFAULT_LAYOUT_STATE, ...JSON.parse(data) };
    } catch {
        return DEFAULT_LAYOUT_STATE;
    }
}

// Save current layout state (auto-save)
export function saveLayoutState(state: Partial<LayoutState>): void {
    if (typeof window === 'undefined') return;
    const current = getLayoutState();
    const updated = { ...current, ...state };
    setStorageItem(LAYOUT_STATE_KEY, JSON.stringify(updated));
}

// Layout presets (5 slots: index 0-4 for Ctrl+6~0)
export interface LayoutPreset extends LayoutState {
    name: string;
    savedAt: string;
}

export function getLayoutPreset(index: number): LayoutPreset | null {
    if (typeof window === 'undefined' || index < 0 || index > 4) return null;
    const data = getStorageItem(LAYOUT_PRESETS_KEY);
    if (!data) return null;
    try {
        const presets: (LayoutPreset | null)[] = JSON.parse(data);
        return presets[index] || null;
    } catch {
        return null;
    }
}

export function saveLayoutPreset(index: number, state: LayoutState, name?: string): LayoutPreset | null {
    if (typeof window === 'undefined' || index < 0 || index > 4) return null;

    const data = getStorageItem(LAYOUT_PRESETS_KEY);
    const presets: (LayoutPreset | null)[] = data ? JSON.parse(data) : [null, null, null, null, null];

    const preset: LayoutPreset = {
        ...state,
        name: name || `?꾨━??${index + 1}`,
        savedAt: new Date().toISOString(),
    };

    presets[index] = preset;
    setStorageItem(LAYOUT_PRESETS_KEY, JSON.stringify(presets));
    return preset;
}

export function getAllLayoutPresets(): (LayoutPreset | null)[] {
    if (typeof window === 'undefined') return [null, null, null, null, null];
    const data = getStorageItem(LAYOUT_PRESETS_KEY);
    if (!data) return [null, null, null, null, null];
    try {
        return JSON.parse(data);
    } catch {
        return [null, null, null, null, null];
    }
}

// Legacy functions for backward compatibility
export function getLayout(): Layout {
    return getLayoutState().layout;
}

export function setLayout(layout: Layout): void {
    saveLayoutState({ layout });
}

// Notes storage (Keep-style memos)
const NOTES_KEY = 'local-tasks-notes';

import { Note } from './types';

export async function getNotes(): Promise<Note[]> {
    if (typeof window === 'undefined') return [];
    const data = await idbGet<Note[]>(NOTES_KEY);
    if (!data) return [];
    return data.sort((a: Note, b: Note) => {
        // Pinned notes first, then by order
        if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
        return a.order - b.order;
    });
}

async function saveNotes(notes: Note[]): Promise<void> {
    if (typeof window === 'undefined') return;
    await idbSet(NOTES_KEY, notes);
}

export async function addNote(title: string, content: string = '', color: string = '#ffffff'): Promise<Note> {
    const notes = await getNotes();
    const maxOrder = Math.max(...notes.map(n => n.order), -1);
    const newNote: Note = {
        id: generateId(),
        title,
        content,
        color,
        isPinned: false,
        isArchived: false,
        order: maxOrder + 1,
        createdAt: new Date().toISOString(),
    };
    notes.push(newNote);
    await saveNotes(notes);
    return newNote;
}

export async function updateNote(id: string, updates: Partial<Note>): Promise<Note | null> {
    const notes = await getNotes();
    const index = notes.findIndex(n => n.id === id);
    if (index === -1) return null;
    notes[index] = { ...notes[index], ...updates };
    await saveNotes(notes);
    return notes[index];
}

export async function deleteNote(id: string): Promise<boolean> {
    const notes = await getNotes();
    const index = notes.findIndex(n => n.id === id);
    if (index === -1) return false;
    notes.splice(index, 1);
    await saveNotes(notes);
    return true;
}

export async function reorderNotes(noteIds: string[]): Promise<void> {
    const notes = await getNotes();
    noteIds.forEach((id, index) => {
        const noteIndex = notes.findIndex(n => n.id === id);
        if (noteIndex !== -1) {
            notes[noteIndex].order = index;
        }
    });
    await saveNotes(notes);
}
// Labels storage
const LABELS_KEY = 'local-tasks-labels';

import { Label } from './types';

export async function getLabels(): Promise<Label[]> {
    if (typeof window === 'undefined') return [];
    const data = await idbGet<Label[]>(LABELS_KEY);
    if (!data) return [];
    return data.sort((a: Label, b: Label) => a.name.localeCompare(b.name));
}

async function saveLabels(labels: Label[]): Promise<void> {
    if (typeof window === 'undefined') return;
    await idbSet(LABELS_KEY, labels);
}

export async function addLabel(name: string): Promise<Label> {
    const labels = await getLabels();
    const newLabel: Label = {
        id: generateId(),
        name,
    };
    labels.push(newLabel);
    await saveLabels(labels);
    return newLabel;
}

export async function updateLabel(id: string, name: string): Promise<Label | null> {
    const labels = await getLabels();
    const index = labels.findIndex(l => l.id === id);
    if (index === -1) return null;
    labels[index] = { ...labels[index], name };
    await saveLabels(labels);
    return labels[index];
}

export async function deleteLabel(id: string): Promise<boolean> {
    const labels = await getLabels();
    const index = labels.findIndex(l => l.id === id);
    if (index === -1) return false;

    // Also remove this label from getAllNotes
    const notes = await getNotes();
    let notesChanged = false;
    notes.forEach(note => {
        if (note.labels?.includes(id)) {
            note.labels = note.labels.filter(labelId => labelId !== id);
            notesChanged = true;
        }
    });

    if (notesChanged) {
        await saveNotes(notes);
    }

    labels.splice(index, 1);
    await saveLabels(labels);
    return true;
}

// Team Members storage
const TEAM_MEMBERS_KEY = 'local-tasks-team-members';

import { TeamMember } from './types';

export async function getTeamMembers(): Promise<TeamMember[]> {
    if (typeof window === 'undefined') return [];
    const data = await idbGet<TeamMember[]>(TEAM_MEMBERS_KEY);
    if (!data) return [];
    return data.sort((a: TeamMember, b: TeamMember) => a.name.localeCompare(b.name, 'ko'));
}

export async function saveTeamMembers(members: TeamMember[]): Promise<void> {
    if (typeof window === 'undefined') return;
    await idbSet(TEAM_MEMBERS_KEY, members);
}

export async function addTeamMember(member: Omit<TeamMember, 'id' | 'createdAt' | 'updatedAt'>): Promise<TeamMember> {
    const members = await getTeamMembers();
    const now = new Date().toISOString();
    const newMember: TeamMember = {
        ...member,
        id: member.knoxId || member.employeeId || generateId(),
        createdAt: now,
        updatedAt: now,
    };
    members.push(newMember);
    await saveTeamMembers(members);
    return newMember;
}

export async function updateTeamMember(id: string, updates: Partial<TeamMember>): Promise<TeamMember | null> {
    const members = await getTeamMembers();
    const index = members.findIndex(m => m.id === id);
    if (index === -1) return null;
    members[index] = { ...members[index], ...updates, updatedAt: new Date().toISOString() };
    await saveTeamMembers(members);
    return members[index];
}

export async function deleteTeamMember(id: string): Promise<boolean> {
    const members = await getTeamMembers();
    const index = members.findIndex(m => m.id === id);
    if (index === -1) return false;
    members.splice(index, 1);
    await saveTeamMembers(members);
    return true;
}

// Business Trip Storage
const TRIP_STORAGE_KEY = 'business-trips';

export async function getBusinessTrips(): Promise<import('./types').BusinessTrip[]> {
    if (typeof window === 'undefined') return [];
    const stored = await idbGet<import('./types').BusinessTrip[]>(TRIP_STORAGE_KEY);
    return stored ? stored : [];
}

export async function saveBusinessTrips(trips: import('./types').BusinessTrip[]): Promise<void> {
    if (typeof window === 'undefined') return;
    await idbSet(TRIP_STORAGE_KEY, trips);
}

export async function addBusinessTrip(trip: Omit<import('./types').BusinessTrip, 'id' | 'createdAt' | 'updatedAt'>): Promise<import('./types').BusinessTrip> {
    const trips = await getBusinessTrips();
    const now = new Date().toISOString();
    const newTrip: import('./types').BusinessTrip = {
        ...trip,
        id: generateId(), // Using existing generateId
        createdAt: now,
        updatedAt: now,
    };
    trips.push(newTrip);
    await saveBusinessTrips(trips);
    return newTrip;
}

export async function deleteBusinessTrip(id: string): Promise<void> {
    const trips = await getBusinessTrips();
    const filtered = trips.filter(t => t.id !== id);
    await saveBusinessTrips(filtered);
}

// Trip Record Storage (Manual DB)
const TRIP_RECORD_STORAGE_KEY = 'trip-records';

export async function getTripRecords(): Promise<import('./types').TripRecord[]> {
    if (typeof window === 'undefined') return [];
    const stored = await idbGet<import('./types').TripRecord[]>(TRIP_RECORD_STORAGE_KEY);
    return stored ? stored : [];
}

export async function saveTripRecords(records: import('./types').TripRecord[]): Promise<void> {
    if (typeof window === 'undefined') return;
    await idbSet(TRIP_RECORD_STORAGE_KEY, records);
}

export async function addTripRecord(record: Omit<import('./types').TripRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<import('./types').TripRecord> {
    const records = await getTripRecords();
    const now = new Date().toISOString();
    const newRecord: import('./types').TripRecord = {
        ...record,
        id: generateId(),
        createdAt: now,
        updatedAt: now,
    };
    records.push(newRecord);
    await saveTripRecords(records);
    return newRecord;
}

export async function deleteTripRecord(id: string): Promise<void> {
    const records = await getTripRecords();
    const filtered = records.filter(r => r.id !== id);
    await saveTripRecords(filtered);
}

// Name Resolution Storage (Name -> KnoxID)
const NAME_RESOLUTION_KEY = 'trip-name-resolution';

export function getNameResolutions(): Record<string, string> {
    if (typeof window === 'undefined') return {};
    const stored = getStorageItem(NAME_RESOLUTION_KEY);
    return stored ? JSON.parse(stored) : {};
}

export function saveNameResolution(name: string, knoxId: string) {
    const resolutions = getNameResolutions();
    resolutions[name] = knoxId;
    if (typeof window === 'undefined') return;
    setStorageItem(NAME_RESOLUTION_KEY, JSON.stringify(resolutions));
}

export function removeNameResolution(name: string) {
    const resolutions = getNameResolutions();
    delete resolutions[name];
    if (typeof window === 'undefined') return;
    setStorageItem(NAME_RESOLUTION_KEY, JSON.stringify(resolutions));
}

