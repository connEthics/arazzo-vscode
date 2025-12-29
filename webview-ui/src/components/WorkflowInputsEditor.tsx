import { useState } from 'react';
import type { WorkflowInputs, SchemaProperty } from '../types/arazzo';
import SchemaEditor from './SchemaEditor';
import type { ExpressionSuggestion } from './ExpressionInput';

interface WorkflowInputsEditorProps {
    inputs: WorkflowInputs;
    onChange: (inputs: WorkflowInputs) => void;
    isDark?: boolean;
    onReorder?: (startIndex: number, endIndex: number) => void;
    expressionSuggestions?: ExpressionSuggestion[];
}

export default function WorkflowInputsEditor({
    inputs,
    onChange,
    isDark = false,
}: WorkflowInputsEditorProps) {
    const [mode, setMode] = useState<'list' | 'schema'>('list');

    // Convert schema properties to list items for easier editing
    const properties = inputs.properties || {};
    const required = inputs.required || [];

    const handlePropertyChange = (key: string, newKey: string, newValue: SchemaProperty) => {
        const newProperties = { ...properties };
        if (key !== newKey) {
            delete newProperties[key];
        }
        newProperties[newKey] = newValue;

        // Update required array if key changed
        let newRequired = [...required];
        if (key !== newKey && required.includes(key)) {
            newRequired = newRequired.map(k => k === key ? newKey : k);
        }

        onChange({
            ...inputs,
            properties: newProperties,
            required: newRequired
        });
    };

    const handleDeleteProperty = (key: string) => {
        const newProperties = { ...properties };
        delete newProperties[key];
        onChange({
            ...inputs,
            properties: newProperties,
            required: required.filter(k => k !== key)
        });
    };

    const handleAddProperty = () => {
        const newKey = `input${Object.keys(properties).length + 1}`;
        onChange({
            ...inputs,
            properties: {
                ...properties,
                [newKey]: { type: 'string', description: 'New input' }
            }
        });
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex gap-2">
                    <button
                        onClick={() => setMode('list')}
                        className={`px-2 py-1 text-xs rounded ${mode === 'list'
                            ? (isDark ? 'bg-indigo-900 text-indigo-200' : 'bg-indigo-100 text-indigo-700')
                            : (isDark ? 'text-slate-400 hover:text-slate-200' : 'text-gray-500 hover:text-gray-700')
                            }`}
                    >
                        List View
                    </button>
                    <button
                        onClick={() => setMode('schema')}
                        className={`px-2 py-1 text-xs rounded ${mode === 'schema'
                            ? (isDark ? 'bg-indigo-900 text-indigo-200' : 'bg-indigo-100 text-indigo-700')
                            : (isDark ? 'text-slate-400 hover:text-slate-200' : 'text-gray-500 hover:text-gray-700')
                            }`}
                    >
                        JSON Schema
                    </button>
                </div>
                {mode === 'list' && (
                    <button
                        onClick={handleAddProperty}
                        className="text-xs text-indigo-500 hover:text-indigo-400 flex items-center gap-1"
                    >
                        + Add Input
                    </button>
                )}
            </div>

            {mode === 'list' ? (
                <div className="space-y-2">
                    {Object.entries(properties).map(([key, schema]) => (
                        <div key={key} className={`p-3 rounded border ${isDark ? 'border-slate-700 bg-slate-800/50' : 'border-gray-200 bg-gray-50'}`}>
                            <div className="flex items-start justitween gap-4">
                                <div className="flex-1 space-y-2">
                                    <div className="flex items-center gap-2">
                                        <span className={`text-xs font-mono ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Name:</span>
                                        <input
                                            value={key}
                                            onChange={(e) => handlePropertyChange(key, e.target.value, schema)}
                                            className={`bg-transparent border-b border-dashed ${isDark ? 'border-slate-600 text-white' : 'border-gray-300 text-gray-900'} text-sm font-medium focus:outline-none focus:border-indigo-500 px-1`}
                                        />
                                        <label className="flex items-center gap-1 cursor-pointer ml-2">
                                            <input
                                                type="checkbox"
                                                checked={required.includes(key)}
                                                onChange={(e) => {
                                                    const newRequired = e.target.checked
                                                        ? [...required, key]
                                                        : required.filter(k => k !== key);
                                                    onChange({ ...inputs, required: newRequired });
                                                }}
                                                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 h-3 w-3"
                                            />
                                            <span className={`text-[10px] uppercase font-bold ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Required</span>
                                        </label>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className={`text-xs font-mono ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Type:</span>
                                        <select
                                            value={schema.type || 'string'}
                                            onChange={(e) => handlePropertyChange(key, key, { ...schema, type: e.target.value })}
                                            className={`bg-transparent border rounded px-1 py-0.5 text-xs ${isDark ? 'border-slate-600 text-slate-300' : 'border-gray-300 text-gray-700'}`}
                                        >
                                            <option value="string">String</option>
                                            <option value="number">Number</option>
                                            <option value="integer">Integer</option>
                                            <option value="boolean">Boolean</option>
                                            <option value="array">Array</option>
                                            <option value="object">Object</option>
                                        </select>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className={`text-xs font-mono ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Desc:</span>
                                        <input
                                            value={schema.description || ''}
                                            onChange={(e) => handlePropertyChange(key, key, { ...schema, description: e.target.value })}
                                            placeholder="Description"
                                            className={`flex-1 bg-transparent border-b border-dashed ${isDark ? 'border-slate-600 text-slate-300' : 'border-gray-300 text-gray-600'} text-xs focus:outline-none focus:border-indigo-500 px-1`}
                                        />
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleDeleteProperty(key)}
                                    className="text-red-400 hover:text-red-500 p-1"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    ))}
                    {Object.keys(properties).length === 0 && (
                        <p className={`text-sm italic text-center py-4 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                            No inputs defined. Click "Add Input" to create one.
                        </p>
                    )}
                </div>
            ) : (
                <SchemaEditor
                    schema={inputs}
                    onChange={onChange}
                    isDark={isDark}
                />
            )}
        </div>
    );
}
