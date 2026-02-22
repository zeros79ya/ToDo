'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { AppData, Category, Task, Note, BusinessTrip, TripRecord, TeamMember, Label, QuickLink } from '@/lib/types';
import * as storage from '@/lib/storage'; // We will rewrite lib/storage to be fully async

export interface DataContextType {
    isDBLoading: boolean;
    // Core Data
    categories: Category[];
    tasks: Task[];
    notes: Note[];
    labels: Label[];
    quickLinks: QuickLink[];
    teamMembers: TeamMember[];
    businessTrips: BusinessTrip[];
    tripRecords: TripRecord[];

    // Actions - Categories
    addCategory: (name: string) => Promise<Category>;
    updateCategory: (id: string, updates: Partial<Category>) => Promise<Category | null>;
    deleteCategory: (id: string) => Promise<boolean>;

    // Actions - Tasks
    addTask: (categoryId: string, title: string, dueDate?: string | null, options?: Partial<Task>) => Promise<Task>;
    updateTask: (id: string, updates: Partial<Task>) => Promise<Task | null>;
    deleteTask: (id: string) => Promise<boolean>;
    toggleTaskComplete: (id: string) => Promise<Task | null>;
    reorderTasks: (categoryId: string, taskIds: string[]) => Promise<void>;

    // Actions - Notes
    addNote: (title: string, content?: string, color?: string) => Promise<Note>;
    updateNote: (id: string, updates: Partial<Note>) => Promise<Note | null>;
    deleteNote: (id: string) => Promise<boolean>;

    // Actions - QuickLinks
    addQuickLink: (name: string, url: string, options?: Partial<QuickLink>) => Promise<QuickLink>;
    updateQuickLink: (id: string, updates: Partial<QuickLink>) => Promise<QuickLink | null>;
    deleteQuickLink: (id: string) => Promise<boolean>;
    reorderQuickLinks: (linkIds: string[]) => Promise<void>;

