const fs = require('fs');
const path = require('path');

const targetFile = path.join(__dirname, 'src', 'components', 'search-command-dialog.tsx');
let content = fs.readFileSync(targetFile, 'utf8');
content = content.replace(/\r\n/g, '\n');

// 1. Imports
const oldImports = `import { getTasks, getQuickLinks, getNotes, getCategories, getTeamMembers, getBusinessTrips } from '@/lib/storage';`;
const newImports = `import { useData } from '@/providers/data-provider';`;
content = content.replace(oldImports, newImports);

// 2. Add hook usage & replace the local variables
const oldInit = `export function SearchCommandDialog({
    isOpen,
    onClose,
    onSelectTask,
    onSelectNote,
    onSelectMember
}: SearchCommandDialogProps) {
    const [query, setQuery] = useState('');`;

const newInit = `export function SearchCommandDialog({
    isOpen,
    onClose,
    onSelectTask,
    onSelectNote,
    onSelectMember
}: SearchCommandDialogProps) {
    const { tasks: allTasks, quickLinks: allQuickLinks, notes: allNotes, categories, teamMembers: allMembers, businessTrips: allTrips } = useData();
    const [query, setQuery] = useState('');`;
content = content.replace(oldInit, newInit);

const oldInternalVars = `        const allTasks = getTasks();
        const allQuickLinks = getQuickLinks();
        const allNotes = getNotes();
        const categories = getCategories();

        const teamScheduleCat = categories.find(c => c.name === '팀 일정');`;

const newInternalVars = `        const teamScheduleCat = categories.find(c => c.name === '팀 일정');`;
content = content.replace(oldInternalVars, newInternalVars);

const oldInternalVars2 = `        // 4. Team Members (with attendance status)
        const allMembers = getTeamMembers();
        const allTrips = getBusinessTrips();
        const now = new Date();`;

const newInternalVars2 = `        // 4. Team Members (with attendance status)
        const now = new Date();`;
content = content.replace(oldInternalVars2, newInternalVars2);

// The useEffect dependencies should include the data
// Find: }, [query, isOpen]);
// Replace: }, [query, isOpen, allTasks, allQuickLinks, allNotes, categories, allMembers, allTrips]);
content = content.replace('}, [query, isOpen]);', '}, [query, isOpen, allTasks, allQuickLinks, allNotes, categories, allMembers, allTrips]);');


fs.writeFileSync(targetFile, content, 'utf8');
console.log('patched search-command-dialog.tsx');
