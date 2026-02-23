const fs = require('fs');
const path = require('path');

const targetFile = path.join(__dirname, 'src', 'components', 'favorites-view.tsx');
let content = fs.readFileSync(targetFile, 'utf8');
content = content.replace(/\r\n/g, '\n');

// 1. Imports
content = content.replace(
    "import { getTasks, updateTask, getQuickLinks, updateQuickLink, getNotes, updateNote } from '@/lib/storage';",
    "import { useData } from '@/providers/data-provider';"
);

// 2. Component Initializer
content = content.replace(
    "export function FavoritesView({ categories, onTaskClick, onNoteClick, onScheduleClick, onDataChange }: FavoritesViewProps) {\n    const [favoriteTasks, setFavoriteTasks] = useState<Task[]>([]);\n    const [favoriteLinks, setFavoriteLinks] = useState<QuickLink[]>([]);\n    const [favoriteNotes, setFavoriteNotes] = useState<Note[]>([]);",
    "export function FavoritesView({ categories, onTaskClick, onNoteClick, onScheduleClick, onDataChange }: FavoritesViewProps) {\n    const { tasks, quickLinks, notes, updateTask, updateQuickLink, updateNote } = useData();\n    const [favoriteTasks, setFavoriteTasks] = useState<Task[]>([]);\n    const [favoriteLinks, setFavoriteLinks] = useState<QuickLink[]>([]);\n    const [favoriteNotes, setFavoriteNotes] = useState<Note[]>([]);"
);

// 3. Load and use effects
// We remove loadFavorites function and replace useEffect with one that depends on context
const loadFavsBlock = `    const loadFavorites = () => {\n        setFavoriteTasks(getTasks().filter(t => t.isFavorite));\n        setFavoriteLinks(getQuickLinks().filter(l => l.isFavorite));\n        setFavoriteNotes(getNotes().filter(n => n.isFavorite));\n    };\n\n    useEffect(() => {\n        loadFavorites();\n    }, []);`;
const newEffectsBlock = `    useEffect(() => {\n        setFavoriteTasks(tasks.filter(t => t.isFavorite));\n        setFavoriteLinks(quickLinks.filter(l => l.isFavorite));\n        setFavoriteNotes(notes.filter(n => n.isFavorite));\n    }, [tasks, quickLinks, notes]);`;
content = content.replace(loadFavsBlock, newEffectsBlock);

// 4. Update function (Async toggle)
const handleToggleBlock = `    const handleToggleFavorite = (type: 'task' | 'link' | 'note', id: string) => {
        if (type === 'task') {
            const task = favoriteTasks.find(t => t.id === id);
            if (task) {
                updateTask(id, { isFavorite: false });
            }
        } else if (type === 'link') {
            const link = favoriteLinks.find(l => l.id === id);
            if (link) {
                updateQuickLink(id, { isFavorite: false });
            }
        } else if (type === 'note') {
            const note = favoriteNotes.find(n => n.id === id);
            if (note) {
                updateNote(id, { isFavorite: false });
            }
        }
        loadFavorites();
        onDataChange?.();
    };`;
const newHandleToggleBlock = `    const handleToggleFavorite = async (type: 'task' | 'link' | 'note', id: string) => {
        if (type === 'task') {
            await updateTask(id, { isFavorite: false });
        } else if (type === 'link') {
            await updateQuickLink(id, { isFavorite: false });
        } else if (type === 'note') {
            await updateNote(id, { isFavorite: false });
        }
        onDataChange?.();
    };`;
content = content.replace(handleToggleBlock, newHandleToggleBlock);

fs.writeFileSync(targetFile, content, 'utf8');
console.log('patched favorites-view.tsx');
