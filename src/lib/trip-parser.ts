import { BusinessTrip, TeamMember, TripCategory } from './types';

/**
 * Auto-classify trip category based on purpose text.
 * - education: 사외교육참석, 교육
 * - vacation: 연차, 시간연차, 장기근속휴가, 힐링휴가
 * - trip: everything else
 */
function classifyPurpose(purpose: string): TripCategory {
    const p = purpose.trim();

    // Vacation keywords (High priority)
    // "연차", "휴가" included -> Vacation
    if (/연차|휴가/.test(p)) {
        return 'vacation';
    }

    // Education keywords
    if (/교육/.test(p)) {
        return 'education';
    }

    // Others keywords
    if (/협력사|검진/.test(p)) {
        return 'others';
    }

    // Default: business trip
    return 'trip';
}

/**
 * Normalizes date strings to ISO format (YYYY-MM-DD).
 * Handles: "MM-DD", "YYYY.MM.DD", "YYYY-MM-DD"
 * Assumes current year if year is missing.
 */
export function normalizeDate(dateStr: string, baseDate: Date = new Date()): string {
    const cleanStr = dateStr.trim();
    const currentYear = baseDate.getFullYear();

    // MM-DD
    const mmddMatch = /^\d{1,2}[-.]\d{1,2}$/.test(cleanStr);
    if (mmddMatch) {
        const [month, day] = cleanStr.includes('-') ? cleanStr.split('-') : cleanStr.split('.');
        const m = parseInt(month, 10);
        const d = parseInt(day, 10);

        // Direct string formatting to avoid timezone issues (toISOString converts to UTC)
        return `${currentYear}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }

    // YYYY-MM-DD
    return cleanStr;
}

/**
 * Normalizes a date range, handling year-boundary crossings.
 * Example: "12-29 ~ 02-12" with baseDate 2026-02-11
 * → startDate = 2025-12-29, endDate = 2026-02-12
 * Logic: If startMonth > endMonth, startDate is in the previous year.
 */
function normalizeDateRange(startStr: string, endStr: string, baseDate: Date = new Date()): { startDate: string; endDate: string } {
    const currentYear = baseDate.getFullYear();

    const parseMonthDay = (s: string) => {
        const clean = s.trim();
        const parts = clean.includes('-') ? clean.split('-') : clean.split('.');
        return { month: parseInt(parts[0], 10), day: parseInt(parts[1], 10) };
    };

    const isShortDate = (s: string) => /^\d{1,2}[-.]\d{1,2}$/.test(s.trim());

    if (isShortDate(startStr) && isShortDate(endStr)) {
        const start = parseMonthDay(startStr);
        const end = parseMonthDay(endStr);

        let startYear = currentYear;
        const endYear = currentYear;

        // Year boundary: start month > end month (e.g., 12-29 ~ 02-12)
        if (start.month > end.month) {
            startYear = currentYear - 1;
        }

        // Direct string formatting to avoid timezone issues
        return {
            startDate: `${startYear}-${String(start.month).padStart(2, '0')}-${String(start.day).padStart(2, '0')}`,
            endDate: `${endYear}-${String(end.month).padStart(2, '0')}-${String(end.day).padStart(2, '0')}`,
        };
    }

    // Fallback: normalize individually
    return {
        startDate: normalizeDate(startStr, baseDate),
        endDate: normalizeDate(endStr, baseDate),
    };
}

/**
 * Parses business trip data from clipboard text.
 * Looks for patterns:
 * 1. Detailed blocks: "MM-DD ~ MM-DD\nName\nPurpose\n..."
 * 2. Daily summary lines: "Name / Purpose" (only if duration not found)
 */
export function parseTripText(text: string, existingMembers: TeamMember[]): { trips: BusinessTrip[], unknownNames: string[], ambiguousTrips: { trip: BusinessTrip, candidates: TeamMember[] }[] } {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l);
    const trips: BusinessTrip[] = [];
    const unknownNames: Set<string> = new Set();
    const now = new Date().toISOString();

    // Member lookup map: Name -> TeamMember[]
    // Handles duplicates by storing array of matches
    const memberMap = new Map<string, TeamMember[]>();
    for (const m of existingMembers) {
        const key = m.name.trim();
        if (!memberMap.has(key)) {
            memberMap.set(key, []);
        }
        memberMap.get(key)!.push(m);
    }

    // Identify "Detailed Blocks" based on date pattern: MM-DD ~ MM-DD or MM-DD
    // Look for an explicit year in the full text (e.g. from " 2026-02-01 ~ 2026-02-07 ")
    let baseDate = new Date();
    for (const line of lines) {
        const yearMatch = line.match(/(\d{4})-\d{2}-\d{2}/);
        if (yearMatch) {
            const parsedYear = parseInt(yearMatch[1], 10);
            baseDate.setFullYear(parsedYear);
            console.log(`[Parser] Found explicit year in text: ${parsedYear}`);
            break;
        }
    }

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Pattern: Date Range "MM-DD ~ MM-DD" or Single Date "MM-DD"
        const dateMatch = line.match(/^(\d{2}-\d{2})(?:\s*~\s*(\d{2}-\d{2}))?$/);
        if (dateMatch) {
            if (i + 2 < lines.length) {
                const startDateStr = dateMatch[1];
                const endDateStr = dateMatch[2] || dateMatch[1]; // If no end date, single day
                const name = lines[i + 1].trim();
                const purpose = lines[i + 2].trim();

                // Validate if next line looks like a name (not a date or "종일")
                const isName = !/^\d/.test(name) && name !== '종일' && name !== '반일';

                if (isName) {
                    // Use normalizeDateRange for year-boundary handling and pass baseDate
                    const { startDate, endDate } = normalizeDateRange(startDateStr, endDateStr, baseDate);

                    // Match KnoxID
                    let knoxId: string | undefined;
                    const candidates = memberMap.get(name);

                    if (candidates) {
                        if (candidates.length === 1) {
                            knoxId = candidates[0].knoxId;
                        } else {
                            knoxId = undefined; // Ambiguous
                        }
                    } else {
                        unknownNames.add(name);
                    }

                    trips.push({
                        id: crypto.randomUUID(),
                        knoxId,
                        name,
                        startDate,
                        endDate,
                        location: '해외',
                        purpose,
                        category: classifyPurpose(purpose),
                        status: 'planned',
                        createdAt: now,
                        updatedAt: now
                    });

                    // Skip the consumed lines
                    i += 2;
                    continue;
                }
            }
        }
    }

    // Deduplicate trips: same name + same start/end
    const uniqueTrips: BusinessTrip[] = [];
    const seen = new Set<string>();
    const uniqueAmbiguousTrips: { trip: BusinessTrip, candidates: TeamMember[] }[] = [];

    for (const trip of trips) {
        const key = `${trip.name}|${trip.startDate}|${trip.endDate}`;
        if (!seen.has(key)) {
            seen.add(key);
            uniqueTrips.push(trip);

            if (trip.knoxId === undefined) {
                const candidates = memberMap.get(trip.name);
                if (candidates && candidates.length > 1) {
                    uniqueAmbiguousTrips.push({ trip, candidates });
                }
            }
        }
    }

    return { trips: uniqueTrips, unknownNames: Array.from(unknownNames), ambiguousTrips: uniqueAmbiguousTrips };
}
