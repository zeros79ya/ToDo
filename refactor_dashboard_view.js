const fs = require('fs');
const path = require('path');

const targetFile = path.join(__dirname, 'src', 'components', 'dashboard-view.tsx');
let content = fs.readFileSync(targetFile, 'utf8');
content = content.replace(/\r\n/g, '\n');

const oldImports = `import {
    getTasks, getCategories, getQuickLinks, getNotes, getTeamMembers, getBusinessTrips
} from '@/lib/storage';`;
const newImports = `import { useData } from '@/providers/data-provider';`;
content = content.replace(oldImports, newImports);


const oldInit = `    const [members, setMembers] = useState<TeamMember[]>([]);
    const [trips, setTrips] = useState<BusinessTrip[]>([]);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [notes, setNotes] = useState<Note[]>([]);
    const [quickLinks, setQuickLinks] = useState<QuickLink[]>([]);
    const [detailModal, setDetailModal] = useState<'trip' | 'vacation' | 'education' | null>(null);

    // Load all data
    useEffect(() => {
        setMembers(getTeamMembers().filter(m => m.status !== '퇴직'));
        setTrips(getBusinessTrips());
        setTasks(getTasks());
        setCategories(getCategories());
        setNotes(getNotes().filter(n => !n.isArchived).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
        const links = getQuickLinks();
        links.sort((a, b) => (a.isFavorite === b.isFavorite ? 0 : a.isFavorite ? -1 : 1));
        setQuickLinks(links);
    }, []);`;

const newInit = `    const { teamMembers, businessTrips, tasks: contextTasks, categories: contextCategories, notes: contextNotes, quickLinks: contextLinks } = useData();
    const [detailModal, setDetailModal] = useState<'trip' | 'vacation' | 'education' | null>(null);

    // Derived states
    const members = useMemo(() => teamMembers.filter(m => m.status !== '퇴직'), [teamMembers]);
    const trips = businessTrips;
    const tasks = contextTasks;
    const categories = contextCategories;
    
    const notes = useMemo(() => {
        return [...contextNotes]
            .filter(n => !n.isArchived)
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [contextNotes]);

    const quickLinks = useMemo(() => {
        const links = [...contextLinks];
        links.sort((a, b) => (a.isFavorite === b.isFavorite ? 0 : a.isFavorite ? -1 : 1));
        return links;
    }, [contextLinks]);`;
content = content.replace(oldInit, newInit);

fs.writeFileSync(targetFile, content, 'utf8');
console.log('dashboard-view.tsx patched');
