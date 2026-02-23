const fs = require('fs');
const path = require('path');

const targetFile = path.join(__dirname, 'src', 'components', 'sidebar.tsx');
let content = fs.readFileSync(targetFile, 'utf8');
content = content.replace(/\r\n/g, '\n');

// 1. Imports
const oldImports = `import { addCategory, updateCategory, deleteCategory, getQuickLinks, addQuickLink, updateQuickLink, deleteQuickLink, reorderQuickLinks, getNotes, deleteNote } from '@/lib/storage';`;
const newImports = `import { useData } from '@/providers/data-provider';`;
content = content.replace(oldImports, newImports);

// 2. Add useData to component
const searchStr = `    const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);`;
const replaceStr = `    const { 
        quickLinks: contextQuickLinks,
        addQuickLink,
        updateQuickLink,
        deleteQuickLink,
        reorderQuickLinks,
        notes: contextNotes,
        deleteNote,
        addCategory,
        updateCategory,
        deleteCategory
    } = useData();
    const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);`;
content = content.replace(searchStr, replaceStr);

// 3. Remove loadPinnedNotes and dependencies and use useEffect
const oldNotesBlock = `    // Load pinned notes
    const loadPinnedNotes = () => {
        const notes = getNotes().filter(n => n.isPinned && !n.isArchived);
        setPinnedNotes(notes);
    };`;
content = content.replace(oldNotesBlock, `    // Reactive pinned notes
    useEffect(() => {
        const notes = contextNotes.filter(n => n.isPinned && !n.isArchived);
        setPinnedNotes(notes);
    }, [contextNotes, notesVersion]);`);

// Remove loadQuickLinks block
const oldQLBlock = `    // Load quick links on mount and sort
    const loadQuickLinks = () => {
        const links = getQuickLinks();
        // Sort by Pinned status first
        links.sort((a, b) => {
            if (a.isPinned === b.isPinned) return 0;
            return a.isPinned ? -1 : 1;
        });
        setQuickLinks(links);
    };`;
content = content.replace(oldQLBlock, `    // Reactive quick links
    useEffect(() => {
        const links = [...contextQuickLinks];
        links.sort((a, b) => {
            if (a.isPinned === b.isPinned) return 0;
            return a.isPinned ? -1 : 1;
        });
        setQuickLinks(links);
    }, [contextQuickLinks]);`);

// Remove mounting useEffects
const oldMountEffect = `    useEffect(() => {
        loadQuickLinks();
        loadPinnedNotes();
    }, []);

    // Reload pinned notes when notesVersion changes
    useEffect(() => {
        if (notesVersion !== undefined) {
            loadPinnedNotes();
        }
    }, [notesVersion]);`;
content = content.replace(oldMountEffect, '');

// Clean up calls to loadQuickLinks()
content = content.replace(/loadQuickLinks\(\);/g, '');

fs.writeFileSync(targetFile, content, 'utf8');
console.log('sidebar.tsx patched');
