const fs = require('fs');
const path = require('path');

const targetFile = path.join(__dirname, 'src', 'components', 'keep-view.tsx');
let content = fs.readFileSync(targetFile, 'utf8');
content = content.replace(/\r\n/g, '\n');

// 1. Imports
content = content.replace(
    "import { getNotes, addNote, updateNote, deleteNote, getLabels, addLabel, updateLabel, deleteLabel } from '@/lib/storage';",
    "import { addLabel, updateLabel, deleteLabel } from '@/lib/storage';\nimport { useData } from '@/providers/data-provider';"
);

// 2. Component init
content = content.replace(
    "export function KeepView({ selectedNoteId, onNoteSelected, onNotesChange }: KeepViewProps = {}) {\n    const [notes, setNotes] = useState<Note[]>([]);\n    const [labels, setLabels] = useState<Label[]>([]);",
    "export function KeepView({ selectedNoteId, onNoteSelected, onNotesChange }: KeepViewProps = {}) {\n    const { notes: contextNotes, labels: contextLabels, addNote, updateNote, deleteNote, refreshData } = useData();\n    const [notes, setNotes] = useState<Note[]>([]);\n    const [labels, setLabels] = useState<Label[]>([]);"
);

// 3. useEffect Mount
content = content.replace(
    "    useEffect(() => {\n        loadNotes();\n        loadLabels();\n    }, []);\n\n    const loadLabels = () => {\n        setLabels(getLabels());\n    };",
    "    useEffect(() => {\n        setNotes(contextNotes);\n    }, [contextNotes]);\n\n    useEffect(() => {\n        setLabels(contextLabels);\n    }, [contextLabels]);"
);

// 4. loadNotes and others
content = content.replace(
    "    const loadNotes = () => {\n        setNotes(getNotes());\n    };",
    ""
);

// 5. Note functions - They use useData's mutation functions which already update state synchronously locally, 
// so we don't need loadNotes(). But we should await them if they are async.
// Since we don't know if they return promise in context, let's just make them async.
content = content.replace(
    /const handleAddNote = \(\) => {/g,
    "const handleAddNote = async () => {"
);
content = content.replace(
    "const note = addNote(newTitle.trim() || '제목 없음', newContent.trim());\n            if (newNoteLabels.length > 0) {\n                updateNote(note.id, { labels: newNoteLabels });\n            }",
    "const note = await addNote(newTitle.trim() || '제목 없음', newContent.trim());\n            if (newNoteLabels.length > 0) {\n                await updateNote(note.id, { labels: newNoteLabels });\n            }"
);
content = content.replace(
    "            setIsCreateDialogOpen(false);\n            loadNotes();\n            onNotesChange?.();",
    "            setIsCreateDialogOpen(false);\n            onNotesChange?.();"
);

content = content.replace(
    /const handleUpdateNote = \(\) => {/g,
    "const handleUpdateNote = async () => {"
);
content = content.replace(
    "            updateNote(editingNote.id, {\n                title: editingNote.title,\n                content: editingNote.content,\n                color: editingNote.color,\n                labels: editingNote.labels,\n            });",
    "            await updateNote(editingNote.id, {\n                title: editingNote.title,\n                content: editingNote.content,\n                color: editingNote.color,\n                labels: editingNote.labels,\n            });"
);
content = content.replace(
    "            setEditingNote(null);\n            loadNotes();\n            onNotesChange?.();",
    "            setEditingNote(null);\n            onNotesChange?.();"
);

content = content.replace(
    /const handleTogglePin = \(note: Note\) => {/g,
    "const handleTogglePin = async (note: Note) => {"
);
content = content.replace(
    "        updateNote(note.id, { isPinned: !note.isPinned });\n        loadNotes();\n        onNotesChange?.();",
    "        await updateNote(note.id, { isPinned: !note.isPinned });\n        onNotesChange?.();"
);

content = content.replace(
    /const handleToggleFavorite = \(note: Note\) => {/g,
    "const handleToggleFavorite = async (note: Note) => {"
);
content = content.replace(
    "        updateNote(note.id, { isFavorite: !note.isFavorite });\n        loadNotes();\n        onNotesChange?.();",
    "        await updateNote(note.id, { isFavorite: !note.isFavorite });\n        onNotesChange?.();"
);

content = content.replace(
    /const handleToggleArchive = \(note: Note\) => {/g,
    "const handleToggleArchive = async (note: Note) => {"
);
content = content.replace(
    "        updateNote(note.id, { isArchived: !note.isArchived });\n        loadNotes();\n        onNotesChange?.();",
    "        await updateNote(note.id, { isArchived: !note.isArchived });\n        onNotesChange?.();"
);

content = content.replace(
    /const handleChangeColor = \(note: Note, color: string\) => {/g,
    "const handleChangeColor = async (note: Note, color: string) => {"
);
content = content.replace(
    "        updateNote(note.id, { color });\n        loadNotes();",
    "        await updateNote(note.id, { color });"
);

content = content.replace(
    /const handleDelete = \(id: string\) => {/g,
    "const handleDelete = async (id: string) => {"
);
content = content.replace(
    "        deleteNote(id);\n        loadNotes();\n        onNotesChange?.();",
    "        await deleteNote(id);\n        onNotesChange?.();"
);

// 6. Label functions - these use storage APIs directly, so we await and call refreshData()
content = content.replace(
    /const handleAddLabel = \(\) => {/g,
    "const handleAddLabel = async () => {"
);
content = content.replace(
    "            addLabel(newLabelName.trim());\n            setNewLabelName('');\n            loadLabels();",
    "            await addLabel(newLabelName.trim());\n            setNewLabelName('');\n            refreshData();"
);

content = content.replace(
    /const handleUpdateLabel = \(id: string\) => {/g,
    "const handleUpdateLabel = async (id: string) => {"
);
content = content.replace(
    "            updateLabel(id, editingLabelName.trim());\n            setEditingLabelId(null);\n            setEditingLabelName('');\n            loadLabels();\n            loadNotes();",
    "            await updateLabel(id, editingLabelName.trim());\n            setEditingLabelId(null);\n            setEditingLabelName('');\n            refreshData();"
);

content = content.replace(
    /const handleDeleteLabel = \(id: string\) => {/g,
    "const handleDeleteLabel = async (id: string) => {"
);
content = content.replace(
    "            deleteLabel(id);\n            if (selectedLabelId === id) setSelectedLabelId(null);\n            loadLabels();\n            loadNotes();",
    "            await deleteLabel(id);\n            if (selectedLabelId === id) setSelectedLabelId(null);\n            refreshData();"
);

fs.writeFileSync(targetFile, content, 'utf8');
console.log('keep-view.tsx patched successfully');
