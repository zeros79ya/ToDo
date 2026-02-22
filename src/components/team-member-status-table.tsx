'use client';

import React, { useMemo, useState } from 'react';
import { TeamMember } from '@/lib/types';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

type GradeKey = 'CL4' | 'CL3' | 'CL2' | 'CL1';
const GRADES: GradeKey[] = ['CL4', 'CL3', 'CL2', 'CL1'];

type Bucket = Record<GradeKey, TeamMember[]> & { total: TeamMember[] };

type DetailState = {
    open: boolean;
    members: TeamMember[];
    title: string;
};

interface TeamMemberStatusTableProps {
    members: TeamMember[];
    heightClassName?: string;
}

function createBucket(): Bucket {
    return { CL4: [], CL3: [], CL2: [], CL1: [], total: [] };
}

function normalizeGrade(position: string): GradeKey | null {
    const raw = (position || '').toUpperCase().trim();
    if (raw.includes('CL4')) return 'CL4';
    if (raw.includes('CL3')) return 'CL3';
    if (raw.includes('CL2')) return 'CL2';
    if (raw.includes('CL1')) return 'CL1';
    return null;
}

function mergeBuckets(target: Bucket, source: Bucket) {
    GRADES.forEach(g => {
        target[g].push(...source[g]);
    });
    target.total.push(...source.total);
}

function sortMembers(items: TeamMember[]) {
    return [...items].sort((a, b) => {
        const d = a.department.localeCompare(b.department, 'ko');
        if (d !== 0) return d;
        const g = a.group.localeCompare(b.group, 'ko');
        if (g !== 0) return g;
        const p = a.part.localeCompare(b.part, 'ko');
        if (p !== 0) return p;
        return a.name.localeCompare(b.name, 'ko');
    });
}

