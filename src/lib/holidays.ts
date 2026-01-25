
import { format } from 'date-fns';

type HolidayMap = { [key: string]: string };

// Hardcoded Lunar and Substitute Holidays (2024-2030)
// Format: "MM-DD": "Holiday Name" (for solar) or "YYYY-MM-DD": "Holiday Name" (for specific dates)
const LUNAR_AND_SUBSTITUTE_HOLIDAYS: HolidayMap = {
    // 2024
    "2024-02-09": "설날 연휴",
    "2024-02-10": "설날",
    "2024-02-11": "설날 연휴",
    "2024-02-12": "대체공휴일(설날)",
    "2024-04-10": "제22대 국회의원 선거",
    "2024-05-06": "대체공휴일(어린이날)",
    "2024-05-15": "부처님 오신 날",
    "2024-09-16": "추석 연휴",
    "2024-09-17": "추석",
    "2024-09-18": "추석 연휴",

    // 2025
    "2025-01-28": "설날 연휴",
    "2025-01-29": "설날",
    "2025-01-30": "설날 연휴",
    "2025-03-03": "대체공휴일(삼일절)",
    "2025-05-05": "어린이날",
    "2025-05-06": "부처님 오신 날/대체공휴일",
    "2025-10-03": "개천절",
    "2025-10-05": "추석 연휴",
    "2025-10-06": "추석",
    "2025-10-07": "추석 연휴",
    "2025-10-08": "대체공휴일(추석)",

    // 2026
    "2026-02-16": "설날 연휴",
    "2026-02-17": "설날",
    "2026-02-18": "설날 연휴",
    "2026-03-02": "대체공휴일(삼일절)",
    "2026-05-24": "부처님 오신 날",
    "2026-05-25": "대체공휴일(부처님오신날)",
    "2026-08-17": "대체공휴일(광복절)",
    "2026-09-24": "추석 연휴",
    "2026-09-25": "추석",
    "2026-09-26": "추석 연휴",
    "2026-10-05": "대체공휴일(개천절)",

    // 2027
    "2027-02-06": "설날 연휴",
    "2027-02-07": "설날",
    "2027-02-08": "설날 연휴",
    "2027-02-09": "대체공휴일(설날)",
    "2027-05-13": "부처님 오신 날",
    "2027-08-16": "대체공휴일(광복절)",
    "2027-09-14": "추석 연휴",
    "2027-09-15": "추석",
    "2027-09-16": "추석 연휴",
    "2027-10-04": "대체공휴일(개천절)",
    "2027-10-11": "대체공휴일(한글날)",

    // 2028 (Sample)
    "2028-01-26": "설날 연휴",
    "2028-01-27": "설날",
    "2028-01-28": "설날 연휴",
    "2028-05-02": "부처님 오신 날",
    "2028-10-02": "추석 연휴",
    "2028-10-03": "추석", // 개천절 겹침
    "2028-10-04": "추석 연휴",
    "2028-10-05": "대체공휴일",

};

const SOLAR_HOLIDAYS: HolidayMap = {
    "01-01": "신정",
    "03-01": "삼일절",
    "05-05": "어린이날",
    "06-06": "현충일",
    "08-15": "광복절",
    "10-03": "개천절",
    "10-09": "한글날",
    "12-25": "성탄절"
};

export function getHoliday(date: Date): string | null {
    const year = date.getFullYear();
    const mmdd = format(date, 'MM-dd');
    const yyyymmdd = format(date, 'yyyy-MM-dd');

    // 1. Check fixed Solar holidays
    if (SOLAR_HOLIDAYS[mmdd]) {
        // Special case: If a solar holiday overlaps with a specific substitute holiday entry, prefer the specific entry? 
        // Actually solar names are usually preferred unless it involves substitution.
        // But some Solar holidays (Childrens, etc) have substitute rules which are handled in the specific map for those years.

        // However, if the date is in LUNAR_AND_SUBSTITUTE_HOLIDAYS, that usually contains the more 'override' info (like Substitute)
        // or concurrent events.

        // If it exists in both, usually it's the same day. 
        // Let's check LUNAR map first because it tracks "Substitute Holiday" which might be relevant.
        // Actually, let's return the Solar name unless there is a specific override.
        return SOLAR_HOLIDAYS[mmdd];
    }

    // 2. Check specific Lunar/Substitute holidays
    if (LUNAR_AND_SUBSTITUTE_HOLIDAYS[yyyymmdd]) {
        return LUNAR_AND_SUBSTITUTE_HOLIDAYS[yyyymmdd];
    }

    return null;
}
