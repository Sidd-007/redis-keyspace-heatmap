'use client';

import { Calendar, Check, ChevronDown, ChevronRight, Code, Copy, ExternalLink, FileText } from 'lucide-react';
import { useEffect, useState } from 'react';

interface JsonViewerProps {
    data: any;
    initialExpanded?: boolean;
}

interface JsonNodeProps {
    data: any;
    keyName?: string;
    level: number;
    initialExpanded?: boolean;
}

// Helper function to detect content type
const detectContentType = (value: string): { type: string; icon: JSX.Element; color: string } => {
    // Check if it's a URL
    if (value.match(/^https?:\/\//)) {
        return {
            type: 'URL',
            icon: <ExternalLink className="w-3 h-3" />,
            color: 'text-cyan-400 bg-cyan-400/10'
        };
    }

    // Check if it's a date
    if (value.match(/^\d{4}-\d{2}-\d{2}/) || value.match(/^\d{2}\/\d{2}\/\d{4}/)) {
        return {
            type: 'Date',
            icon: <Calendar className="w-3 h-3" />,
            color: 'text-yellow-400 bg-yellow-400/10'
        };
    }

    // Check if it's HTML content
    if (value.includes('<') && value.includes('>')) {
        return {
            type: 'HTML',
            icon: <Code className="w-3 h-3" />,
            color: 'text-green-400 bg-green-400/10'
        };
    }

    // Check if it's JSON
    try {
        JSON.parse(value);
        return {
            type: 'JSON',
            icon: <FileText className="w-3 h-3" />,
            color: 'text-purple-400 bg-purple-400/10'
        };
    } catch {
        // Not JSON
    }

    // Check if it's a long text
    if (value.length > 100) {
        return {
            type: 'Long Text',
            icon: <FileText className="w-3 h-3" />,
            color: 'text-blue-400 bg-blue-400/10'
        };
    }

    return {
        type: 'Text',
        icon: <FileText className="w-3 h-3" />,
        color: 'text-green-400 bg-green-400/10'
    };
};

function JsonNode({ data, keyName, level, initialExpanded = true }: JsonNodeProps) {
    const [isExpanded, setIsExpanded] = useState(initialExpanded);
    const [copied, setCopied] = useState(false);
    const [mounted, setMounted] = useState(false);
    const indent = level * 20;

    useEffect(() => {
        setMounted(true);
    }, []);

    const copyToClipboard = (text: string) => {
        if (!mounted) return;

        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const renderValue = (value: unknown): JSX.Element => {
        if (value === null) {
            return (
                <span className="text-purple-400 font-semibold bg-purple-400/10 px-1.5 py-0.5 rounded text-xs">
                    null
                </span>
            );
        }

        if (typeof value === 'boolean') {
            return (
                <span className={`font-semibold px-1.5 py-0.5 rounded text-xs ${value ? 'text-emerald-400 bg-emerald-400/10' : 'text-red-400 bg-red-400/10'
                    }`}>
                    {value.toString()}
                </span>
            );
        }

        if (typeof value === 'number') {
            return (
                <span className="text-blue-400 font-mono bg-blue-400/10 px-1.5 py-0.5 rounded text-xs">
                    {value}
                </span>
            );
        }

        if (typeof value === 'string') {
            const contentType = detectContentType(value);

            return (
                <div className="inline-flex items-center gap-2">
                    <span className={`${contentType.color} px-1.5 py-0.5 rounded text-xs font-medium flex items-center gap-1`}>
                        {contentType.icon}
                        {contentType.type}
                    </span>
                    <span className="text-green-400 bg-green-400/10 px-1.5 py-0.5 rounded text-xs">
                        &quot;{value.length > 50 ? value.substring(0, 50) + '...' : value}&quot;
                    </span>
                    <button
                        onClick={() => copyToClipboard(value)}
                        className="text-gray-400 hover:text-gray-200 transition-colors"
                        title="Copy value"
                    >
                        {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    </button>
                </div>
            );
        }

        if (Array.isArray(value)) {
            if (value.length === 0) {
                return (
                    <span className="text-gray-400 bg-gray-400/10 px-1.5 py-0.5 rounded text-xs">
                        []
                    </span>
                );
            }

            if (!isExpanded) {
                return (
                    <span className="text-gray-400 bg-gray-400/10 px-1.5 py-0.5 rounded text-xs">
                        [{value.length} items]
                    </span>
                );
            }

            return (
                <div className="space-y-1">
                    <span className="text-gray-400">[</span>
                    <div className="ml-4 space-y-1">
                        {value.map((item, index) => (
                            <div key={index} style={{ marginLeft: indent }} className="flex items-start">
                                <div className="flex-1">
                                    {renderValue(item)}
                                </div>
                                {index < value.length - 1 && <span className="text-gray-400 ml-2">,</span>}
                            </div>
                        ))}
                    </div>
                    <span className="text-gray-400">]</span>
                </div>
            );
        }

        if (typeof value === 'object') {
            const keys = Object.keys(value as Record<string, unknown>);

            if (keys.length === 0) {
                return (
                    <span className="text-gray-400 bg-gray-400/10 px-1.5 py-0.5 rounded text-xs">
                        { }
                    </span>
                );
            }

            if (!isExpanded) {
                return (
                    <span className="text-gray-400 bg-gray-400/10 px-1.5 py-0.5 rounded text-xs">
                        {'{'}...{keys.length} properties{'}'}
                    </span>
                );
            }

            return (
                <div className="space-y-1">
                    <span className="text-gray-400">{'{'}</span>
                    <div className="ml-4 space-y-1">
                        {keys.map((key, index) => (
                            <div key={key} style={{ marginLeft: indent }} className="flex items-start">
                                <div className="flex-1">
                                    <span className="text-cyan-400 font-semibold bg-cyan-400/10 px-1.5 py-0.5 rounded text-xs">
                                        &quot;{key}&quot;
                                    </span>
                                    <span className="text-gray-400 mx-2">:</span>
                                    <JsonNode
                                        data={(value as Record<string, unknown>)[key]}
                                        keyName={key}
                                        level={level + 1}
                                        initialExpanded={false}
                                    />
                                </div>
                                {index < keys.length - 1 && <span className="text-gray-400 ml-2">,</span>}
                            </div>
                        ))}
                    </div>
                    <span className="text-gray-400">{'}'}</span>
                </div>
            );
        }

        return (
            <span className="text-gray-400 bg-gray-400/10 px-1.5 py-0.5 rounded text-xs">
                {String(value)}
            </span>
        );
    };

    const canExpand = (data: unknown) => {
        return (Array.isArray(data) && data.length > 0) ||
            (typeof data === 'object' && data !== null && Object.keys(data as Record<string, unknown>).length > 0);
    };

    const needsExpander = canExpand(data);

    return (
        <div className="font-mono text-sm leading-relaxed">
            {keyName && (
                <span className="text-cyan-400 font-semibold bg-cyan-400/10 px-1.5 py-0.5 rounded text-xs">
                    &quot;{keyName}&quot;
                </span>
            )}
            {keyName && <span className="text-gray-400 mx-2">:</span>}

            {needsExpander ? (
                <div className="inline-flex items-start">
                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="p-1 hover:bg-gray-700/50 rounded mr-1 transition-colors"
                    >
                        {isExpanded ? (
                            <ChevronDown className="w-3 h-3 text-gray-400" />
                        ) : (
                            <ChevronRight className="w-3 h-3 text-gray-400" />
                        )}
                    </button>
                    <div className="flex-1">
                        {renderValue(data)}
                    </div>
                </div>
            ) : (
                renderValue(data)
            )}
        </div>
    );
}

export function JsonViewer({ data, initialExpanded = false }: JsonViewerProps) {
    const [copied, setCopied] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const copyAllToClipboard = () => {
        if (!mounted) return;

        const textToCopy = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
        navigator.clipboard.writeText(textToCopy);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-4 overflow-auto relative">
            {/* Header with copy button */}
            <div className="absolute top-2 right-2">
                <button
                    onClick={copyAllToClipboard}
                    className="text-gray-400 hover:text-gray-200 transition-colors p-1 rounded hover:bg-gray-700/50"
                    title="Copy all data"
                >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
            </div>

            {/* JSON content */}
            <div className="pr-8">
                <JsonNode
                    data={data}
                    level={0}
                    initialExpanded={initialExpanded}
                />
            </div>
        </div>
    );
}
