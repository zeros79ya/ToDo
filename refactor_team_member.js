const fs = require('fs');
const path = require('path');

const targetFile = path.join(__dirname, 'src', 'components', 'team-member-board.tsx');
let content = fs.readFileSync(targetFile, 'utf8');

// Normalize newlines to \n to ensure robust matching
content = content.replace(/\r\n/g, '\n');

// Replace 1: Imports
content = content.replace(
    "import { getTeamMembers, saveTeamMembers, deleteTeamMember } from '@/lib/storage';",
    "import { saveTeamMembers, deleteTeamMember } from '@/lib/storage';\nimport { useData } from '@/providers/data-provider';"
);

// Replace 2: State init
content = content.replace(
    "export function TeamMemberBoard({ onDataChange, onTeamStatusClick }: TeamMemberBoardProps) {\n    const [members, setMembers] = useState<TeamMember[]>([]);",
    "export function TeamMemberBoard({ onDataChange, onTeamStatusClick }: TeamMemberBoardProps) {\n    const { teamMembers: contextMembers, refreshData } = useData();\n    const [members, setMembers] = useState<TeamMember[]>([]);"
);

// Replace 3: Sync members from context
content = content.replace(
    "    useEffect(() => {\n        // Load and migrate: ensure all members use knoxId as their id\n        let members = getTeamMembers();",
    "    useEffect(() => {\n        // Load and migrate: ensure all members use knoxId as their id\n        let members = [...contextMembers];\n        if (members.length === 0) return;"
);
// Make the `saveTeamMembers(members)` async and safe:
content = content.replace(
    "        if (needsSave) saveTeamMembers(members);\n        setMembers(members);\n    }, []);",
    "        if (needsSave) {\n            saveTeamMembers(members).then(() => refreshData());\n        }\n        setMembers(members);\n    }, [contextMembers, refreshData]);"
);

// Replace 4: confirmImport
content = content.replace(
    "    const confirmImport = (mode: 'overwrite' | 'merge') => {",
    "    const confirmImport = async (mode: 'overwrite' | 'merge') => {"
);
content = content.replace(
    "            const existing = getTeamMembers();\n            const { merged, added, updated, unchanged } = mergeTeamMembers(existing, pendingImportMembers);",
    "            const existing = contextMembers;\n            const { merged, added, updated, unchanged } = mergeTeamMembers(existing, pendingImportMembers);"
);
content = content.replace(
    "        saveTeamMembers(finalMembers);\n        setMembers(finalMembers);\n\n        setImportToast(msg);\n        setTimeout(() => setImportToast(null), 5000);\n        onDataChange?.();",
    "        await saveTeamMembers(finalMembers);\n        refreshData();\n\n        setImportToast(msg);\n        setTimeout(() => setImportToast(null), 5000);\n        onDataChange?.();"
);

// Replace 5: handleDeleteMember
const oldDeleteMember = `    const handleDeleteMember = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (window.confirm('이 팀원을 삭제하시겠습니까?')) {
            deleteTeamMember(id);
            setMembers(getTeamMembers());
            onDataChange?.();
        }
    };`;
const newDeleteMember = `    const handleDeleteMember = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (window.confirm('이 팀원을 삭제하시겠습니까?')) {
            await deleteTeamMember(id);
            refreshData();
            onDataChange?.();
        }
    };`;
content = content.replace(oldDeleteMember, newDeleteMember);

// Replace 6: handleMemberUpdate
const oldMemberUpdate = `    const handleMemberUpdate = () => {
        setMembers(getTeamMembers());
        onDataChange?.();
    };`;
const newMemberUpdate = `    const handleMemberUpdate = () => {
        refreshData();
        onDataChange?.();
    };`;
content = content.replace(oldMemberUpdate, newMemberUpdate);

fs.writeFileSync(targetFile, content, 'utf8');
console.log('CRLF-safe Patch completed gracefully!');
