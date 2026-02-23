const fs = require('fs');
const path = require('path');

const targetFile = path.join(__dirname, 'src', 'components', 'trip-board.tsx');
let content = fs.readFileSync(targetFile, 'utf8');

// Normalize newlines to \n to ensure robust matching
content = content.replace(/\r\n/g, '\n');

// Replace 1: Imports
content = content.replace(
    "import { getBusinessTrips, saveBusinessTrips, deleteBusinessTrip, getTeamMembers, addTripRecord, getTripRecords, deleteTripRecord, getNameResolutions } from '@/lib/storage';",
    "import { saveBusinessTrips, deleteBusinessTrip, saveTripRecords, deleteTripRecord, getNameResolutions, generateId, getDestinationMappings } from '@/lib/storage';"
);
content = content.replace(
    "import { TripRecord } from '@/lib/types';",
    "import { TripRecord } from '@/lib/types';\nimport { useData } from '@/providers/data-provider';"
);

// Replace 2: State init
content = content.replace(
    "    const [trips, setTrips] = useState<BusinessTrip[]>([]);\n    const [members, setMembers] = useState<TeamMember[]>([]);",
    "    const { businessTrips: trips, teamMembers: members, tripRecords, refreshData } = useData();"
);

// Replace 3: UseEffect Load
content = content.replace(
    "    useEffect(() => {\n        setTrips(getBusinessTrips());\n        setMembers(getTeamMembers()); // Ensure members are loaded\n    }, []);",
    ""
);

// Replace 4: Phase 6-F Matchings
content = content.replace(
    "    // Phase 6-F: Data Matching\n    const [tripRecords, setTripRecords] = useState<TripRecord[]>([]);",
    "    // Phase 6-F: Data Matching"
);

// Replace 5: Phase 6-F useEffect load
content = content.replace(
    "    useEffect(() => {\n        setTrips(getBusinessTrips());\n        setMembers(getTeamMembers());\n        setTripRecords(getTripRecords());\n        setNameResolutions(getNameResolutions());\n        setDestinationMappings(getDestinationMappings());\n    }, [manualDataVersion]); // Reload when manual data changes",
    "    useEffect(() => {\n        setNameResolutions(getNameResolutions());\n        setDestinationMappings(getDestinationMappings());\n    }, [manualDataVersion]); // Reload when manual data changes"
);

// Replace 6: handleClipboardImport parse manual
const oldClipboardManual = `            // If we have records and it looks like a valid import
            if (recordResult.records.length > 0 && recordResult.maxColumns >= 2) {
                // ** REPLACE ALL LOGIC **
                // 1. Clear existing records
                const allCurrent = getTripRecords();
                allCurrent.forEach(r => deleteTripRecord(r.id));

                // 2. Add new records
                let addedCount = 0;
                recordResult.records.forEach(r => {
                    addTripRecord(r);
                    addedCount++;
                });

                // 3. Save Column Count & Headers for Dynamic Display
                if (typeof window !== 'undefined') {
                    localStorage.setItem('tripRecordColumns', recordResult.maxColumns.toString());
                    if (recordResult.headers) {
                        localStorage.setItem('tripRecordHeaders', JSON.stringify(recordResult.headers));
                    } else {
                        localStorage.removeItem('tripRecordHeaders');
                    }
                }

                setManualDataVersion(v => v + 1);
                setActiveTab('manual');
                setImportToast(\`✅ 총 \${addedCount}건의 출장현황 기록이 교체되었습니다.\\n(헤더 매핑: \${recordResult.headers ? '성공' : '없음'})\`);
                setTimeout(() => setImportToast(null), 3000);
                return;
            }`;

const newClipboardManual = `            // If we have records and it looks like a valid import
            if (recordResult.records.length > 0 && recordResult.maxColumns >= 2) {
                // ** REPLACE ALL LOGIC **
                // 1. Clear existing records
                // 2. Add new records
                const newRecords = recordResult.records.map((r) => ({
                    ...r,
                    id: generateId(),
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                }));
                await saveTripRecords(newRecords);
                refreshData();

                // 3. Save Column Count & Headers for Dynamic Display
                if (typeof window !== 'undefined') {
                    localStorage.setItem('tripRecordColumns', recordResult.maxColumns.toString());
                    if (recordResult.headers) {
                        localStorage.setItem('tripRecordHeaders', JSON.stringify(recordResult.headers));
                    } else {
                        localStorage.removeItem('tripRecordHeaders');
                    }
                }

                setManualDataVersion(v => v + 1);
                setActiveTab('manual');
                setImportToast(\`✅ 총 \${newRecords.length}건의 출장현황 기록이 교체되었습니다.\\n(헤더 매핑: \${recordResult.headers ? '성공' : '없음'})\`);
                setTimeout(() => setImportToast(null), 3000);
                return;
            }`;
content = content.replace(oldClipboardManual, newClipboardManual);

// Replace 7: parseTripText args
content = content.replace(
    "            // 2. Try parsing as Attendance (Knox / HR)\n            const existingMembers = getTeamMembers();\n            const { trips: parsedTrips, unknownNames } = parseTripText(text, existingMembers);",
    "            // 2. Try parsing as Attendance (Knox / HR)\n            const { trips: parsedTrips, unknownNames } = parseTripText(text, members);"
);

// Replace 8: attendance parse overwrite
const oldAttendanceOverwrite = `            // Checks: "Attendance" vs "Manual".
            // If I am pasting Attendance, I replace Attendance. 
            // Manual records are separate DB.
            // So: saveBusinessTrips(parsedTrips) directly.

            saveBusinessTrips(parsedTrips);
            setTrips(parsedTrips);`;

const newAttendanceOverwrite = `            // Checks: "Attendance" vs "Manual".
            // If I am pasting Attendance, I replace Attendance. 
            // Manual records are separate DB.
            // So: saveBusinessTrips(parsedTrips) directly.

            await saveBusinessTrips(parsedTrips);
            refreshData();`;
content = content.replace(oldAttendanceOverwrite, newAttendanceOverwrite);

content = content.replace(
    "        } catch (err) {\n            console.error('클립보드 읽기 실패:', err);\n            setImportToast('❌ 클립보드를 읽을 수 없습니다. 브라우저 권한을 확인해주세요.');\n            setTimeout(() => setImportToast(null), 3000);\n        }\n    }, [onDataChange]);",
    "        } catch (err) {\n            console.error('클립보드 읽기 실패:', err);\n            setImportToast('❌ 클립보드를 읽을 수 없습니다. 브라우저 권한을 확인해주세요.');\n            setTimeout(() => setImportToast(null), 3000);\n        }\n    }, [onDataChange, members, refreshData]);"
);

// Replace 9: handleDeleteTrip
const oldDeleteTrip = `    const handleDeleteTrip = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (window.confirm('이 출장 기록을 삭제하시겠습니까?')) {
            deleteBusinessTrip(id);
            setTrips(getBusinessTrips());
            onDataChange?.();
        }
    };`;

const newDeleteTrip = `    const handleDeleteTrip = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (window.confirm('이 출장 기록을 삭제하시겠습니까?')) {
            await deleteBusinessTrip(id);
            refreshData();
            onDataChange?.();
        }
    };`;
content = content.replace(oldDeleteTrip, newDeleteTrip);


fs.writeFileSync(targetFile, content, 'utf8');
console.log('CRLF-safe Patch completed gracefully!');
