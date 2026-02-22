'use client';

import { TeamMember } from './types';

// Known header-to-field mapping (Korean header → TeamMember field)
const HEADER_MAP: Record<string, keyof TeamMember> = {
    'Knox_ID': 'knoxId',
    'knox_id': 'knoxId',
    'KNOX_ID': 'knoxId',
    '이름': 'name',
    '사번': 'employeeId',
    '소속': 'department',
    '그룹': 'group',
    '공정': 'group',  // 하위 호환: 기존 '공정' 헤더도 group으로 매핑
    '파트': 'part',
    '공정/설비': 'processType',
    '직급': 'position',
    '직급연차': 'positionYear',
    '출생년도': 'birthYear',
    '근무지': 'workLocation',
};

// Fields that should be stored as numbers
const NUMBER_FIELDS = new Set<string>(['positionYear', 'birthYear']);

export interface ParseResult {
    members: TeamMember[];
    headers: string[];
    customHeaders: string[];  // Headers not in HEADER_MAP
    totalRows: number;
    parsedRows: number;
    skippedRows: number;
}

/**
 * Parse tab-delimited HR text from clipboard (Ctrl+A → Ctrl+C)
 * Dynamically maps headers to TeamMember fields. Unknown headers → customFields.
 */
export function parseHRText(text: string): ParseResult {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

    if (lines.length < 2) {
        return { members: [], headers: [], customHeaders: [], totalRows: 0, parsedRows: 0, skippedRows: 0 };
    }

    // First line = headers
    const headers = lines[0].split('\t').map(h => h.trim());

    // Identify which headers map to known fields vs custom
    const headerMapping: { index: number; field: keyof TeamMember | null; header: string }[] = headers.map((h, i) => ({
        index: i,
        field: HEADER_MAP[h] || null,
        header: h,
    }));

    const customHeaders = headerMapping.filter(m => m.field === null).map(m => m.header);

    const members: TeamMember[] = [];
    let skippedRows = 0;

    for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split('\t').map(c => c.trim());

        // Skip rows with too few columns
        if (cols.length < 2) {
            skippedRows++;
            continue;
        }

        const now = new Date().toISOString();
        const member: TeamMember = {
            id: '',
            knoxId: '',
            name: '',
            employeeId: '',
            department: '',
            group: '',
            part: '',
            processType: '',
            position: '',
            positionYear: 0,
            birthYear: 0,
            workLocation: '',
            status: '재직',
            customFields: {},
            createdAt: now,
            updatedAt: now,
        };

        headerMapping.forEach(({ index, field, header }) => {
            const value = cols[index] || '';
            if (field) {
                if (NUMBER_FIELDS.has(field)) {
                    (member as any)[field] = parseInt(value) || 0;
                } else {
                    (member as any)[field] = value;
                }
            } else if (header && value) {
                member.customFields[header] = value;
            }
        });

        // Detect status from department
        if (member.department.includes('휴직')) {
            member.status = '휴직';
        } else if (member.department.includes('퇴직')) {
            member.status = '퇴직';
        } else if (member.department.includes('주재원')) {
            member.status = '주재원';
        }

        // Generate ID from knoxId (unique across all systems)
        member.id = member.knoxId || member.employeeId || `member-${i}`;

        if (member.name) {
            members.push(member);
        } else {
            skippedRows++;
        }
    }

    return {
        members,
        headers,
        customHeaders,
        totalRows: lines.length - 1,
        parsedRows: members.length,
        skippedRows,
    };
}

/**
 * Merge parsed members with existing members.
 * Uses knoxId as the unique key for matching (absolute unique identifier).
 * - Existing member found → update fields (keep manually edited data)
 * - New member → add
 */
export function mergeTeamMembers(existing: TeamMember[], parsed: TeamMember[]): {
    merged: TeamMember[];
    added: number;
    updated: number;
    unchanged: number;
} {
    const existingMap = new Map(existing.map(m => [m.knoxId, m]));
    const merged: TeamMember[] = [];
    let added = 0;
    let updated = 0;
    let unchanged = 0;

    for (const parsedMember of parsed) {
        const existingMember = existingMap.get(parsedMember.knoxId);
        if (existingMember) {
            // Update: keep existing ID and timestamps, update other fields
            const updatedMember: TeamMember = {
                ...existingMember,
                knoxId: parsedMember.knoxId || existingMember.knoxId,
                name: parsedMember.name || existingMember.name,
                department: parsedMember.department || existingMember.department,
                group: parsedMember.group || existingMember.group,
                part: parsedMember.part || existingMember.part,
                processType: parsedMember.processType || existingMember.processType,
                position: parsedMember.position || existingMember.position,
                positionYear: parsedMember.positionYear || existingMember.positionYear,
                birthYear: parsedMember.birthYear || existingMember.birthYear,
                workLocation: parsedMember.workLocation || existingMember.workLocation,
                status: parsedMember.status,
                customFields: { ...existingMember.customFields, ...parsedMember.customFields },
                updatedAt: new Date().toISOString(),
            };
            merged.push(updatedMember);
            existingMap.delete(parsedMember.knoxId);
            updated++;
        } else {
            merged.push(parsedMember);
            added++;
        }
    }

    // Keep existing members that weren't in the parsed data
    for (const remaining of existingMap.values()) {
        merged.push(remaining);
        unchanged++;
    }

    return { merged, added, updated, unchanged };
}
