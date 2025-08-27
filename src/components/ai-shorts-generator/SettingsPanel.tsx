import React from 'react';
import type { AspectRatio, ProjectSettings } from '../../types/ai-shorts-generator';

interface SettingsPanelProps {
    settings: ProjectSettings;
    handleSettingsChange: (field: keyof ProjectSettings, value: string | number | AspectRatio) => void;
    handleNumericSettingsChange: (field: keyof ProjectSettings, value: string) => void;
    helpText: JSX.Element;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
    settings,
    handleSettingsChange,
    handleNumericSettingsChange,
    helpText,
}) => {
    return (
        <div className="bg-panel-light rounded-lg shadow-sm p-4">
            <h2 className="font-bold mb-2">Title Lines</h2>
            <div className="flex flex-col gap-3 mb-4">
                <div>
                    <label htmlFor="title-line-1-input" className="text-sm font-semibold">Title Line 1</label>
                    <textarea
                        id="title-line-1-input"
                        value={settings.titleLine1}
                        onChange={e => handleSettingsChange('titleLine1', e.currentTarget.value)}
                        rows={2}
                        className="w-full p-1 border rounded text-sm mt-1"
                        placeholder="Enter first line of the title."
                    />
                    {helpText}
                </div>
                <div>
                    <label htmlFor="title-line-2-input" className="text-sm font-semibold">Title Line 2</label>
                    <textarea
                        id="title-line-2-input"
                        value={settings.titleLine2}
                        onChange={e => handleSettingsChange('titleLine2', e.currentTarget.value)}
                        rows={2}
                        className="w-full p-1 border rounded text-sm mt-1"
                        placeholder="Enter second line of the title."
                    />
                    {helpText}
                </div>
            </div>

            <h2 className="font-bold mb-2">Project Settings</h2>
            <div className="flex flex-col gap-3">
                <div>
                    <label htmlFor="cta-input" className="text-sm font-semibold">Call to Action (CTA)</label>
                    <textarea
                        id="cta-input"
                        value={settings.ctaText}
                        onChange={e => handleSettingsChange('ctaText', e.currentTarget.value)}
                        rows={2}
                        className="w-full p-1 border rounded text-sm mt-1"
                        placeholder="e.g. Follow for more!"
                    />
                    {helpText}
                </div>
                <div>
                    <label className="text-sm font-semibold">Aspect Ratio</label>
                    <select
                        value={settings.aspectRatio}
                        onChange={e => handleSettingsChange('aspectRatio', e.currentTarget.value as AspectRatio)}
                        className="w-full p-1 border rounded text-sm mt-1">
                        <option value="9:16">9:16 (Portrait)</option>
                        <option value="1:1">1:1 (Square)</option>
                        <option value="16:9">16:9 (Landscape)</option>
                    </select>
                </div>
                <div className="border-t pt-3 mt-1">
                    <h3 className="text-md font-bold mb-2">Font & Style</h3>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                        <div>
                            <label className="text-sm font-semibold">Title L1 Size</label>
                            <input type="number" value={settings.titleLine1FontSize} onChange={e => handleNumericSettingsChange('titleLine1FontSize', e.currentTarget.value)} className="w-full p-1 border rounded text-sm mt-1"/>
                        </div>
                        <div>
                            <label className="text-sm font-semibold">Title L1 Stroke</label>
                            <input type="number" value={settings.titleLine1StrokeSize} onChange={e => handleNumericSettingsChange('titleLine1StrokeSize', e.currentTarget.value)} className="w-full p-1 border rounded text-sm mt-1"/>
                        </div>
                        <div>
                            <label className="text-sm font-semibold">Title L2 Size</label>
                            <input type="number" value={settings.titleLine2FontSize} onChange={e => handleNumericSettingsChange('titleLine2FontSize', e.currentTarget.value)} className="w-full p-1 border rounded text-sm mt-1"/>
                        </div>
                        <div>
                            <label className="text-sm font-semibold">Title L2 Stroke</label>
                            <input type="number" value={settings.titleLine2StrokeSize} onChange={e => handleNumericSettingsChange('titleLine2StrokeSize', e.currentTarget.value)} className="w-full p-1 border rounded text-sm mt-1"/>
                        </div>
                        <div>
                            <label className="text-sm font-semibold">Subtitle Font Size</label>
                            <input type="number" value={settings.subtitleFontSize} onChange={e => handleNumericSettingsChange('subtitleFontSize', e.currentTarget.value)} className="w-full p-1 border rounded text-sm mt-1"/>
                        </div>
                        <div>
                            <label className="text-sm font-semibold">Subtitle Stroke</label>
                            <input type="number" value={settings.subtitleStrokeSize} onChange={e => handleNumericSettingsChange('subtitleStrokeSize', e.currentTarget.value)} className="w-full p-1 border rounded text-sm mt-1"/>
                        </div>
                        <div>
                            <label className="text-sm font-semibold">CTA Font Size</label>
                            <input type="number" value={settings.ctaFontSize} onChange={e => handleNumericSettingsChange('ctaFontSize', e.currentTarget.value)} className="w-full p-1 border rounded text-sm mt-1"/>
                        </div>
                        <div>
                            <label className="text-sm font-semibold">CTA Stroke</label>
                            <input type="number" value={settings.ctaStrokeSize} onChange={e => handleNumericSettingsChange('ctaStrokeSize', e.currentTarget.value)} className="w-full p-1 border rounded text-sm mt-1"/>
                        </div>
                    </div>
                </div>

                <div className="border-t pt-3 mt-1">
                    <h3 className="text-md font-bold mb-2">Layout Guidelines</h3>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                        <div>
                            <label className="text-sm font-semibold">Top (%)</label>
                            <input type="number" value={settings.topGuideline} onChange={e => handleNumericSettingsChange('topGuideline', e.currentTarget.value)} className="w-full p-1 border rounded text-sm mt-1"/>
                        </div>
                        <div>
                            <label className="text-sm font-semibold">Bottom (%)</label>
                            <input type="number" value={settings.bottomGuideline} onChange={e => handleNumericSettingsChange('bottomGuideline', e.currentTarget.value)} className="w-full p-1 border rounded text-sm mt-1"/>
                        </div>
                        <div className="col-span-2">
                            <label className="text-sm font-semibold">CTA (%)</label>
                            <input type="number" value={settings.ctaGuideline} onChange={e => handleNumericSettingsChange('ctaGuideline', e.currentTarget.value)} className="w-full p-1 border rounded text-sm mt-1"/>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
