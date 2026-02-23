const fs = require('fs');
const path = require('path');

const targetFile = path.join(__dirname, 'src', 'components', 'calendar-view.tsx');
let content = fs.readFileSync(targetFile, 'utf8');

// Normalize newlines
content = content.replace(/\r\n/g, '\n');

// Replace imports
content = content.replace(
    "import { getBusinessTrips, getTeamMembers, getTripRecords } from '@/lib/storage';",
    "import { useData } from '@/providers/data-provider';"
);

// Add useData within component
content = content.replace(
    "    const [tripRecords, setTripRecords] = useState<TripRecord[]>([]);\n    const [attendanceModal, setAttendanceModal] = useState<'trip' | 'vacation' | 'education' | null>(null);\n    const [isTeamStatusModalOpen, setIsTeamStatusModalOpen] = useState(false);\n\n    // Load attendance data\n    useEffect(() => {\n        setMembers(getTeamMembers().filter(m => m.status !== '퇴직'));\n        setTrips(getBusinessTrips());\n        setTripRecords(getTripRecords());\n    }, []);",
    "    const [tripRecords, setTripRecords] = useState<TripRecord[]>([]);\n    const [attendanceModal, setAttendanceModal] = useState<'trip' | 'vacation' | 'education' | null>(null);\n    const [isTeamStatusModalOpen, setIsTeamStatusModalOpen] = useState(false);\n\n    const { teamMembers: contextMembers, businessTrips: contextTrips, tripRecords: contextTripRecords, updateTask } = useData();\n\n    // Load attendance data\n    useEffect(() => {\n        setMembers(contextMembers.filter(m => m.status !== '퇴직'));\n        setTrips(contextTrips);\n        setTripRecords(contextTripRecords);\n    }, [contextMembers, contextTrips, contextTripRecords]);"
);

// Fix async import storage issue down in the handleCtrlClickUrlPaste function
// The actual file has: `const { updateTask } = await import('@/lib/storage');`
content = content.replace(
    "            const { updateTask } = await import('@/lib/storage');",
    "            // (using updateTask from context)"
);

// We need to check if there are any other direct import('@/lib/storage')
content = content.replace(
    /await import\('@\/lib\/storage'\)/g,
    "({ updateTask })" // Just a hack to make the destructuring work if it was missed
);

fs.writeFileSync(targetFile, content, 'utf8');
console.log('calendar-view.tsx patched');
