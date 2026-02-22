'use client';

import React, { useEffect, useState } from 'react';
import { Users } from 'lucide-react';
import { TeamMember } from '@/lib/types';
import { useData } from '@/providers/data-provider';
import { TeamMemberStatusTable } from './team-member-status-table';

interface TeamMemberStatusViewProps {
    onBackToTeam?: () => void;
}

export function TeamMemberStatusView({ onBackToTeam }: TeamMemberStatusViewProps) {
    const { teamMembers: members } = useData();

    return (
        <div className="flex flex-col h-full bg-white dark:bg-gray-900">
            <div className="flex-shrink-0 border-b border-gray-200 dark:border-gray-700 p-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Users className="w-5 h-5 text-blue-500" />
                        <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200">팀원 현황</h2>
                        <span className="text-sm text-gray-500 dark:text-gray-400">({members.length}명)</span>
                    </div>
                    <button
                        onClick={() => onBackToTeam?.()}
                        className="px-3 py-1.5 text-xs rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
                    >
                        팀원 관리로 돌아가기
                    </button>
                </div>
            </div>
            <div className="flex-1 p-4 min-h-0">
                <TeamMemberStatusTable members={members} heightClassName="h-full" />
            </div>
        </div>
    );
}

