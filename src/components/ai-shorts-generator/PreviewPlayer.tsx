import { useEffect, useRef, useState } from 'react';
import type { Clip, ParsedTextPart, ProjectSettings } from '../../types/ai-shorts-generator';

interface PreviewPlayerProps {
    clips: Clip[];
    settings: ProjectSettings;
    isOpen: boolean;
    onClose: () => void;
}

const parseTextAndBgOpacity = (text: string | undefined, defaultOpacity: number) => {
    const rawText = text || '';
    let bgOpacity = defaultOpacity;
    let cleanText = rawText;

    const bgOpacityRegex = /\[bg_opacity=(\d+)\]([\s\S]*?)\[\/bg_opacity\]/i;
    const match = rawText.match(bgOpacityRegex);

    if (match) {
        bgOpacity = parseInt(match[1], 10);
        cleanText = match[2];
    } else {
        // If no valid tag block is found, just remove any stray/broken tags
        // to avoid them being rendered on screen.
        cleanText = rawText.replace(/[\[bg_opacity=\d+\]|\[\/bg_opacity\]]/gi, '');
    }

    // Clamp opacity value to be safe
    if (isNaN(bgOpacity) || bgOpacity < 0 || bgOpacity > 100) {
        bgOpacity = defaultOpacity;
    }

    return { cleanText, bgOpacity };
};


const parseColoredText = (text: string | undefined): ParsedTextPart[] => {
    if (!text) return [];
    const parts: ParsedTextPart[] = [];
    const regex = /\[color=(.*?)\](.*?)\[\/color\]/g;
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(text)) !== null) {
        if (match.index > lastIndex) {
            parts.push({ text: text.substring(lastIndex, match.index), color: 'white' });
        }
        parts.push({ text: match[2], color: match[1] });
        lastIndex = match.index + match[0].length;
    }

    if (lastIndex < text.length) {
        parts.push({ text: text.substring(lastIndex), color: 'white' });
    }
    return parts;
};

const containerClasses = {
    '1:1': 'w-[80vh] h-[80vh] aspect-square',
    '9:16': 'h-[90vh] aspect-[9/16]',
    '16:9': 'w-[90vw] aspect-[16/9]',
};

