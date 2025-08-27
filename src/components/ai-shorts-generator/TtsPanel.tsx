import React, { useState } from 'react';
import { SparklesIcon, SheetsIcon } from './icons';
import type { GeneratedScript } from '../../types/ai-shorts-generator';

import { exportScriptToSheet } from '../../services/ai-shorts-generator/googleApiService';

interface TtsPanelProps {
    onGenerate: (script: GeneratedScript) => Promise<void>;
    isGenerating: boolean;
    generationProgress: number;
    generationMessage: string;
    isSignedIn: boolean;
}

export const TtsPanel: React.FC<TtsPanelProps> = ({ onGenerate, isGenerating, generationProgress, generationMessage, isSignedIn }) => {
    const [script, setScript] = useState<GeneratedScript | null>(null); // Keep script state for other functionalities if needed
    const [isExporting, setIsExporting] = useState(false);
    const [sheetUrl, setSheetUrl] = useState('');

    // Placeholder for script, as generation is removed.
    // In a real scenario, this script would come from another source or be manually entered.
    // For now, I'll provide a dummy script to allow the rest of the component to function.
    React.useEffect(() => {
        setScript({
            title: "Dummy Title\nFor Testing",
            cta: "Dummy CTA",
            clips: [
                { script: "더미 스크립트 1", imagePrompt: "Dummy image prompt 1" },
                { script: "더미 스크립트 2", imagePrompt: "Dummy image prompt 2" },
            ]
        });
    }, []);

    const handleGenerateContent = () => {
        if (!script) return;
        onGenerate(script);
    };
    
    const handleExportToSheet = async () => {
        if (!script) return;
        setIsExporting(true);
        setSheetUrl('');
        try {
            const url = await exportScriptToSheet(script);
            setSheetUrl(url);
        } catch (e) {
             alert(`Failed to export to Google Sheets: ${e instanceof Error ? e.message : 'Unknown error'}`);
        } finally {
            setIsExporting(false);
        }
    };

    const handleScriptChange = (field: 'title' | 'cta', value: string) => {
        setScript(s => s ? { ...s, [field]: value } : null);
    };


    return (
        <div className="bg-panel-light rounded-lg shadow-sm p-4">
            <h2 className="font-bold mb-2 flex items-center gap-2">
                <SparklesIcon className="w-5 h-5 text-brand-blue" />
                AI Content Generator
            </h2>
            <div className="flex flex-col gap-3">
                {script && (
                    <div className="border-t pt-3 mt-1 flex flex-col gap-3">
                        <div>
                            <label className="text-sm font-semibold">Generated Title</label>
                            <textarea
                                value={script.title}
                                onChange={e => handleScriptChange('title', e.currentTarget.value)}
                                rows={2}
                                className="w-full p-1 border rounded text-sm mt-1"
                                disabled={isGenerating}
                            />
                        </div>
                        <div>
                            <label className="text-sm font-semibold">Generated CTA</label>
                            <input
                                type="text"
                                value={script.cta}
                                onChange={e => handleScriptChange('cta', e.currentTarget.value)}
                                className="w-full p-1 border rounded text-sm mt-1"
                                disabled={isGenerating}
                            />
                        </div>
                        <div>
                            <h3 className="text-sm font-semibold mb-1">Generated Scenes ({script.clips.length})</h3>
                            <div className="max-h-48 overflow-y-auto pr-2 flex flex-col gap-2 text-xs">
                                {script.clips.map((clip, index) => (
                                    <div key={index} className="bg-gray-100 p-2 rounded">
                                        <p className="font-semibold">Scene {index + 1}</p>
                                        <p><strong className="text-gray-500">Script:</strong> {clip.script}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                        
                        <div className="flex flex-col gap-2">
                             {isSignedIn && (
                                <button
                                    onClick={handleExportToSheet}
                                    disabled={isExporting || isGenerating}
                                    className="w-full bg-white border border-gray-300 text-gray-700 font-bold py-2 rounded-md hover:bg-gray-50 disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {isExporting ? (
                                        <>
                                            <div className="w-5 h-5 border-2 border-t-transparent border-gray-500 rounded-full animate-spin"></div>
                                            Exporting...
                                        </>
                                    ) : (
                                        <>
                                            <SheetsIcon className="w-5 h-5" />
                                            Export to Google Sheets
                                        </>
                                    )}
                                </button>
                             )}
                              {sheetUrl && (
                                <a href={sheetUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-center text-brand-green font-semibold hover:underline">
                                    ✓ Successfully exported. View Sheet.
                                </a>
                            )}
                        </div>
                         
                        {isGenerating ? (
                            <div className="w-full bg-gray-200 rounded-full h-8 overflow-hidden relative flex items-center justify-center mt-1">
                                <div className="bg-brand-green h-full absolute left-0 top-0 transition-width duration-300" style={{ width: `${generationProgress}%` }}></div>
                                <span className="relative z-10 text-white font-bold text-xs px-2">{generationMessage}</span>
                            </div>
                        ) : (
                            <button
                                onClick={handleGenerateContent}
                                className="w-full bg-brand-green text-white font-bold py-2 rounded-md hover:opacity-90 disabled:opacity-50 flex items-center justify-center"
                            >
                                Generate Images & Clips
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};