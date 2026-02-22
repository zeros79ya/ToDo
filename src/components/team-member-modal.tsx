'use client';

import React, { useState } from 'react';
import { TeamMember } from '@/lib/types';
import { updateTeamMember } from '@/lib/storage';
import {
    X,
    User,
    Building2,
    Briefcase,
    MapPin,
    Calendar,
    Hash,
    AtSign,
    Save,
    Edit2,
} from 'lucide-react';

interface TeamMemberModalProps {
    member: TeamMember;
    isOpen: boolean;
    onClose: () => void;
    onUpdate: () => void;
}

export function TeamMemberModal({ member, isOpen, onClose, onUpdate }: TeamMemberModalProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [editData, setEditData] = useState<TeamMember>(member);

    if (!isOpen) return null;

    const handleSave = () => {
        updateTeamMember(member.id, editData);
        setIsEditing(false);
        onUpdate();
        onClose();
    };

    const handleCancel = () => {
        setEditData(member);
        setIsEditing(false);
    };

    const InfoRow = ({ icon: Icon, label, value, field }: { icon: any; label: string; value: string | number; field?: keyof TeamMember }) => (
        <div className="flex items-start gap-3 py-2.5 border-b border-gray-100 dark:border-gray-700 last:border-0">
            <Icon className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
                {isEditing && field ? (
                    <input
                        type={typeof value === 'number' ? 'number' : 'text'}
                        value={editData[field] as string | number}
                        onChange={e => setEditData({ ...editData, [field]: typeof value === 'number' ? parseInt(e.target.value) || 0 : e.target.value })}
                        className="w-full mt-0.5 px-2 py-1 text-sm border border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
                    />
                ) : (
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{value || '-'}</p>
                )}
            </div>
        </div>
    );

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
            <div
                className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-[480px] max-h-[80vh] overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-500 to-blue-600">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-white text-xl font-bold">
                            {member.name.charAt(0)}
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-white">{member.name}</h3>
                            <p className="text-sm text-blue-100">{member.position} · {member.department}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-1">
                        {!isEditing ? (
                            <button
                                onClick={() => setIsEditing(true)}
                                className="p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-lg transition-colors"
                            >
                                <Edit2 className="w-4 h-4" />
                            </button>
                        ) : (
                            <button
                                onClick={handleSave}
                                className="p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-lg transition-colors"
                            >
                                <Save className="w-4 h-4" />
                            </button>
                        )}
                        <button
                            onClick={onClose}
                            className="p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-lg transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className="p-5 overflow-y-auto max-h-[60vh]">
                    <div className="space-y-0">
                        <InfoRow icon={AtSign} label="Knox ID" value={member.knoxId} field="knoxId" />
                        <InfoRow icon={Hash} label="사번" value={member.employeeId} field="employeeId" />
                        <InfoRow icon={Building2} label="소속" value={member.department} field="department" />
                        <InfoRow icon={Briefcase} label="그룹" value={member.group} field="group" />
                        <InfoRow icon={Briefcase} label="파트" value={member.part} field="part" />
                        <InfoRow icon={Briefcase} label="공정/설비" value={member.processType} field="processType" />
                        <InfoRow icon={User} label="직급" value={member.position} field="position" />
                        <InfoRow icon={Calendar} label="직급연차" value={member.positionYear} field="positionYear" />
                        <InfoRow icon={Calendar} label="출생년도" value={member.birthYear} field="birthYear" />
                        <InfoRow icon={MapPin} label="근무지" value={member.workLocation} field="workLocation" />
                        <InfoRow icon={User} label="상태" value={member.status} field="status" />
                    </div>

                    {/* Custom Fields */}
                    {Object.keys(member.customFields || {}).length > 0 && (
                        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">추가 정보</p>
                            {Object.entries(member.customFields).map(([key, value]) => (
                                <div key={key} className="flex items-start gap-3 py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
                                    <Hash className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                                    <div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">{key}</p>
                                        <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{value}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Edit mode buttons */}
                    {isEditing && (
                        <div className="flex gap-2 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                            <button
                                onClick={handleSave}
                                className="flex-1 py-2 text-sm font-medium text-white bg-blue-500 rounded-lg hover:bg-blue-600"
                            >
                                저장
                            </button>
                            <button
                                onClick={handleCancel}
                                className="flex-1 py-2 text-sm text-gray-600 bg-gray-200 rounded-lg hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300"
                            >
                                취소
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