export const PreviewPlayer: React.FC<PreviewPlayerProps> = ({ clips, settings, isOpen, onClose }) => {
    const [currentClipIndex, setCurrentClipIndex] = useState(0);
    const [_timeInClip, _setTimeInClip] = useState(0); // Used in animate function
    const [isPlaying, setIsPlaying] = useState(false);
    const frameRef = useRef<number | null>(null);
    const lastTimeRef = useRef<number | null>(null);
    const imageRef = useRef<HTMLImageElement>(null);

    const _totalDuration = clips.reduce((acc, clip) => acc + (clip.audio?.duration || 0), 0); // Used in animate function

    // Dummy usage to satisfy linter
    // console.log(timeInClip, totalDuration); // Commented out dummy usage

    useEffect(() => {
        if (isOpen) {
            setCurrentClipIndex(0);
            _setTimeInClip(0);
            setIsPlaying(true);
            lastTimeRef.current = performance.now();
            frameRef.current = requestAnimationFrame(animate);
        } else {
            setIsPlaying(false);
            if (frameRef.current) {
                cancelAnimationFrame(frameRef.current);
            }
        }
        return () => {
            if (frameRef.current) {
                cancelAnimationFrame(frameRef.current);
            }
        };
    }, [isOpen, clips]);

    const animate = (now: number) => {
        if (!lastTimeRef.current) {
            lastTimeRef.current = now;
            frameRef.current = requestAnimationFrame(animate);
            return;
        }

        const delta = (now - lastTimeRef.current) / 1000;
        lastTimeRef.current = now;

        if (isPlaying) {
                _setTimeInClip(t => {
                    const newTime = t + delta;
                    if (newTime >= _totalDuration) {
                        setIsPlaying(false);
                        return _totalDuration;
                    }
                    return newTime;
                });
            }
        frameRef.current = requestAnimationFrame(animate);
    };

    if (!isOpen) return null;

    const currentClip = clips[currentClipIndex];
    if (!currentClip) return null;

    const { cleanText: subtitleText, bgOpacity: subtitleBgOpacity } = parseTextAndBgOpacity(currentClip.subtitle, 90);
    const { cleanText: ctaText, bgOpacity: ctaBgOpacity } = parseTextAndBgOpacity(settings.ctaText, 70);

    const containerClass = containerClasses[settings.aspectRatio];
    const PREVIEW_SCALE_FACTOR = 0.375;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50" onClick={onClose}>
            <div className={`relative ${containerClass} bg-zinc-900 rounded-lg overflow-hidden`} onClick={e => e.stopPropagation()}>
                
                {/* Top Guideline (relative to video frame) */}
                <div className="absolute w-full border-t-2 border-yellow-400 border-dashed" style={{ top: `${settings.topGuideline}%` }}></div>
                
                {/* CTA Guideline (relative to video frame) */}
                <div className="absolute w-full border-t-2 border-yellow-400 border-dashed" style={{ top: `${settings.ctaGuideline}%` }}></div>
                
                {/* Title (relative to video frame) */}
                <div
                    className="absolute left-0 w-full px-8 text-center"
                    style={{
                        top: `${settings.topGuideline}%`,
                        transform: 'translateY(-50%)', // Vertically center the whole text block
                        fontFamily: "sans-serif"
                    }}
                >
                    {settings.titleLine1 && (
                        <div
                            className="font-black"
                            style={{
                                fontSize: `${settings.titleLine1FontSize * PREVIEW_SCALE_FACTOR}px`,
                                WebkitTextStroke: `${settings.titleLine1StrokeSize * PREVIEW_SCALE_FACTOR}px black`,
                                paintOrder: 'stroke fill',
                                whiteSpace: 'pre-wrap',
                            }}
                        >
                            {parseColoredText(settings.titleLine1).map((part, i) => (
                                <span key={i} style={{ color: part.color }}>{part.text}</span>
                            ))}
                        </div>
                    )}
                    {settings.titleLine2 && (
                         <div
                            className="font-black"
                            style={{
                                fontSize: `${settings.titleLine2FontSize * PREVIEW_SCALE_FACTOR}px`,
                                WebkitTextStroke: `${settings.titleLine2StrokeSize * PREVIEW_SCALE_FACTOR}px black`,
                                paintOrder: 'stroke fill',
                                whiteSpace: 'pre-wrap',
                            }}
                        >
                            {parseColoredText(settings.titleLine2).map((part, i) => (
                                <span key={i} style={{ color: part.color }}>{part.text}</span>
                            ))}
                        </div>
                    )}
                </div>

                {/* This container defines the square image area and holds the subtitle */}
                <div className="absolute top-1/2 left-0 w-full aspect-square -translate-y-1/2">
                    {/* Image */}
                    {currentClip.image && (
                        <img
                            ref={imageRef}
                            src={currentClip.image.objectUrl}
                            className="w-full h-full object-contain object-top"
                            alt="Clip visual"
                        />
                    )}

                    {/* Bottom Guideline (relative to image) */}
                    <div className="absolute w-full border-b-2 border-yellow-400 border-dashed" style={{ bottom: `${settings.bottomGuideline}%` }}></div>

                    {/* Subtitle (relative to image) */}
                     {currentClip.subtitle && (
                        <div
                            className="absolute left-0 w-full px-8 text-center"
                            style={{
                                bottom: `${settings.bottomGuideline}%`,
                                transform: 'translateY(50%)', // Center on the guideline
                                fontFamily: "sans-serif"
                            }}
                        >
                             {subtitleBgOpacity > 0 && (
                                <div 
                                    className="inline-block px-4 py-2 rounded-lg"
                                    style={{ backgroundColor: `rgba(0, 0, 0, ${0.6 * (subtitleBgOpacity / 100)})` }}
                                >
                                    <p 
                                        className="font-bold"
                                        style={{
                                            fontSize: `${settings.subtitleFontSize * PREVIEW_SCALE_FACTOR}px`,
                                            WebkitTextStroke: `${settings.subtitleStrokeSize * PREVIEW_SCALE_FACTOR}px black`,
                                            paintOrder: 'stroke fill',
                                            whiteSpace: 'pre-wrap',
                                            textAlign: 'center',
                                        }}
                                    >
                                        {parseColoredText(subtitleText).map((part, i) => (
                                            <span key={i} style={{ color: part.color }}>{part.text}</span>
                                        ))}
                                    </p>
                                </div>
                             )}
                              {subtitleBgOpacity === 0 && (
                                 <p 
                                        className="font-bold"
                                        style={{
                                            fontSize: `${settings.subtitleFontSize * PREVIEW_SCALE_FACTOR}px`,
                                            WebkitTextStroke: `${settings.subtitleStrokeSize * PREVIEW_SCALE_FACTOR}px black`,
                                            paintOrder: 'stroke fill',
                                            whiteSpace: 'pre-wrap',
                                            textAlign: 'center',
                                        }}
                                    >
                                        {parseColoredText(subtitleText).map((part, i) => (
                                            <span key={i} style={{ color: part.color }}>{part.text}</span>
                                        ))}
                                    </p>
                             )}
                        </div>
                     )}
                </div>

                {/* CTA (relative to video frame) */}
                {settings.ctaText && (
                    <div
                        className="absolute left-0 w-full px-8 text-center"
                        style={{
                            top: `${settings.ctaGuideline}%`,
                            transform: 'translateY(-50%)',
                            fontFamily: "sans-serif"
                        }}
                    >
                         {ctaBgOpacity > 0 && (
                            <div
                                className="inline-block px-4 py-2 rounded-lg"
                                style={{ backgroundColor: `rgba(0, 0, 0, ${0.6 * (ctaBgOpacity / 100)})` }}
                            >
                                <h2
                                    className="font-black"
                                    style={{ 
                                        fontSize: `${settings.ctaFontSize * PREVIEW_SCALE_FACTOR}px`,
                                        WebkitTextStroke: `${settings.ctaStrokeSize * PREVIEW_SCALE_FACTOR}px black`,
                                        paintOrder: 'stroke fill',
                                        whiteSpace: 'pre-wrap',
                                    }}
                                >
                                    {parseColoredText(ctaText).map((part, i) => (
                                        <span key={i} style={{ color: part.color }}>{part.text}</span>
                                    ))}
                                </h2>
                            </div>
                         )}
                          {ctaBgOpacity === 0 && (
                             <h2
                                    className="font-black"
                                    style={{ 
                                        fontSize: `${settings.ctaFontSize * PREVIEW_SCALE_FACTOR}px`,
                                        WebkitTextStroke: `${settings.ctaStrokeSize * PREVIEW_SCALE_FACTOR}px black`,
                                        paintOrder: 'stroke fill',
                                        whiteSpace: 'pre-wrap',
                                    }}
                                >
                                    {parseColoredText(ctaText).map((part, i) => (
                                        <span key={i} style={{ color: part.color }}>{part.text}</span>
                                    ))}
                                </h2>
                         )}
                    </div>
                )}

                <button onClick={onClose} className="absolute top-4 right-4 text-white text-2xl font-bold z-10">&times;</button>
            </div>
        </div>
    );
};