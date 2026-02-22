export interface Category {
    id: string;
    name: string;
    color: string; // hex color code like #3b82f6
    order: number;
    createdAt: string;
}

// Subtask for checklist within a task
export interface Subtask {
    id: string;
    title: string;
    completed: boolean;
    url?: string; // Optional URL attachment
}

export interface Task {
    id: string;
    categoryId: string;
    title: string;
    assignee: string;
    organizer?: string; // 주관자 (이름 / 소속)
    resourceUrl: string;
    resourceUrls?: string[]; // Multiple resource URLs
    notes: string;
    dueDate: string | null;
    dueTime: string | null; // HH:mm format like "14:30"
    tags: string[]; // Array of tag names
    completed: boolean;
    completedAt: string | null; // ISO date when task was completed
    order: number;
    createdAt: string;
    isPinned?: boolean;
    isFavorite?: boolean; // For favorites view
    highlightLevel?: 0 | 1 | 2 | 3; // 0=none, 1=Blue, 2=Green, 3=Purple
    subtasks?: Subtask[]; // Checklist items
    isCollectionTask?: boolean; // 취합 템플릿 적용 여부
    source?: 'team' | 'manual'; // 일정 출처: team=팀 일정 가져오기, manual=수동 추가 (팀 일정 가져오기 시 보호됨)
}

export interface AppData {
    categories: Category[];
    tasks: Task[];
    quickLinks?: QuickLink[];
}

// Predefined color palette for categories
export const CATEGORY_COLORS = [
    { name: '파랑', value: '#3b82f6' },
    { name: '초록', value: '#22c55e' },
    { name: '빨강', value: '#ef4444' },
    { name: '주황', value: '#f97316' },
    { name: '보라', value: '#a855f7' },
    { name: '분홍', value: '#ec4899' },
    { name: '청록', value: '#06b6d4' },
    { name: '노랑', value: '#eab308' },
];

// Quick Link for favorite files
export interface QuickLink {
    id: string;
    name: string;
    url: string;
    order: number;
    isPinned?: boolean;
    isFavorite?: boolean; // For favorites view
}

// Label (Tag) for notes
export interface Label {
    id: string;
    name: string;
}



// Note for Keep-style memos
export interface Note {
    id: string;
    title: string;
    content: string;
    color: string;
    isPinned: boolean;
    isArchived: boolean;
    order: number;
    createdAt: string;
    labels?: string[]; // Array of Label IDs
    isFavorite?: boolean; // For favorites view
}

// Predefined color palette for notes (Google Keep style)
export const NOTE_COLORS = [
    { name: '기본', value: '#ffffff' },
    { name: '노랑', value: '#fff475' },
    { name: '주황', value: '#fbbc04' },
    { name: '빨강', value: '#f28b82' },
    { name: '분홍', value: '#fdcfe8' },
    { name: '보라', value: '#d7aefb' },
    { name: '파랑', value: '#aecbfa' },
    { name: '청록', value: '#cbf0f8' },
    { name: '초록', value: '#ccff90' },
];

// Team Member for HR management
export interface TeamMember {
    id: string;
    knoxId: string;           // Knox_ID
    name: string;             // 이름
    employeeId: string;       // 사번
    department: string;       // 소속
    group: string;            // 그룹 (CP, OLB, LASER, 라미1, 라미2)
    part: string;             // 파트
    processType: string;      // 공정/설비
    position: string;         // 직급
    positionYear: number;     // 직급연차
    birthYear: number;        // 출생년도
    workLocation: string;     // 근무지
    status: string;           // 상태 (재직/휴직/퇴직)
    customFields: Record<string, string>; // 추가 컬럼 자동 수용
    createdAt: string;
    updatedAt: string;
}

export type TripCategory = 'trip' | 'vacation' | 'education' | 'others';

export interface BusinessTrip {
    id: string; // unique id (uuid)
    knoxId?: string; // Link to TeamMember if matched
    name: string; // Parsed name
    startDate: string; // ISO Date YYYY-MM-DD
    endDate: string; // ISO Date YYYY-MM-DD
    location: string;
    purpose: string; // e.g. "해외출장(생산법인)"
    category: TripCategory; // 출장/휴가/교육
    status: 'planned' | 'active' | 'completed';
    createdAt: string;
    updatedAt: string;
}

export interface TripParseResult {
    trips: BusinessTrip[];
    unknownNames: string[]; // Names that couldn't be auto-matched to a single member
}

// 출장현황 DB (수동 입력 데이터)
export interface TripRecord {
    id: string;
    knoxId?: string;       // Knox_ID (matched to TeamMember)
    name: string;          // 이름
    group: string;         // 그룹
    part: string;          // 파트
    destination: string;   // 출장지
    startDate: string;     // 출발 YYYY-MM-DD
    endDate: string;       // 도착 YYYY-MM-DD
    purpose: string;       // 출장목적
    rawData?: string[];    // 원본 데이터 배열 (Import 시 그대로 표시용)
    createdAt: string;
    updatedAt: string;
}
