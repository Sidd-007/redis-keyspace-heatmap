import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { KeyMeta } from '@/lib/types';
import { Clock, X } from 'lucide-react';
import { useState } from 'react';

interface TTLModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (ttlSeconds: number) => void;
    keyData: KeyMeta | null;
    isLoading?: boolean;
}

const TTL_PRESETS = [
    { label: '30 seconds', value: 30 },
    { label: '1 minute', value: 60 },
    { label: '5 minutes', value: 300 },
    { label: '30 minutes', value: 1800 },
    { label: '1 hour', value: 3600 },
    { label: '6 hours', value: 21600 },
    { label: '1 day', value: 86400 },
    { label: '1 week', value: 604800 },
    { label: '1 month', value: 2592000 },
];

export function TTLModal({
    isOpen,
    onClose,
    onConfirm,
    keyData,
    isLoading = false,
}: TTLModalProps) {
    const [ttlValue, setTtlValue] = useState<string>('');
    const [ttlUnit, setTtlUnit] = useState<'seconds' | 'minutes' | 'hours' | 'days'>('seconds');

    if (!keyData) return null;

    const handlePresetSelect = (value: string) => {
        const preset = TTL_PRESETS.find(p => p.value.toString() === value);
        if (preset) {
            setTtlValue(preset.value.toString());
            setTtlUnit('seconds');
        }
    };

    const handleConfirm = () => {
        const ttlNum = parseInt(ttlValue);
        if (isNaN(ttlNum) || ttlNum < 0) return;

        let ttlSeconds = ttlNum;
        switch (ttlUnit) {
            case 'minutes':
                ttlSeconds = ttlNum * 60;
                break;
            case 'hours':
                ttlSeconds = ttlNum * 3600;
                break;
            case 'days':
                ttlSeconds = ttlNum * 86400;
                break;
        }

        onConfirm(ttlSeconds);
    };

    const handleRemoveTTL = () => {
        onConfirm(0); // 0 means remove TTL (make persistent)
    };

    const currentTTL = keyData.ttlMs === null ? 'Persistent' : `${Math.round(keyData.ttlMs / 1000)}s`;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center">
                            <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        </div>
                        <DialogTitle>Set TTL</DialogTitle>
                    </div>
                    <DialogDescription>
                        Set expiration time for this key. The key will be automatically deleted when the TTL expires.
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
                                <span className="text-sm font-medium">Current TTL:</span>
                                <span className="text-sm">{currentTTL}</span>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="ttl-preset">Quick Presets</Label>
                            <Select onValueChange={handlePresetSelect}>
                                <SelectTrigger id="ttl-preset" className="mt-1">
                                    <SelectValue placeholder="Select a preset" />
                                </SelectTrigger>
                                <SelectContent>
                                    {TTL_PRESETS.map((preset) => (
                                        <SelectItem key={preset.value} value={preset.value.toString()}>
                                            {preset.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <Label htmlFor="ttl-value">Value</Label>
                                <Input
                                    id="ttl-value"
                                    type="number"
                                    min="0"
                                    value={ttlValue}
                                    onChange={(e) => setTtlValue(e.target.value)}
                                    placeholder="Enter value"
                                    className="mt-1"
                                />
                            </div>
                            <div>
                                <Label htmlFor="ttl-unit">Unit</Label>
                                <Select value={ttlUnit} onValueChange={(value: any) => setTtlUnit(value)}>
                                    <SelectTrigger id="ttl-unit" className="mt-1">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="seconds">Seconds</SelectItem>
                                        <SelectItem value="minutes">Minutes</SelectItem>
                                        <SelectItem value="hours">Hours</SelectItem>
                                        <SelectItem value="days">Days</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>
                </div>

                <DialogFooter className="gap-2">
                    <Button variant="outline" onClick={onClose} disabled={isLoading}>
                        Cancel
                    </Button>
                    {keyData.ttlMs !== null && (
                        <Button
                            variant="outline"
                            onClick={handleRemoveTTL}
                            disabled={isLoading}
                            className="gap-2"
                        >
                            <X className="w-4 h-4" />
                            Remove TTL
                        </Button>
                    )}
                    <Button
                        onClick={handleConfirm}
                        disabled={isLoading || !ttlValue || parseInt(ttlValue) < 0}
                        className="gap-2"
                    >
                        <Clock className="w-4 h-4" />
                        {isLoading ? 'Setting TTL...' : 'Set TTL'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
