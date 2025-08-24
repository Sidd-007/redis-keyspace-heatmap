import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { KeyMeta } from '@/lib/types';
import { AlertTriangle, Trash2 } from 'lucide-react';

interface DeleteConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    keyData: KeyMeta | null;
    isLoading?: boolean;
}

export function DeleteConfirmationModal({
    isOpen,
    onClose,
    onConfirm,
    keyData,
    isLoading = false,
}: DeleteConfirmationModalProps) {
    if (!keyData) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
                            <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" />
                        </div>
                        <DialogTitle>Delete Key</DialogTitle>
                    </div>
                    <DialogDescription>
                        This action cannot be undone. This will permanently delete the key from Redis.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    <div className="bg-muted/50 p-4 rounded-lg">
                        <div className="space-y-2">
                            <div className="flex justify-between">
                                <span className="text-sm font-medium">Key:</span>
                                <span className="text-sm font-mono text-muted-foreground">{keyData.key}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-sm font-medium">Type:</span>
                                <span className="text-sm capitalize">{keyData.type}</span>
                            </div>
                            {keyData.estBytes && (
                                <div className="flex justify-between">
                                    <span className="text-sm font-medium">Size:</span>
                                    <span className="text-sm">{keyData.estBytes} B</span>
                                </div>
                            )}
                            <div className="flex justify-between">
                                <span className="text-sm font-medium">TTL:</span>
                                <span className="text-sm">
                                    {keyData.ttlMs === null ? 'Persistent' : `${Math.round(keyData.ttlMs / 1000)}s`}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                        <div className="flex items-start gap-2">
                            <AlertTriangle className="w-4 h-4 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                            <div className="text-sm text-yellow-800 dark:text-yellow-200">
                                <p className="font-medium">Warning</p>
                                <p>This will permanently remove the key and all its data from Redis.</p>
                            </div>
                        </div>
                    </div>
                </div>

                <DialogFooter className="gap-2">
                    <Button variant="outline" onClick={onClose} disabled={isLoading}>
                        Cancel
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={onConfirm}
                        disabled={isLoading}
                        className="gap-2"
                    >
                        <Trash2 className="w-4 h-4" />
                        {isLoading ? 'Deleting...' : 'Delete Key'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
