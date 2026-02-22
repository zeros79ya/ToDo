import { BusinessTrip, TripRecord } from './types';

/**
 * 근태기반 trip의 이름과 출장현황 DB를 교차 참조하여 출장지 정보를 찾는 유틸리티.
 * 
 * 매칭 로직:
 * 1. trip.name으로 TripRecord에서 동일 이름 검색
 * 2. 날짜 겹침(overlap) 확인으로 후보 필터링
 * 3. 1건 → 자동 매칭, 2건+ → 동명이인 (사용자 선택 필요), 0건 → fallback
 */

export interface DestinationMatch {
    destination: string;
    recordId: string;
    knoxId: string;
    startDate: string;
    endDate: string;
    group: string;
    part: string;
    purpose: string;
}

export interface DestinationResult {
    /** 매칭된 출장지 (null이면 매칭 실패) */
    match: DestinationMatch | null;
    /** 동명이인으로 사용자 선택이 필요한 경우 */
    needsUserChoice: boolean;
    /** 동명이인 후보 목록 */
    candidates: DestinationMatch[];
}

/** 저장된 사용자 선택: tripId → recordId */
const DESTINATION_MAPPING_KEY = 'tripDestinationMappings';

export function getDestinationMappings(): Record<string, string> {
    if (typeof window === 'undefined') return {};
    const stored = localStorage.getItem(DESTINATION_MAPPING_KEY);
    return stored ? JSON.parse(stored) : {};
}

export function saveDestinationMapping(tripId: string, recordId: string) {
    const mappings = getDestinationMappings();
    mappings[tripId] = recordId;
    if (typeof window === 'undefined') return;
    localStorage.setItem(DESTINATION_MAPPING_KEY, JSON.stringify(mappings));
}

export function saveDestinationMappings(mappings: Record<string, string>) {
    if (typeof window === 'undefined') return;
    const existing = getDestinationMappings();
    const merged = { ...existing, ...mappings };
    localStorage.setItem(DESTINATION_MAPPING_KEY, JSON.stringify(merged));
}

/**
 * 두 날짜 구간이 겹치는지 확인
 */
function datesOverlap(startA: string, endA: string, startB: string, endB: string): boolean {
    const a0 = new Date(startA).getTime();
    const a1 = new Date(endA).getTime();
    const b0 = new Date(startB).getTime();
    const b1 = new Date(endB).getTime();
    return a0 <= b1 && a1 >= b0;
}

/**
 * 근태기반 trip에 대해 출장현황 DB에서 출장지 매칭
 */
export function resolveDestination(
    trip: BusinessTrip,
    tripRecords: TripRecord[],
    savedMappings: Record<string, string>
): DestinationResult {
    // 1. 저장된 매핑이 있으면 우선 사용
    const savedRecordId = savedMappings[trip.id];
    if (savedRecordId) {
        const savedRecord = tripRecords.find(r => r.id === savedRecordId);
        if (savedRecord && savedRecord.destination) {
            return {
                match: {
                    destination: savedRecord.destination,
                    recordId: savedRecord.id,
                    knoxId: savedRecord.knoxId || '',
                    startDate: savedRecord.startDate,
                    endDate: savedRecord.endDate,
                    group: savedRecord.group,
                    part: savedRecord.part,
                    purpose: savedRecord.purpose,
                },
                needsUserChoice: false,
                candidates: [],
            };
        }
    }

    // 2. 이름 + 날짜 겹침으로 후보 찾기
    const candidates: DestinationMatch[] = tripRecords
        .filter(r => {
            // 이름 매칭
            if (r.name !== trip.name) return false;
            // 날짜 겹침 확인 (둘 다 날짜 정보가 있는 경우)
            if (r.startDate && r.endDate && trip.startDate && trip.endDate) {
                return datesOverlap(trip.startDate, trip.endDate, r.startDate, r.endDate);
            }
            // 날짜 정보 없으면 이름만으로 매칭
            return true;
        })
        .filter(r => r.destination) // 출장지 정보가 있는 것만
        .map(r => ({
            destination: r.destination,
            recordId: r.id,
            knoxId: r.knoxId || '',
            startDate: r.startDate,
            endDate: r.endDate,
            group: r.group,
            part: r.part,
            purpose: r.purpose,
        }));

    if (candidates.length === 0) {
        return { match: null, needsUserChoice: false, candidates: [] };
    }

    if (candidates.length === 1) {
        return { match: candidates[0], needsUserChoice: false, candidates };
    }

    // 동명이인: 여러 후보 → 사용자 선택 필요
    return { match: null, needsUserChoice: true, candidates };
}

/**
 * 간트 바에 표시할 라벨 생성
 * 
 * 출장: 해외출장(SDV : 1/12 ~ 2/3) → 목적(출장지 : DB시작일 ~ DB종료일)
 * 연차/교육 (하루 이상): 연차(2/4 ~ 2/6), 사내교육(2/10 ~ 2/12)
 * 연차/교육 (하루): 원본 그대로 (연차, 사내교육)
 * 
 * - destination이 있으면 괄호 내용을 교체
 * - destination이 없으면 multi-day 체크 후 날짜 범위 표시
 */
export function buildDisplayLabel(
    purpose: string,
    match: DestinationMatch | null,
    tripStartDate?: string,
    tripEndDate?: string
): string {
    // 1. 출장지 매칭이 있으면 출장지 + DB 날짜 표시
    if (match && match.destination) {
        const dest = match.destination;
        const start = formatShortDate(match.startDate);
        const end = formatShortDate(match.endDate);

        // 괄호가 있는 패턴: "해외출장(생산법인)" → "해외출장(SDV : 1/12 ~ 2/3)"
        const parenMatch = purpose.match(/^(.+?)\(.*?\)$/);
        if (parenMatch) {
            return `${parenMatch[1]}(${dest} : ${start} ~ ${end})`;
        }

        // 괄호 없는 경우: "해외출장" → "해외출장(SDV : 1/12 ~ 2/3)"
        return `${purpose}(${dest} : ${start} ~ ${end})`;
    }

    // 2. 출장지 매칭 없지만 multi-day → 날짜 범위 표시
    if (tripStartDate && tripEndDate && tripStartDate !== tripEndDate) {
        const start = formatShortDate(tripStartDate);
        const end = formatShortDate(tripEndDate);

        // 이미 괄호가 있는 경우 교체
        const parenMatch = purpose.match(/^(.+?)\(.*?\)$/);
        if (parenMatch) {
            return `${parenMatch[1]}(${start} ~ ${end})`;
        }

        // 괄호 없는 경우 추가
        return `${purpose}(${start} ~ ${end})`;
    }

    // 3. 하루짜리이거나 날짜 정보 없으면 원본 그대로
    return purpose;
}

/**
 * YYYY-MM-DD → M/D 짧은 형식
 */
function formatShortDate(dateStr: string): string {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const month = parseInt(parts[1], 10);
    const day = parseInt(parts[2], 10);
    return `${month}/${day}`;
}

