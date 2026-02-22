"use client";

import React, { useRef } from 'react';
import { exportData, importData } from '@/lib/storage';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';
import { Download, Upload, AlertCircle, CheckCircle } from 'lucide-react';

interface ImportExportDialogProps {
    type: 'export' | 'import' | null;
    onClose: () => void;
    onDataChange: () => void;
}

export function ImportExportDialog({
    type,
    onClose,
    onDataChange,
}: ImportExportDialogProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [importStatus, setImportStatus] = React.useState<'idle' | 'success' | 'error'>('idle');
    const [errorMessage, setErrorMessage] = React.useState('');

    const handleExport = async () => {
        const data = await exportData();
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `local-tasks-backup-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        onClose();
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const text = await file.text();
            const success = await importData(text);
            if (success) {
                setImportStatus('success');
                onDataChange();
                setTimeout(() => {
                    onClose();
                    setImportStatus('idle');
                }, 1500);
            } else {
                setImportStatus('error');
                setErrorMessage('잘못된 데이터 형식입니다.');
            }
        } catch (error) {
            setImportStatus('error');
            setErrorMessage('파일을 읽는 중 오류가 발생했습니다.');
        }
    };

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    if (!type) return null;

    return (
        <Dialog open={!!type} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>
                        {type === 'export' ? '데이터 내보내기' : '데이터 가져오기'}
                    </DialogTitle>
                    <DialogDescription>
                        {type === 'export'
                            ? '모든 할 일 데이터를 JSON 파일로 저장합니다.'
                            : '이전에 내보낸 JSON 파일에서 데이터를 복원합니다.'}
                    </DialogDescription>
                </DialogHeader>

                {type === 'export' ? (
                    <div className="py-4">
                        <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg text-blue-700">
                            <Download className="w-6 h-6" />
                            <div>
                                <p className="font-medium">백업 파일 다운로드</p>
                                <p className="text-sm text-blue-600">
                                    현재 저장된 모든 리스트와 할 일이 포함됩니다.
                                </p>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="py-4">
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".json"
                            onChange={handleFileSelect}
                            className="hidden"
                        />

                        {importStatus === 'idle' && (
                            <div
                                onClick={handleImportClick}
                                className="flex flex-col items-center gap-3 p-8 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
                            >
                                <Upload className="w-8 h-8 text-gray-400" />
                                <div className="text-center">
                                    <p className="font-medium text-gray-700">JSON 파일 선택</p>
                                    <p className="text-sm text-gray-500">
                                        클릭하여 백업 파일을 선택하세요
                                    </p>
                                </div>
                            </div>
                        )}

                        {importStatus === 'success' && (
                            <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg text-green-700">
                                <CheckCircle className="w-6 h-6" />
                                <div>
                                    <p className="font-medium">가져오기 완료!</p>
                                    <p className="text-sm text-green-600">데이터가 성공적으로 복원되었습니다.</p>
                                </div>
                            </div>
                        )}

                        {importStatus === 'error' && (
                            <div className="flex items-center gap-3 p-4 bg-red-50 rounded-lg text-red-700">
                                <AlertCircle className="w-6 h-6" />
                                <div>
                                    <p className="font-medium">가져오기 실패</p>
                                    <p className="text-sm text-red-600">{errorMessage}</p>
                                </div>
                            </div>
                        )}

                        {importStatus === 'error' && (
                            <div className="mt-4">
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        setImportStatus('idle');
                                        setErrorMessage('');
                                    }}
                                >
                                    다시 시도
                                </Button>
                            </div>
                        )}
                    </div>
                )}

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>
                        {type === 'export' ? '취소' : '닫기'}
                    </Button>
                    {type === 'export' && (
                        <Button onClick={handleExport}>
                            <Download className="w-4 h-4 mr-2" />
                            다운로드
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