    // Force Refresh (useful for mass imports)
    refreshData: () => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: React.ReactNode }) {
    const [isDBLoading, setIsDBLoading] = useState(true);

    // State mirroring the DB
    const [categories, setCategories] = useState<Category[]>([]);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [notes, setNotes] = useState<Note[]>([]);
    const [labels, setLabels] = useState<Label[]>([]);
    const [quickLinks, setQuickLinks] = useState<QuickLink[]>([]);
    const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
    const [businessTrips, setBusinessTrips] = useState<BusinessTrip[]>([]);
    const [tripRecords, setTripRecords] = useState<TripRecord[]>([]);

    const refreshData = useCallback(async () => {
        setIsDBLoading(true);
        try {
            // First time initialization / migration
            await storage.initializeIndexedDBStorage();

            // Load all collections concurrently
            const [
                cats,
                tsks,
                nts,
                lbls,
                qls,
                tms,
                bts,
                trs
            ] = await Promise.all([
                storage.getCategories(),
                storage.getTasks(),
                storage.getNotes(),
                storage.getLabels(),
                storage.getQuickLinks(),
                storage.getTeamMembers(),
                storage.getBusinessTrips(),
                storage.getTripRecords()
            ]);

            setCategories(cats);
            setTasks(tsks);
            setNotes(nts);
            setLabels(lbls);
            setQuickLinks(qls);
            setTeamMembers(tms);
            setBusinessTrips(bts);
            setTripRecords(trs);
        } catch (error) {
            console.error('Failed to load data from IndexedDB:', error);
        } finally {
            setIsDBLoading(false);
        }
    }, []);

    useEffect(() => {
        refreshData();
    }, [refreshData]);

    // Fast Optimistic UI + Async DB writes
    const addCategory = async (name: string) => {
        const newCat = await storage.addCategory(name);
        setCategories(prev => [...prev, newCat]);
        return newCat;
    };

    const updateCategory = async (id: string, updates: Partial<Category>) => {
        const updated = await storage.updateCategory(id, updates);
        if (updated) {
            setCategories(prev => prev.map(c => c.id === id ? updated : c));
        }
        return updated;
    };

    const deleteCategory = async (id: string) => {
        const success = await storage.deleteCategory(id);
        if (success) {
            setCategories(prev => prev.filter(c => c.id !== id));
            setTasks(prev => prev.filter(t => t.categoryId !== id));
        }
        return success;
    };

    const addTask = async (categoryId: string, title: string, dueDate?: string | null, options?: Partial<Task>) => {
        const newTask = await storage.addTask(categoryId, title, dueDate, options);
        setTasks(prev => [...prev, newTask]);
        return newTask;
    };

    const updateTask = async (id: string, updates: Partial<Task>) => {
        const updated = await storage.updateTask(id, updates);
        if (updated) {
            setTasks(prev => prev.map(t => t.id === id ? updated : t));
        }
        return updated;
    };

    const deleteTask = async (id: string) => {
        const success = await storage.deleteTask(id);
        if (success) {
            setTasks(prev => prev.filter(t => t.id !== id));
        }
        return success;
    };

    const toggleTaskComplete = async (id: string) => {
        const updated = await storage.toggleTaskComplete(id);
        if (updated) {
            setTasks(prev => prev.map(t => t.id === id ? updated : t));
        }
        return updated;
    };

    const reorderTasks = async (categoryId: string, taskIds: string[]) => {
        // Optimistic UI update
        setTasks(prev => {
            const next = [...prev];
            taskIds.forEach((id, index) => {
                const taskIndex = next.findIndex(t => t.id === id);
                if (taskIndex !== -1) {
                    next[taskIndex] = { ...next[taskIndex], order: index };
                }
            });
            return next;
        });
        await storage.reorderTasks(categoryId, taskIds);
    };

    const addNote = async (title: string, content?: string, color?: string) => {
        const newNote = await storage.addNote(title, content, color);
        setNotes(prev => [...prev, newNote]);
        return newNote;
    };

    const updateNote = async (id: string, updates: Partial<Note>) => {
        const updated = await storage.updateNote(id, updates);
        if (updated) {
            setNotes(prev => prev.map(n => n.id === id ? updated : n));
        }
        return updated;
    };

    const deleteNote = async (id: string) => {
        const success = await storage.deleteNote(id);
        if (success) {
            setNotes(prev => prev.filter(n => n.id !== id));
        }
        return success;
    };

    const addQuickLink = async (name: string, url: string, options?: Partial<QuickLink>) => {
        const newLink = await storage.addQuickLink(name, url, options);
        setQuickLinks(prev => [...prev, newLink]);
        return newLink;
    };

    const updateQuickLink = async (id: string, updates: Partial<QuickLink>) => {
        const updated = await storage.updateQuickLink(id, updates);
        if (updated) {
            setQuickLinks(prev => prev.map(l => l.id === id ? updated : l));
        }
        return updated;
    };

    const deleteQuickLink = async (id: string) => {
        const success = await storage.deleteQuickLink(id);
        if (success) {
            setQuickLinks(prev => prev.filter(l => l.id !== id));
        }
        return success;
    };

    const reorderQuickLinks = async (linkIds: string[]) => {
        // Optimistic UI update
        setQuickLinks(prev => {
            const next = [...prev];
            linkIds.forEach((id, index) => {
                const linkIndex = next.findIndex(l => l.id === id);
                if (linkIndex !== -1) {
                    next[linkIndex] = { ...next[linkIndex], order: index };
                }
            });
            return next;
        });
        await storage.reorderQuickLinks(linkIds);
    };

    const value = {
        isDBLoading,
        categories,
        tasks,
        notes,
        labels,
        quickLinks,
        teamMembers,
        businessTrips,
        tripRecords,
        addCategory,
        updateCategory,
        deleteCategory,
        addTask,
        updateTask,
        deleteTask,
        toggleTaskComplete,
        reorderTasks,
        addNote,
        updateNote,
        deleteNote,
        addQuickLink,
        updateQuickLink,
        deleteQuickLink,
        reorderQuickLinks,
        refreshData
    };

    return (
        <DataContext.Provider value={value}>
            {children}
        </DataContext.Provider>
    );
}

export function useData() {
    const context = useContext(DataContext);
    if (context === undefined) {
        throw new Error('useData must be used within a DataProvider');
    }
    return context;
}
