import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { BusinessTrip, TeamMember } from '@/lib/types';

interface TripHomonymResolverDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    ambiguousTrips: { trip: BusinessTrip, candidates: TeamMember[] }[];
    onResolve: (resolutions: Record<string, string>) => void;
}

export function TripHomonymResolverDialog({ open, onOpenChange, ambiguousTrips, onResolve }: TripHomonymResolverDialogProps) {
    const [resolutions, setResolutions] = useState<Record<string, string>>({});

    // Reset when open changes
    useEffect(() => {
        if (open) {
            setResolutions({});
        }
    }, [open]);

    const handleSelect = (tripId: string, knoxId: string) => {
        setResolutions(prev => ({ ...prev, [tripId]: knoxId }));
    };

    const handleConfirm = () => {
        onResolve(resolutions);
    };

    const isAllResolved = ambiguousTrips.every(t => resolutions[t.trip.id] !== undefined);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-xl max-h-[85vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>동명이인 일정 확인</DialogTitle>
                    <DialogDescription>
                        이름이 같은 팀원이 여러 명 발견되었습니다.
                        각 일정이 누구의 일정인지 올바른 소속을 선택해주세요.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto pr-2 space-y-4 py-4">
                    {ambiguousTrips.map(({ trip, candidates }) => (
                        <div key={trip.id} className="border rounded-md p-4 space-y-3 bg-gray-50 dark:bg-gray-800/50">
                            <div className="font-medium text-sm flex items-center justify-between border-b pb-2">
                                <div>
                                    <span className="text-blue-600 dark:text-blue-400 font-bold text-base">{trip.name}</span>
                                    <span className="text-gray-500 ml-2">({trip.startDate.substring(5)} ~ {trip.endDate.substring(5)})</span>
                                </div>
                                <span className="text-xs bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded-full">{trip.purpose}</span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {candidates.map(c => {
                                    const isSelected = resolutions[trip.id] === c.knoxId;
                                    return (
                                        <button
                                            key={c.knoxId}
                                            onClick={() => handleSelect(trip.id, c.knoxId!)}
                                            className={`text-left px-3 py-2 text-sm rounded-md border transition-colors ${isSelected
                                                ? 'bg-blue-50 border-blue-500 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-400 ring-1 ring-blue-500'
                                                : 'bg-white border-gray-200 hover:bg-gray-100 dark:bg-gray-800 dark:border-gray-700 dark:hover:bg-gray-700'}`}
                                        >
                                            <div className="font-semibold text-gray-800 dark:text-gray-200">{c.department}</div>
                                            <div className="text-gray-600 dark:text-gray-400 mt-0.5">{c.group} &gt; {c.part}</div>
                                            <div className="text-xs text-gray-500 mt-1">Knox: {c.knoxId} {c.positionYear ? `/ 연차: ${c.positionYear}` : ''}</div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>

                <DialogFooter className="pt-2">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>취소</Button>
                    <Button onClick={handleConfirm} disabled={!isAllResolved} className="min-w-[120px]">
                        확인 ({Object.keys(resolutions).length}/{ambiguousTrips.length})
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
