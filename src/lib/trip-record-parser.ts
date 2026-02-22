import { TripRecord } from './types';
import { normalizeDate } from './trip-parser';

export interface TripRecordParseResult {
    records: TripRecord[];
    errors: string[];
    maxColumns: number;
    headers?: string[]; // Detected headers
}

export function parseTripRecordText(text: string): TripRecordParseResult {
    const lines = text.split('\n').filter(line => line.trim());
    const records: TripRecord[] = [];
    const errors: string[] = [];
    let maxColumns = 0;
    const now = new Date().toISOString();

    let headers: string[] | undefined;
    const headerMap: Record<string, number> = {};

    lines.forEach((line, index) => {
        try {
            // Excel copy-paste (Tab separated)
            const parts = line.split('\t').map(p => p.trim());

            // Track max columns for dynamic table display
            if (parts.length > maxColumns) {
                maxColumns = parts.length;
            }

            // Header Detection (First line only)
            if (index === 0) {
                // Check if this looks like the header row provided by user
                // "Knox_ID", "이름", "출발", "도착" etc.
                const potentialHeaders = parts.map(p => p.toLowerCase().replace(/[\s_]/g, ''));
                if (potentialHeaders.includes('이름') || potentialHeaders.includes('knoxid') || potentialHeaders.includes('출발')) {
                    headers = parts;
                    // Build map: 'name' -> index
                    parts.forEach((h, i) => {
                        const key = h.toLowerCase().replace(/[\s_]/g, '');
                        if (key.includes('knox')) headerMap['knoxId'] = i;
                        else if (key === '이름') headerMap['name'] = i;
                        else if (key === '그룹') headerMap['group'] = i;
                        else if (key === '파트') headerMap['part'] = i;
                        else if (key === '출장지' || key === '국가' || key === '도시') headerMap['destination'] = i;
                        else if (key === '출발' || key.includes('start')) headerMap['startDate'] = i;
                        else if (key === '도착' || key.includes('end')) headerMap['endDate'] = i;
                        else if (key === '출장목적' || key === '목적') headerMap['purpose'] = i;
                    });
                    return; // Skip adding this line as a record
                }
            }

            // Always store raw data for exact display
            const rawData = parts;

            // Extract fields using Header Map if available, else Heuristic
            let knoxId = '';
            let name = '';
            let group = '';
            let part = '';
            let destination = '';
            let startDate = '';
            let endDate = '';
            let purpose = '';

            if (headers) {
                // Use Dynamic Mapping based on detected headers
                if (headerMap['knoxId'] !== undefined) knoxId = parts[headerMap['knoxId']] || '';
                if (headerMap['name'] !== undefined) name = parts[headerMap['name']] || '';
                if (headerMap['group'] !== undefined) group = parts[headerMap['group']] || '';
                if (headerMap['part'] !== undefined) part = parts[headerMap['part']] || '';
                if (headerMap['destination'] !== undefined) destination = parts[headerMap['destination']] || '';
                if (headerMap['startDate'] !== undefined) startDate = normalizeDate(parts[headerMap['startDate']] || '');
                if (headerMap['endDate'] !== undefined) endDate = normalizeDate(parts[headerMap['endDate']] || '');
                if (headerMap['purpose'] !== undefined) purpose = parts[headerMap['purpose']] || '';
            } else {
                // Fallback to Heuristic (Legacy 8 or 7 columns)
                if (parts.length >= 8) {
                    knoxId = parts[0];
                    name = parts[1];
                    group = parts[2];
                    part = parts[3];
                    destination = parts[4];
                    startDate = normalizeDate(parts[5]);
                    endDate = normalizeDate(parts[6]);
                    purpose = parts[7];
                } else if (parts.length === 7) {
                    // Assume missing KnoxId
                    name = parts[0];
                    group = parts[1];
                    part = parts[2];
                    destination = parts[3];
                    startDate = normalizeDate(parts[4]);
                    endDate = normalizeDate(parts[5]);
                    purpose = parts[6];
                } else {
                    // Not enough columns for full logic, but keep rawData
                    // Try to map what we can
                    if (parts.length > 0) name = parts[0];
                }
            }

            records.push({
                id: crypto.randomUUID(),
                knoxId,
                name,
                group,
                part,
                destination,
                startDate,
                endDate,
                purpose,
                rawData,
                createdAt: now,
                updatedAt: now
            });
        } catch (e) {
            errors.push(`Line ${index + 1}: Parse error`);
        }
    });

    return { records, errors, maxColumns, headers };
}