export function TeamMemberStatusTable({ members, heightClassName = 'h-[65vh]' }: TeamMemberStatusTableProps) {
    const [detail, setDetail] = useState<DetailState>({
        open: false,
        members: [],
        title: '',
    });

    const { rows, grandTotal } = useMemo(() => {
        const source = members.filter(m => !!m.name);

        const byDept = new Map<string, Map<string, Map<string, Bucket>>>();
        source.forEach(member => {
            const dept = member.department || '-';
            const group = member.group || '-';
            const part = member.part || '-';
            const grade = normalizeGrade(member.position);

            if (!byDept.has(dept)) byDept.set(dept, new Map());
            const byGroup = byDept.get(dept)!;
            if (!byGroup.has(group)) byGroup.set(group, new Map());
            const byPart = byGroup.get(group)!;
            if (!byPart.has(part)) byPart.set(part, createBucket());

            const bucket = byPart.get(part)!;
            if (grade) bucket[grade].push(member);
            bucket.total.push(member);
        });

        const builtRows: Array<{
            rowType: 'part' | 'group-summary' | 'dept-summary' | 'grand-total';
            department: string;
            group: string;
            part: string;
            bucket: Bucket;
            label: string;
        }> = [];

        const grand = createBucket();
        const deptNames = [...byDept.keys()].sort((a, b) => a.localeCompare(b, 'ko'));
        deptNames.forEach(dept => {
            const byGroup = byDept.get(dept)!;
            const deptBucket = createBucket();
            const groupNames = [...byGroup.keys()].sort((a, b) => a.localeCompare(b, 'ko'));

            groupNames.forEach(group => {
                const byPart = byGroup.get(group)!;
                const groupBucket = createBucket();
                const partNames = [...byPart.keys()].sort((a, b) => a.localeCompare(b, 'ko'));

                partNames.forEach(part => {
                    const partBucket = byPart.get(part)!;
                    builtRows.push({
                        rowType: 'part',
                        department: dept,
                        group,
                        part,
                        bucket: partBucket,
                        label: part,
                    });
                    mergeBuckets(groupBucket, partBucket);
                });

                builtRows.push({
                    rowType: 'group-summary',
                    department: dept,
                    group,
                    part: '',
                    bucket: groupBucket,
                    label: `${group} 요약`,
                });
                mergeBuckets(deptBucket, groupBucket);
            });

            builtRows.push({
                rowType: 'dept-summary',
                department: dept,
                group: '',
                part: '',
                bucket: deptBucket,
                label: `${dept} 요약`,
            });
            mergeBuckets(grand, deptBucket);
        });

        builtRows.push({
            rowType: 'grand-total',
            department: '',
            group: '',
            part: '',
            bucket: grand,
            label: '총합계',
        });

        return { rows: builtRows, grandTotal: grand.total.length };
    }, [members]);

    const openDetail = (title: string, cellMembers: TeamMember[]) => {
        if (cellMembers.length === 0) return;
        setDetail({
            open: true,
            title,
            members: sortMembers(cellMembers),
        });
    };

    let prevDept = '';
    let prevGroup = '';

    return (
        <>
            <div className={`border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-gray-900 ${heightClassName}`}>
                <div className="overflow-auto h-full">
                    <table className="w-full text-xs">
                        <thead className="sticky top-0 z-10 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                            <tr>
                                <th className="px-3 py-2 text-left font-semibold text-gray-600 dark:text-gray-300">소속</th>
                                <th className="px-3 py-2 text-left font-semibold text-gray-600 dark:text-gray-300">그룹</th>
                                <th className="px-3 py-2 text-left font-semibold text-gray-600 dark:text-gray-300">파트</th>
                                <th className="px-3 py-2 text-center font-semibold text-gray-600 dark:text-gray-300">CL4</th>
                                <th className="px-3 py-2 text-center font-semibold text-gray-600 dark:text-gray-300">CL3</th>
                                <th className="px-3 py-2 text-center font-semibold text-gray-600 dark:text-gray-300">CL2</th>
                                <th className="px-3 py-2 text-center font-semibold text-gray-600 dark:text-gray-300">CL1</th>
                                <th className="px-3 py-2 text-center font-semibold text-gray-600 dark:text-gray-300">총합계</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((row, idx) => {
                                const isSummary = row.rowType !== 'part';
                                const isDeptSummary = row.rowType === 'dept-summary';
                                const isGrand = row.rowType === 'grand-total';

                                const showDept = row.rowType === 'part'
                                    ? row.department !== prevDept
                                    : row.rowType === 'dept-summary';
                                const showGroup = row.rowType === 'part'
                                    ? (row.department !== prevDept || row.group !== prevGroup)
                                    : row.rowType === 'group-summary';

                                const deptCell = row.rowType === 'dept-summary'
                                    ? row.label
                                    : (row.rowType === 'grand-total' ? '총합계' : (showDept ? row.department : ''));
                                const groupCell = row.rowType === 'group-summary'
                                    ? row.label
                                    : (row.rowType === 'part' ? (showGroup ? row.group : '') : '');
                                const partCell = row.rowType === 'part' ? row.part : '';

                                if (row.rowType === 'part') {
                                    prevDept = row.department;
                                    prevGroup = row.group;
                                } else if (row.rowType === 'dept-summary') {
                                    prevGroup = '';
                                }

                                const cellCls = isSummary
                                    ? 'bg-gray-50 dark:bg-gray-800/70 font-semibold'
                                    : 'bg-white dark:bg-gray-900';
                                const textCls = isGrand
                                    ? 'text-blue-700 dark:text-blue-300 font-bold'
                                    : (isDeptSummary ? 'text-gray-800 dark:text-gray-100' : 'text-gray-700 dark:text-gray-300');

                                return (
                                    <tr key={`${row.rowType}-${row.department}-${row.group}-${row.part}-${idx}`} className={`border-b border-gray-100 dark:border-gray-800 ${cellCls} ${textCls}`}>
                                        <td className="px-3 py-1.5 whitespace-nowrap">{deptCell}</td>
                                        <td className="px-3 py-1.5 whitespace-nowrap">{groupCell}</td>
                                        <td className="px-3 py-1.5 whitespace-nowrap">{partCell}</td>
                                        {GRADES.map(grade => (
                                            <td key={grade} className="px-2 py-1.5 text-center">
                                                {row.bucket[grade].length > 0 ? (
                                                    <button
                                                        onClick={() => openDetail(`${row.label || row.part || row.group || row.department} · ${grade}`, row.bucket[grade])}
                                                        className="px-1.5 py-0.5 rounded hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-semibold"
                                                    >
                                                        {row.bucket[grade].length}
                                                    </button>
                                                ) : (
                                                    <span className="text-gray-300 dark:text-gray-600">0</span>
                                                )}
                                            </td>
                                        ))}
                                        <td className="px-2 py-1.5 text-center">
                                            {row.bucket.total.length > 0 ? (
                                                <button
                                                    onClick={() => openDetail(`${row.label || row.part || row.group || row.department} · 총합계`, row.bucket.total)}
                                                    className="px-1.5 py-0.5 rounded hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-semibold"
                                                >
                                                    {row.bucket.total.length}
                                                </button>
                                            ) : (
                                                <span className="text-gray-300 dark:text-gray-600">0</span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            <Dialog open={detail.open} onOpenChange={(open) => setDetail(prev => ({ ...prev, open }))}>
                <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden">
                    <DialogHeader>
                        <DialogTitle>{detail.title} ({detail.members.length}명)</DialogTitle>
                    </DialogHeader>
                    <div className="border border-gray-200 dark:border-gray-700 rounded-md overflow-auto max-h-[65vh]">
                        <table className="w-full text-xs">
                            <thead className="sticky top-0 z-10 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                                <tr>
                                    <th className="px-2 py-2 text-left">이름</th>
                                    <th className="px-2 py-2 text-left">소속</th>
                                    <th className="px-2 py-2 text-left">그룹</th>
                                    <th className="px-2 py-2 text-left">파트</th>
                                    <th className="px-2 py-2 text-left">직급</th>
                                    <th className="px-2 py-2 text-left">Knox ID</th>
                                    <th className="px-2 py-2 text-left">상태</th>
                                </tr>
                            </thead>
                            <tbody>
                                {detail.members.map((m) => (
                                    <tr key={m.knoxId || m.id} className="border-b border-gray-100 dark:border-gray-800">
                                        <td className="px-2 py-1.5 font-medium">{m.name}</td>
                                        <td className="px-2 py-1.5">{m.department}</td>
                                        <td className="px-2 py-1.5">{m.group}</td>
                                        <td className="px-2 py-1.5">{m.part}</td>
                                        <td className="px-2 py-1.5">{m.position}</td>
                                        <td className="px-2 py-1.5 font-mono text-[11px]">{m.knoxId}</td>
                                        <td className="px-2 py-1.5">{m.status}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}

