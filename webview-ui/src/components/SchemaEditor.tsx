import { useState, useEffect } from 'react';
import { Badge } from './primitives';

interface SchemaEditorProps {
    schema: any;
    onChange: (newSchema: any) => void;
    isDark?: boolean;
}

export default function SchemaEditor({ schema, onChange, isDark = false }: SchemaEditorProps) {
    const [jsonText, setJsonText] = useState('');
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        setJsonText(JSON.stringify(schema, null, 2));
    }, [schema]);

    const handleTextChange = (text: string) => {
        setJsonText(text);
        try {
            const parsed = JSON.parse(text);
            setError(null);
            onChange(parsed);
        } catch (e) {
            setError((e as Error).message);
        }
    };

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <Badge variant="info" size="xs" isDark={isDark}>JSON Schema</Badge>
                {error && <span className="text-xs text-red-500">{error}</span>}
            </div>
            <textarea
                value={jsonText}
                onChange={(e) => handleTextChange(e.target.value)}
                className={`w-full h-64 p-3 rounded-md font-mono text-xs border ${isDark
                    ? 'bg-slate-800 border-slate-700 text-slate-200 focus:border-indigo-500'
                    : 'bg-white border-gray-200 text-gray-800 focus:border-indigo-500'
                    } focus:outline-none focus:ring-1 focus:ring-indigo-500`}
            />
        </div>
    );
}
