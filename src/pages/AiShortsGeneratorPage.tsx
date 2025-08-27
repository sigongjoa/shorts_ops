import React from 'react';
import { useLocation } from 'react-router-dom'; // Import useLocation
import { ClassicEditor } from '../components/ai-shorts-generator/ClassicEditor';

const AiShortsGeneratorPage: React.FC = () => {
    const isSignedIn = true;
    const location = useLocation(); // Get location object
    const { initialScript, initialImages, initialTitleLine1, initialTitleLine2 } = (location.state || {}) as { initialScript?: string; initialImages?: string[]; initialTitleLine1?: string; initialTitleLine2?: string; }; // Destructure state

    return (
        <div className="flex flex-col h-screen bg-bg-light text-text-primary font-sans">
            <header className="flex-shrink-0 bg-panel-light border-b border-border-light px-4 h-16 flex items-center justify-between z-10 shadow-sm">
                <div className="flex items-baseline gap-4">
                    <h1 className="text-lg font-bold">AI Shorts Generator</h1>
                </div>
            </header>
            <ClassicEditor isSignedIn={isSignedIn} initialScript={initialScript} initialImages={initialImages} initialTitleLine1={initialTitleLine1} initialTitleLine2={initialTitleLine2} />
        </div>
    );
};

export default AiShortsGeneratorPage;