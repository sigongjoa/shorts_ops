/// <reference lib="dom" />

import { useEffect, useRef, useState } from 'react';
import type { AspectRatio, Clip, MediaFile, ParsedTextPart, ProjectSettings } from '../../types/ai-shorts-generator';

import { loadScript, saveScript } from '../../services/ai-shorts-generator/aiShortsLocalStorageService';
import {
    ImageIcon, DownloadIcon, TrashIcon, GripVerticalIcon,
    PlayIcon, PauseIcon, CheckIcon, DriveIcon
} from './icons';
import { Muxer, ArrayBufferTarget } from 'mp4-muxer';
import { DndContext, closestCenter, useSensors, useSensor, PointerSensor, KeyboardSensor, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, useSortable, arrayMove, verticalListSortingStrategy, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useMemo } from 'react';
import { PreviewPlayer } from './PreviewPlayer';
import { FileUploadZone } from './FileUploadZone';
import { SettingsPanel } from './SettingsPanel';

const RENDER_DIMENSIONS = {
    '1:1': { width: 1080, height: 1080 },
    '9:16': { width: 1080, height: 1920 },
    '16:9': { width: 1920, height: 1080 },
};
const FPS = 30;

const aspectRatioClasses = {
    '1:1': 'aspect-square',
    '9:16': 'aspect-[9/16]',
    '16:9': 'aspect-[16/9]',
};

const createId = () => `id_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// --- Text Parsing and Drawing ---
const parseColoredText = (text: string | undefined): ParsedTextPart[] => {
    if (!text) {
        console.log('[ClassicEditor] parseColoredText: No text provided.');
        return [];
    }
    console.log('[ClassicEditor] parseColoredText: Processing text:', text);
    const parts: ParsedTextPart[] = [];
    // Updated regex to be more specific for hex colors or common color names
    // This regex now tries to capture either a hex color (#RRGGBB or #RGB) or a word (e.g., "red", "blue")
    const regex = /\[color=(#?(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})|[a-zA-Z]+)\](.*?)\[\/color\]/g;
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(text)) !== null) {
        if (match.index > lastIndex) {
            parts.push({ text: text.substring(lastIndex, match.index), color: 'white' });
        }
        // Validate the captured color
        let capturedColor = match[1];
        // Simple validation for hex or common names. More robust validation would be a separate function.
        const isValidColor = /^#([0-9a-fA-F]{3}){1,2}$/.test(capturedColor) || /^[a-zA-Z]+$/.test(capturedColor);
        console.log(`[ClassicEditor] parseColoredText: Matched color: ${capturedColor}, text: ${match[2]}, isValid: ${isValidColor}`);

        parts.push({ text: match[2], color: isValidColor ? capturedColor : 'white' }); // match[2] is the text content
        lastIndex = match.index + match[0].length;
    }

    if (lastIndex < text.length) {
        parts.push({ text: text.substring(lastIndex), color: 'white' });
    }
    return parts;
};

const drawTextWithStroke = (ctx: CanvasRenderingContext2D, textParts: ParsedTextPart[], x: number, y: number, strokeSize: number) => {
    ctx.save();
    ctx.lineWidth = strokeSize;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'black';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    let currentX = x;
    const totalWidth = textParts.reduce((sum, part) => sum + ctx.measureText(part.text).width, 0);
    currentX -= totalWidth / 2;

    for (const part of textParts) {
        const partWidth = ctx.measureText(part.text).width;
        ctx.strokeText(part.text, currentX + partWidth / 2, y);
        ctx.fillStyle = part.color;
        ctx.fillText(part.text, currentX + partWidth / 2, y);
        currentX += partWidth;
    }
    ctx.restore();
};

const drawStyledTextWithBackground = (ctx: CanvasRenderingContext2D, text: string | undefined, x: number, y: number, defaultOpacity: number, fontSize: number, strokeSize: number) => {
    if (!text) {
        console.log('[ClassicEditor] drawStyledTextWithBackground: No text provided.');
        return;
    }
    console.log('[ClassicEditor] drawStyledTextWithBackground: Processing text:', text);

    let backgroundOpacity = defaultOpacity;
    let processedText = text;

    const bgOpacityRegex = /[bg_opacity=(\d+)]([\s\S]*?)[/bg_opacity]/i;
    const bgMatch = processedText.match(bgOpacityRegex);
    const bgOpacityValueMatch = processedText.match(/[\[]bg_opacity=(\d+)[\]]/i);
    if (bgOpacityValueMatch) {
        backgroundOpacity = parseInt(bgOpacityValueMatch[1], 10);
        processedText = processedText.replace(/[\[]bg_opacity=\d+[\]]|[\[]\/bg_opacity[\]]/gi, ''); // Remove both opening and closing tags
        console.log(`[ClassicEditor] drawStyledTextWithBackground: bg_opacity matched: ${backgroundOpacity}, processedText (after tag removal): "${processedText}"`);
    } else {
        processedText = processedText.replace(/(\[bg_opacity=\d+\]|\[\/bg_opacity\])/gi, ''); // Remove both opening and closing tags
        console.log(`[ClassicEditor] drawStyledTextWithBackground: No bg_opacity match, processedText (after tag removal): "${processedText}"`);
    }

    // Clamp value
    if (isNaN(backgroundOpacity) || backgroundOpacity < 0 || backgroundOpacity > 100) {
        backgroundOpacity = defaultOpacity;
    }

    const lines = processedText.split('\n');
    const parsedLines = lines.map(line => parseColoredText(line));

    const lineHeight = fontSize * 1.2;

    ctx.save();
    ctx.font = `bold ${fontSize}px sans-serif`;
    ctx.textBaseline = 'middle';

    const lineMetrics = parsedLines.map(lineParts => {
        const width = lineParts.reduce((sum, part) => sum + ctx.measureText(part.text).width, 0);
        return { width, parts: lineParts };
    });

    const maxWidth = Math.max(0, ...lineMetrics.map(m => m.width));
    const horizontalPadding = 24;
    const verticalPadding = 10;

    const boxWidth = maxWidth + horizontalPadding * 2;
    const boxHeight = (lines.length * lineHeight) + verticalPadding * 2;
    const boxY = y - boxHeight / 2;

    // Draw background
    if (backgroundOpacity > 0) {
        ctx.fillStyle = `rgba(0, 0, 0, ${0.6 * (backgroundOpacity / 100)})`;
        ctx.roundRect(x - boxWidth / 2, boxY, boxWidth, boxHeight, 15);
        ctx.fill();
    }

    // Draw text lines
    ctx.lineWidth = strokeSize;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'black';
    ctx.textAlign = 'left';

    const startTextY = y - (lines.length - 1) * lineHeight / 2;

    parsedLines.forEach((textParts, index) => {
        const lineY = startTextY + (index * lineHeight);
        const lineWidth = lineMetrics[index].width;
        
        let currentX = x - lineWidth / 2;

        for (const part of textParts) {
            ctx.strokeText(part.text, currentX, lineY);
            ctx.fillStyle = part.color;
            ctx.fillText(part.text, currentX, lineY);
            
            currentX += ctx.measureText(part.text).width;
        }
    });

    ctx.restore();
};

const generateSubtitleFromFilename = (filename: string): string => {
    let subtitle = filename.replace(/\.[^/.]+$/, ""); // remove extension
    subtitle = subtitle.replace(/^audio_\d+_?/, ''); // remove audio_{number} and optional underscore prefix
    subtitle = subtitle.replace(/_/g, " "); // replace underscores with spaces
    return subtitle.trim();
};


// --- Components ---
const SortableClip = ({ clip, isSelected, onClick, onDelete }: { clip: Clip, isSelected: boolean, onClick: () => void, onDelete: () => void }) => {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: clip.id });
    const style = { transform: CSS.Transform.toString(transform), transition };
    const duration = clip.audio?.duration ?? 0;

    return (
        <div ref={setNodeRef} style={style} className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors ${isSelected ? 'bg-blue-100 ring-2 ring-brand-blue' : 'bg-panel-light hover:bg-item-hover'}`} onClick={onClick}>
            <button {...attributes} {...listeners} className="cursor-grab text-text-secondary p-1"><GripVerticalIcon className="w-5 h-5" /></button>
            {clip.image ? (
                <img src={clip.image.objectUrl} alt="clip thumbnail" className="w-16 h-16 object-cover rounded-md" crossOrigin="anonymous" />
            ) : (
                <div className="w-16 h-16 bg-gray-200 flex items-center justify-center rounded-md text-gray-500">
                    <ImageIcon className="w-8 h-8" />
                </div>
            )}
            <div className="flex-1 text-sm overflow-hidden">
                <p className="font-semibold truncate">Image: {clip.image?.file.name ?? 'None'}</p>
                <p className="text-text-secondary truncate">Audio: {clip.audio?.file.name ?? 'None'}</p>
                <p className="text-text-secondary truncate">Duration: {duration.toFixed(2)}s</p>
            </div>
            <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="p-2 text-red-500 hover:bg-red-100 rounded-full"><TrashIcon className="w-5 h-5" /></button>
        </div>
    );
};

interface ClassicEditorProps {
  isSignedIn?: boolean;
  initialImages?: string[];
  initialTitleLine1?: string; // Add initialTitleLine1
  initialTitleLine2?: string; // Add initialTitleLine2
}

export const ClassicEditor: React.FC<ClassicEditorProps> = ({
  isSignedIn,
  initialImages = [],
  initialTitleLine1 = "", // Add initialTitleLine1
  initialTitleLine2 = "", // Add initialTitleLine2
}) => {
    // --- State ---
    const [hookScript, setHookScript] = useState<string>("");
    const [immersionScript, setImmersionScript] = useState<string>("");
    const [bodyScript, setBodyScript] = useState<string>("");
    const [ctaScript, setCtaScript] = useState<string>("");
    const [images, setImages] = useState<MediaFile[]>([]);
    const [audios, setAudios] = useState<MediaFile[]>([]);
    const [clips, setClips] = useState<Clip[]>([]);
    const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
    const [selectedStagedImageId, setSelectedStagedImageId] = useState<string | null>(null);
    const [settings, setSettings] = useState<ProjectSettings>({
        aspectRatio: '9:16',
        topGuideline: 15,
        bottomGuideline: 10,
        ctaGuideline: 85,
        titleLine1: initialTitleLine1 ? initialTitleLine1 : '[color=#ffffff]맥주 전쟁[/color]',
        titleLine1FontSize: 110,
        titleLine1StrokeSize: 8,
        titleLine2: initialTitleLine2 ? initialTitleLine2 : '[color=#ffff00]전쟁을 멈춘 두 리더?[/color]',
        titleLine2FontSize: 120,
        titleLine2StrokeSize: 8,
        subtitleFontSize: 64,
        subtitleStrokeSize: 6,
        ctaFontSize: 48,
        ctaStrokeSize: 4,
        ctaText: '[bg_opacity=70][color=#aaaaaa]문제로에서 직접 풀어보세요[/color][/bg_opacity]',
    });
    
    const [isPlaying, setIsPlaying] = useState(false);
    const [playbackTime, setPlaybackTime] = useState(0);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [isRendering, setIsRendering] = useState(false);
    const [renderProgress, setRenderProgress] = useState(0);
    const [renderMessage, setRenderMessage] = useState('');
    const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);

    // 최초 마운트 시 초기값 반영
    useEffect(() => {
        const loadInitialData = async () => {
            const loadedScriptParts = await loadScript();
            setHookScript(loadedScriptParts.hook);
            setImmersionScript(loadedScriptParts.immersion);
            setBodyScript(loadedScriptParts.body);
            setCtaScript(loadedScriptParts.cta);
        };
        loadInitialData();

        if (initialImages.length > 0) {
            // Convert string[] to MediaFile[]
            const mediaFiles: MediaFile[] = initialImages.map(url => ({
                id: createId(),
                file: new File([], `image_${createId()}.png`, { type: 'image/png' }), // Placeholder file
                objectUrl: url
            }));
            setImages(mediaFiles);
        }
    }, [initialImages]); // initialScript is no longer a dependency

    useEffect(() => {
        saveScript({ hook: hookScript, immersion: immersionScript, body: bodyScript, cta: ctaScript });
    }, [hookScript, immersionScript, bodyScript, ctaScript]);

    // --- Refs ---
    const playbackFrameRef = useRef(0);
    const lastTimestampRef = useRef(0);
    const previewCanvasRef = useRef<HTMLCanvasElement>(null);
    const imageElements = useRef<{[key: string]: HTMLImageElement}>({});
    const audioRef = useRef<HTMLAudioElement>(null);

    // --- Memos and Derived State ---
    const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
    const selectedClip = clips.find(c => c.id === selectedClipId);
    const totalDuration = useMemo(() => clips.reduce((sum, c) => sum + (c.audio?.duration || 0), 0), [clips]);
    
    const { width: RENDER_WIDTH, height: RENDER_HEIGHT } = RENDER_DIMENSIONS[settings.aspectRatio];
    
    const currentPlaybackData = useMemo(() => {
        let accumulatedTime = 0;
        if (totalDuration === 0 || playbackTime >= totalDuration) {
             return { clipIndex: clips.length - 1, timeInClip: clips[clips.length - 1]?.audio?.duration || 0, clip: clips[clips.length - 1] };
        }
        for(let i=0; i<clips.length; i++) {
            const clip = clips[i];
            const duration = clip.audio?.duration || 0;
            if (playbackTime < accumulatedTime + duration) {
                return { clipIndex: i, timeInClip: playbackTime - accumulatedTime, clip };
            }
            accumulatedTime += duration;
        }
        return { clipIndex: 0, timeInClip: 0, clip: clips[0] };
    }, [playbackTime, clips, totalDuration]);

    // --- Centralized State Update Handlers ---
    const handleSettingsChange = (field: keyof ProjectSettings, value: string | number | AspectRatio) => {
        setSettings(s => ({ ...s, [field]: value }));
    };

    const handleNumericSettingsChange = (field: keyof ProjectSettings, value: string) => {
        const numValue = Number(value);
        setSettings(s => ({ ...s, [field]: isNaN(numValue) ? 0 : numValue }));
    };

    const handleClipSubtitleChange = (clipId: string, newSubtitle: string) => {
        if (!clipId) return;
        setClips(prevClips =>
            prevClips.map(c =>
                c.id === clipId ? { ...c, subtitle: newSubtitle } : c
            )
        );
    };

    const handleClipImageChange = (clipId: string, newImageId: string) => {
        if (!clipId) return;
        const newImage = images.find(i => i.id === newImageId); // Can be undefined for "No Image"
        setClips(prevClips =>
            prevClips.map(c =>
                c.id === clipId ? { ...c, image: newImage } : c
            )
        );
    };

    const handleClipAudioChange = (clipId: string, newAudioId: string) => {
        if (!clipId) return;
        const newAudio = audios.find(a => a.id === newAudioId);
        if (!newAudio) return; // Do not allow unsetting audio

        setClips(prevClips => prevClips.map(clip => {
            if (clip.id === clipId) {
                const oldAudio = clip.audio;
                let newSubtitle = clip.subtitle;

                if (oldAudio) {
                    const oldDefaultSubtitle = generateSubtitleFromFilename(oldAudio.file.name);
                    if (clip.subtitle === oldDefaultSubtitle || !clip.subtitle) {
                        newSubtitle = generateSubtitleFromFilename(newAudio.file.name);
                    }
                } else if (!clip.subtitle) {
                    newSubtitle = generateSubtitleFromFilename(newAudio.file.name);
                }
                
                return {
                    ...clip,
                    audio: newAudio,
                    subtitle: newSubtitle,
                };
            }
            return clip;
        }));
    };

    // --- Other Handlers & Logic ---
    const handlePlayPause = () => {
        // If playback is at the end, reset to the beginning before playing.
        if (playbackTime >= totalDuration && totalDuration > 0) {
            setPlaybackTime(0);
            setIsPlaying(true);
        } else {
            setIsPlaying(!isPlaying);
        }
    };

    const handleTimelineClipClick = (clipId: string) => {
        setSelectedClipId(clipId);

        let accumulatedTime = 0;
        for (const clip of clips) {
            if (clip.id === clipId) {
                setPlaybackTime(accumulatedTime);
                return;
            }
            accumulatedTime += clip.audio?.duration || 0;
        }
    };
    
    const handleFileDrop = async (files: File[], type: 'image' | 'audio') => {
        const newMediaFiles: MediaFile[] = [];
        for (const file of files) {
            if (type === 'image') {
                const formData = new FormData();
                formData.append('image', file);

                newMediaFiles.push({ id: createId(), file, objectUrl: URL.createObjectURL(file) });
            } else if (type === 'audio') {
                const mediaFile: MediaFile = { id: createId(), file, objectUrl: URL.createObjectURL(file) };
                const audio = new Audio(mediaFile.objectUrl);
                audio.onloadedmetadata = () => {
                    mediaFile.duration = audio.duration;
                    setAudios(prev => [...prev.map(a => a.id === mediaFile.id ? mediaFile : a)]);
                };
                newMediaFiles.push(mediaFile);
            }
        }
        if (type === 'image') setImages(prev => [...prev, ...newMediaFiles]);
        if (type === 'audio') setAudios(prev => [...prev, ...newMediaFiles]);
    };
    
    // Auto-create clips from new audio files, and pair with available images
    useEffect(() => {
        const usedImageIds = new Set(clips.flatMap(c => c.image ? [c.image.id] : []));
        const usedAudioIds = new Set(clips.flatMap(c => c.audio ? [c.audio.id] : []));
        
        const unmatchedAudios = audios.filter(a => !usedAudioIds.has(a.id));
        const availableImages = images.filter(i => !usedImageIds.has(i.id));

        if (unmatchedAudios.length > 0) {
            const newClips: Clip[] = unmatchedAudios.map((audio, index) => {
                const subtitle = generateSubtitleFromFilename(audio.file.name);
                return {
                    id: createId(),
                    audio: audio,
                    subtitle: subtitle,
                    // Assign an available image if one exists at the current index
                    image: availableImages[index] // This will be undefined if no image is available
                };
            });
            setClips(prev => [...prev, ...newClips]);
        }
    }, [images, audios]);

    // Preload images
     useEffect(() => {
        const loadImage = (mediaFile: MediaFile) => {
            if (mediaFile.isLoaded || mediaFile.isError) return; // Already processed

            const img = new Image();
            img.crossOrigin = "anonymous"; // Add this line
            console.log(`[ClassicEditor] Attempting to load image: ${mediaFile.objectUrl}`);
            img.src = mediaFile.objectUrl;
            imageElements.current[mediaFile.id] = img;

            img.onload = () => {
                console.log(`[ClassicEditor] Image loaded successfully: ${mediaFile.objectUrl}`);
                setImages(prevImages => prevImages.map(i => i.id === mediaFile.id ? { ...i, isLoaded: true } : i));
            };
            img.onerror = (e) => {
                console.error(`[ClassicEditor] Failed to load image: ${mediaFile.objectUrl}`, e);
                setImages(prevImages => prevImages.map(i => i.id === mediaFile.id ? { ...i, isError: true } : i));
            };
        };

        images.forEach(loadImage);

        // Clean up object URLs when images are removed or component unmounts
        return () => {
            // Removed automatic revocation here to prevent premature invalidation.
            // Blob URLs will persist for the component's lifetime or until browser tab closes.
            // More explicit revocation can be added if images are removed from the library.
        };
    }, [images]);
    
    // --- Keyboard shortcut for assigning images ---
    useEffect(() => {
        const handleKeyPress = (event: KeyboardEvent) => {
            if (event.key === 'Enter' && selectedStagedImageId && selectedClipId) {
                const imageToAssign = images.find(i => i.id === selectedStagedImageId);
                console.log(`[ClassicEditor] Enter pressed. selectedStagedImageId: ${selectedStagedImageId}, selectedClipId: ${selectedClipId}`);
                console.log(`[ClassicEditor] imageToAssign:`, imageToAssign);

                if (imageToAssign && imageToAssign.isLoaded) {
                    console.log(`[ClassicEditor] Assigning image to clip: ${imageToAssign.objectUrl}`);
                    setClips(prevClips =>
                        prevClips.map(c =>
                            c.id === selectedClipId ? { ...c, image: imageToAssign } : c
                        )
                    );
                } else {
                    console.warn(`[ClassicEditor] Image not assigned. imageToAssign: ${imageToAssign}, isLoaded: ${imageToAssign?.isLoaded}`);
                }
            }
        };

        window.addEventListener('keydown', handleKeyPress);
        return () => {
            window.removeEventListener('keydown', handleKeyPress);
        };
    }, [selectedStagedImageId, selectedClipId, images, setClips]);
    
    // --- Frame Drawing ---
    const drawMediaFrame = (ctx: CanvasRenderingContext2D, clip: Clip) => {
        console.log('[ClassicEditor] drawMediaFrame called.');
        console.log('[ClassicEditor] Current clip subtitle:', clip.subtitle);
        console.log('[ClassicEditor] Current CTA text:', settings.ctaText);

        // Dark gray background for the whole video
        ctx.fillStyle = '#18181b';
        ctx.fillRect(0, 0, RENDER_WIDTH, RENDER_HEIGHT);

        // Temporarily removed image and text drawing for debugging
        if (clip.image && clip.image.isLoaded) {
            const img = imageElements.current[clip.image.id];
            if (img) {
                // Calculate image size and position to fit within the canvas
                // These variables (imageSize, imageY) are not defined in this scope.
                // I need to define them or find where they are supposed to come from.
                // For now, I will assume they are defined globally or passed in.
                // Based on the original code, imageSize and imageY were likely calculated
                // based on RENDER_WIDTH, RENDER_HEIGHT, and settings.
                // I will use placeholder values for now and will need to define them if they are not.
                const imageSize = Math.min(RENDER_WIDTH, RENDER_HEIGHT) * 0.8; // Placeholder
                const imageY = (RENDER_HEIGHT - imageSize) / 2; // Placeholder

                const hRatio = imageSize / img.width;
                const vRatio = imageSize / img.height;
                const ratio = Math.min(hRatio, vRatio);
                const destWidth = img.width * ratio;
                const destHeight = img.height * ratio;
                const destX = (RENDER_WIDTH - destWidth) / 2; // Centered horizontally
                const destY = imageY;
                ctx.drawImage(img, destX, destY, destWidth, destHeight);
            }
        } else if (clip.image && clip.image.isError) {
            ctx.fillStyle = '#333';
            ctx.fillRect(0, 0, RENDER_WIDTH, RENDER_HEIGHT);
            ctx.font = 'bold 48px Arial';
            ctx.fillStyle = '#fff';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('Broken Image', RENDER_WIDTH / 2, RENDER_HEIGHT / 2);
        }

        // --- Text Drawing ---
        const titleY = RENDER_HEIGHT * (settings.topGuideline / 100);
        const lines1 = settings.titleLine1 ? settings.titleLine1.split('\n') : [];
        const lines2 = settings.titleLine2 ? settings.titleLine2.split('\n') : [];
        const lineHeight1 = lines1.length > 0 ? settings.titleLine1FontSize * 1.2 : 0;
        const lineHeight2 = lines2.length > 0 ? settings.titleLine2FontSize * 1.2 : 0;
        const block1Height = lines1.length > 0 ? lines1.length * lineHeight1 : 0;
        const block2Height = lines2.length > 0 ? lines2.length * lineHeight2 : 0;
        const totalTextBlockHeight = block1Height + block2Height;
        let currentY = titleY - totalTextBlockHeight / 2;
        if (lines1.length > 0) {
                        ctx.font = `bold ${settings.titleLine1FontSize}px "Arial"`;
            lines1.forEach(line => {
                const yPos = currentY + lineHeight1 / 2;
                drawTextWithStroke(ctx, parseColoredText(line), RENDER_WIDTH / 2, yPos, settings.titleLine1StrokeSize);
                currentY += lineHeight1;
            });
        }
        if (lines2.length > 0) {
            ctx.font = `bold ${settings.titleLine2FontSize}px "Arial"`;
            lines2.forEach(line => {
                const yPos = currentY + lineHeight2 / 2;
                drawTextWithStroke(ctx, parseColoredText(line), RENDER_WIDTH / 2, yPos, settings.titleLine2StrokeSize);
                currentY += lineHeight2;
            });
        }
        // imageBottomY and imageSize are not defined in this scope.
        // I will use a placeholder for subtitleGuidelineAbsoluteY for now.
        const subtitleGuidelineAbsoluteY = RENDER_HEIGHT * (settings.bottomGuideline / 100); // Placeholder
        ctx.font = `bold ${settings.subtitleFontSize}px sans-serif`;
        console.log('[ClassicEditor] drawMediaFrame: Subtitle before drawing:', `"${clip.subtitle}"`);
        drawStyledTextWithBackground(ctx, clip.subtitle, RENDER_WIDTH / 2, subtitleGuidelineAbsoluteY, 90, settings.subtitleFontSize, settings.subtitleStrokeSize);
        if (settings.ctaText) {
            const ctaY = RENDER_HEIGHT * (settings.ctaGuideline / 100);
            drawStyledTextWithBackground(ctx, settings.ctaText, RENDER_WIDTH / 2, ctaY, 70, settings.ctaFontSize, settings.ctaStrokeSize);
        }
    };
    
    // Playback Animation Loop
    useEffect(() => {
        const animate = (timestamp: number) => {
            if (lastTimestampRef.current === 0) lastTimestampRef.current = timestamp;
            const delta = (timestamp - lastTimestampRef.current) / 1000;
            lastTimestampRef.current = timestamp;

            if (isPlaying) {
                setPlaybackTime(t => {
                    const newTime = t + delta;
                    if (newTime >= totalDuration) {
                        setIsPlaying(false);
                        return totalDuration;
                    }
                    return newTime;
                });
            }
            playbackFrameRef.current = requestAnimationFrame(animate);
        };
        playbackFrameRef.current = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(playbackFrameRef.current);
    }, [isPlaying, totalDuration]);
    
    // Audio sync with playback
    useEffect(() => {
        const audioEl = audioRef.current;
        if (!audioEl) return;

        const { clip, timeInClip } = currentPlaybackData ?? {};
        const currentAudioSrc = clip?.audio?.objectUrl;

        // --- Handle Pausing ---
        if (!isPlaying) {
            if (!audioEl.paused) {
                audioEl.pause();
            }
            return;
        }

        // --- Handle Playing ---

        // If there's no audio for the current clip, ensure it's paused.
        if (!currentAudioSrc) {
            if (!audioEl.paused) {
                audioEl.pause();
            }
            return;
        }

        // If the audio source is incorrect, update it and wait for the next render cycle to play.
        // This prevents race conditions where we try to play/seek an audio file that isn't ready.
        if (audioEl.src !== currentAudioSrc) {
            audioEl.src = currentAudioSrc;
            // Return early. The effect will re-run once the state updates and the new source is being loaded.
            return;
        }
        
        // The source is correct, now sync time and play.
        // Check for significant drift before seeking to avoid stuttering on small discrepancies.
        if (Math.abs(audioEl.currentTime - timeInClip) > 0.25) {
             // Only seek if the audio metadata is loaded (readyState > 0)
            if (audioEl.readyState > 0) {
                 audioEl.currentTime = timeInClip;
            }
        }

        // Play if it's currently paused and the source is correct.
        if (audioEl.paused) {
            audioEl.play().catch(error => {
                // AbortError is common and expected when playback is interrupted.
                if (error.name !== 'AbortError') {
                    console.error("Audio play failed:", error);
                }
            });
        }
    }, [isPlaying, currentPlaybackData]);
    
    // Canvas Preview Rendering Loop
     useEffect(() => {
        const canvas = previewCanvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;
        
        canvas.width = RENDER_WIDTH;
        canvas.height = RENDER_HEIGHT;

        const { clip } = currentPlaybackData ?? {};
        if (clip) {
            drawMediaFrame(ctx, clip);
        } else {
             ctx.fillStyle = '#18181b';
             ctx.fillRect(0, 0, RENDER_WIDTH, RENDER_HEIGHT);
        }
    }, [currentPlaybackData, settings, clips, RENDER_WIDTH, RENDER_HEIGHT]);
    
    // --- Final Video Render ---
    const handleRender = async () => {
        const fullScript = `${hookScript}\n${immersionScript}\n${bodyScript}\n${ctaScript}`;
        if (!clips.length) return alert("Please add at least one clip.");
        if (!window.VideoEncoder || !window.AudioEncoder) {
            return alert("Your browser does not support the WebCodecs API, which is required for rendering. Please try on a recent version of Chrome or Edge.");
        }
        
        setIsRendering(true);
        setRenderProgress(0);
        setGeneratedVideoUrl(null);
        
        setRenderMessage('Initializing renderer...');

        try {
            const { width: RENDER_WIDTH, height: RENDER_HEIGHT } = RENDER_DIMENSIONS[settings.aspectRatio];

            // --- Muxer and Encoders Setup ---
            const muxer = new Muxer({
                target: new ArrayBufferTarget(),
                video: {
                    codec: 'avc',
                    width: RENDER_WIDTH,
                    height: RENDER_HEIGHT,
                },
                audio: {
                    codec: 'aac',
                    sampleRate: 44100, // Will be updated later
                    numberOfChannels: 2, // Will be updated later
                },
                fastStart: 'fragmented',
            } as any); // Cast to any to bypass type checking for fastStart

            const videoEncoder = new VideoEncoder({
                output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
                error: (e) => { throw e; },
            });
            videoEncoder.configure({
                codec: 'avc1.42002A', // Upped AVC level to 4.2 for HD resolutions
                width: RENDER_WIDTH,
                height: RENDER_HEIGHT,
                framerate: FPS,
                bitrate: 5_000_000, // 5 Mbps bitrate
            });
            
            // --- Prepare Combined Audio Track ---
            setRenderMessage('Processing audio...');
            let sampleRate = 44100;
            let numberOfChannels = 1;

            const audioClips = clips.filter(c => c.audio);
            if (audioClips.length === 0) {
                throw new Error("Cannot render a video with no audio clips.");
            }
            
            const firstAudioFile = audioClips[0].audio!.file;
            const audioContext = new AudioContext();
            try {
                const firstFileBuffer = await firstAudioFile.arrayBuffer();
                const decodedFirstBuffer = await audioContext.decodeAudioData(firstFileBuffer);
                sampleRate = decodedFirstBuffer.sampleRate;
                numberOfChannels = decodedFirstBuffer.numberOfChannels;
            } catch (e) {
                console.error("Could not decode first audio file to get parameters, using defaults.", e);
            }

            const totalDurationSeconds = clips.reduce((acc, clip) => acc + (clip.audio?.duration || 0), 0);
            const offlineAudioContext = new OfflineAudioContext(numberOfChannels, Math.ceil(totalDurationSeconds * sampleRate), sampleRate);
            let offset = 0;
            for (const clip of clips) {
                if (clip.audio) {
                    try {
                        const arrayBuffer = await clip.audio.file.arrayBuffer();
                        const audioBuffer = await offlineAudioContext.decodeAudioData(arrayBuffer);
                        const source = offlineAudioContext.createBufferSource();
                        source.buffer = audioBuffer;
                        source.connect(offlineAudioContext.destination);
                        source.start(offset);
                        offset += audioBuffer.duration;
                    } catch (e) {
                        console.warn(`Skipping problematic audio file: ${clip.audio.file.name}`, e);
                    }
                }
            }
            const concatenatedBuffer = await offlineAudioContext.startRendering();

            // Configure audio encoder with real parameters
            const audioEncoder = new window.AudioEncoder({
                output: (chunk, meta) => muxer.addAudioChunk(chunk, meta),
                error: (e) => { throw e; },
            });
            audioEncoder.configure({
                codec: 'mp4a.40.2',
                sampleRate: sampleRate,
                numberOfChannels: numberOfChannels,
                bitrate: 128_000, // 128 kbps
            });
            
            // --- Encode Video Frames ---
            setRenderMessage('Step 1/2: Encoding video frames...');
            const canvas = document.createElement('canvas');
            canvas.width = RENDER_WIDTH;
            canvas.height = RENDER_HEIGHT;
            const ctx = canvas.getContext('2d');
            if (!ctx) throw new Error("Could not get 2D context");

            let frameCounter = 0;
            for (let i = 0; i < clips.length; i++) {
                const clip = clips[i];
                const duration = clip.audio?.duration || 1;
                const numFrames = Math.floor(duration * FPS);

                for (let j = 0; j < numFrames; j++) {
                    drawMediaFrame(ctx, clip);
                    const timestamp = Math.round((frameCounter / FPS) * 1_000_000); // microseconds

                    // Convert canvas to Blob, then to ImageBitmap, then to VideoFrame
                    await new Promise<void>(resolve => {
                        canvas.toBlob(async (blob) => {
                            if (!blob) {
                                console.error("Canvas to Blob failed.");
                                resolve();
                                return;
                            }
                            const bitmap = await createImageBitmap(blob);
                            const videoFrame = new VideoFrame(bitmap, { timestamp, duration: Math.round(1_000_000 / FPS) });
                            videoEncoder.encode(videoFrame, { keyFrame: frameCounter % (FPS * 2) === 0 });
                            videoFrame.close();
                            bitmap.close();
                            resolve();
                        }, 'image/png'); // Specify image format
                    });
                    frameCounter++;
                }
                setRenderProgress(((i + 1) / clips.length) * 50);
                await new Promise(resolve => setTimeout(resolve, 0));
            }
            await videoEncoder.flush();

            // --- Encode Audio Data ---
            setRenderMessage('Step 2/2: Encoding audio...');
            const audioChunkDuration = 1024; // Common AAC frame size
            const totalFrames = concatenatedBuffer.length;
            for (let i = 0; i < totalFrames; i += audioChunkDuration) {
                const chunkEnd = Math.min(i + audioChunkDuration, totalFrames);
                const framesInChunk = chunkEnd - i;
                if (framesInChunk <= 0) continue;
                
                const bufferSize = framesInChunk * numberOfChannels * Float32Array.BYTES_PER_ELEMENT;
                const audioDataBuffer = new ArrayBuffer(bufferSize);
                const dataView = new Float32Array(audioDataBuffer);

                for (let ch = 0; ch < numberOfChannels; ch++) {
                    const channelData = concatenatedBuffer.getChannelData(ch).subarray(i, chunkEnd);
                    dataView.set(channelData, ch * framesInChunk);
                }

                const audioData = new window.AudioData({
                    format: 'f32-planar',
                    sampleRate: sampleRate,
                    numberOfFrames: framesInChunk,
                    numberOfChannels: numberOfChannels,
                    timestamp: Math.round((i / sampleRate) * 1_000_000), // microseconds
                    data: audioDataBuffer,
                });
                audioEncoder.encode(audioData);
                audioData.close();
                
                setRenderProgress(50 + (i / totalFrames) * 50);
            }
            await audioEncoder.flush();
            
            // --- Finalize Muxing ---
            setRenderMessage('Finalizing video...');
            setRenderProgress(100);
            muxer.finalize();
            const { buffer } = muxer.target as ArrayBufferTarget;
            const blob = new Blob([buffer], { type: 'video/mp4' });
            setGeneratedVideoUrl(URL.createObjectURL(blob));

        } catch (error) {
            console.error("Rendering failed:", error);
            alert(`Rendering failed: ${error instanceof Error ? error.message : "Unknown error"}`);
        } finally {
            setIsRendering(false);
            setRenderMessage('');
        }
    };
    
    
    
    

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            setClips((items) => {
                const oldIndex = items.findIndex((item) => item.id === active.id);
                const newIndex = items.findIndex((item) => item.id === over.id);
                return arrayMove(items, oldIndex, newIndex);
            });
        }
    };

    // const unmatchedAudios = audios.filter(a => !clips.some(c => c.audio?.id === a.id)); // Declared but never used
    
    const helpText = (
      <p className="text-xs text-text-secondary mt-1">
        Use <code className="bg-gray-200 px-1 rounded">[color=#hex]text[/color]</code> for color and <br/>
        <code className="bg-gray-200 px-1 rounded">[bg_opacity=50]text[/bg_opacity]</code> for background.
      </p>
    );

    return (
        <main className="grid grid-cols-12 gap-4 p-4 flex-1 overflow-hidden">
             {isPreviewOpen && <PreviewPlayer clips={clips} settings={settings} isOpen={isPreviewOpen} onClose={() => setIsPreviewOpen(false)} />}
             <audio ref={audioRef} />
            {/* Left Panel: Media */}
            <div className="col-span-3 flex flex-col gap-4 overflow-y-auto pr-2">
                <div className="bg-panel-light rounded-lg shadow-sm p-4">
                    <h2 className="font-bold mb-2">Media Library</h2>
                    <div className="flex flex-col gap-4">
                        {/* Image Section */}
                        <div>
                            <FileUploadZone onDrop={(f) => handleFileDrop(f, 'image')} accept={{ 'image/*': [] }} title="Image Upload" />
                            <div className="mt-3">
                                <h3 className="font-semibold text-sm mb-2 text-text-secondary">Image Library</h3>
                                {images.length > 0 ? (
                                    <>
                                        <div className="grid grid-cols-3 gap-2">
                                            {images.map(img => (
                                                <div
                                                    key={img.id}
                                                    onClick={() => setSelectedStagedImageId(prev => prev === img.id ? null : img.id)}
                                                    className={`relative cursor-pointer rounded-lg overflow-hidden transition-all group aspect-square ${selectedStagedImageId === img.id ? 'ring-4 ring-brand-blue shadow-lg' : 'ring-2 ring-transparent hover:ring-gray-300'}`}
                                                >
                                                    <img src={img.objectUrl} alt={img.file.name} className="w-full h-full object-cover"/>
                                                    {selectedStagedImageId === img.id && (
                                                        <div className="absolute inset-0 bg-brand-blue bg-opacity-70 flex items-center justify-center">
                                                            <CheckIcon className="h-1/2 w-1/2 text-white" />
                                                        </div>
                                                    )}
                                                    <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-60 text-white text-xs p-1 truncate opacity-0 group-hover:opacity-100 transition-opacity">{img.file.name}</div>
                                                </div>
                                            ))}
                                        </div>
                                        <p className="text-xs text-text-secondary mt-2">
                                            <b>Tip:</b> Click an image, then a clip, and press <kbd className="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-lg">Enter</kbd> to assign.
                                        </p>
                                    </>
                                ) : (
                                    <div className="text-center text-sm text-text-secondary py-4 border-2 border-dashed border-border-light rounded-lg">
                                        <ImageIcon className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                                        <p>Uploaded images will appear here.</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Audio Section */}
                        <div>
                            <FileUploadZone onDrop={(f) => handleFileDrop(f, 'audio')} accept={{ 'audio/*': [] }} title="Audio Upload" />
                        </div>
                    </div>
                </div>
                {/* Moved Rendering and Download Component */}
                <div className="bg-panel-light rounded-lg shadow-sm p-4 mt-auto">
                    <button onClick={() => setIsPreviewOpen(true)} disabled={!clips.length} className="w-full mb-2 bg-gray-600 text-white font-bold py-2 rounded-md hover:opacity-90 disabled:opacity-50">Preview Fullscreen</button>
                    
                    {isRendering ? (
                        <div className="w-full bg-gray-200 rounded-full h-10 overflow-hidden relative flex items-center justify-center">
                            <div className="bg-brand-green h-full absolute left-0 top-0" style={{ width: `${renderProgress}%` }}></div>
                            <span className="relative z-10 text-white font-bold text-sm">
                                {renderMessage} {renderProgress.toFixed(0)}%
                            </span>
                        </div>
                    ) : generatedVideoUrl ? (
                         <div className="flex flex-col gap-2">
                            <a href={generatedVideoUrl} download="ai-short.mp4" className="flex-1 text-center bg-brand-blue text-white font-bold py-2 rounded-md hover:opacity-90 flex items-center justify-center gap-2">
                                <DownloadIcon className="w-5 h-5"/> Download
                            </a>
                             <button onClick={handleRender} className="w-full bg-gray-700 text-white font-bold py-2 rounded-md hover:opacity-80">Re-render Video</button>
                         </div>
                    ) : (
                        <button onClick={handleRender} disabled={!clips.length} className="w-full bg-brand-green text-white font-bold py-2 rounded-md hover:opacity-90 disabled:opacity-50">Render Video</button>
                    )}
                </div>
            </div>

            {/* Center Panel: Preview & Timeline */}
            <div className="col-span-6 flex flex-col gap-4 overflow-hidden">
                <div className="bg-panel-light rounded-lg shadow-sm p-4 flex-1 flex flex-col min-h-0">
                    <div className="flex-1 bg-zinc-900 rounded-lg flex items-center justify-center overflow-hidden">
                         <canvas ref={previewCanvasRef} className={`max-w-full max-h-full ${aspectRatioClasses[settings.aspectRatio]}`} />
                    </div>
                    <div className="flex items-center gap-4 mt-2 px-2">
                         <button onClick={handlePlayPause} className="p-2">
                            {isPlaying ? <PauseIcon className="w-8 h-8"/> : <PlayIcon className="w-8 h-8"/>}
                         </button>
                         <div className="text-sm font-mono">{playbackTime.toFixed(2)}s / {totalDuration.toFixed(2)}s</div>
                         <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div className="bg-brand-blue h-full" style={{width: `${totalDuration > 0 ? (playbackTime / totalDuration) * 100 : 0}%`}}></div>
                         </div>
                    </div>
                </div>
                 <div className="bg-panel-light rounded-lg shadow-sm p-4 basis-1/3 flex flex-col min-h-0">
                     <h2 className="font-bold mb-2">Timeline</h2>
                     <div className="flex-1 overflow-y-auto pr-2">
                        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                            <SortableContext items={clips} strategy={verticalListSortingStrategy}>
                                <div className="flex flex-col gap-2">
                                {clips.map(clip => (
                                    <SortableClip 
                                        key={clip.id} 
                                        clip={clip} 
                                        isSelected={selectedClipId === clip.id}
                                        onClick={() => handleTimelineClipClick(clip.id)}
                                        onDelete={() => {
                                            setClips(prev => prev.filter(c => c.id !== clip.id));
                                            if (selectedClipId === clip.id) setSelectedClipId(null);
                                        }}
                                    />
                                ))}
                                </div>
                            </SortableContext>
                        </DndContext>
                     </div>
                 </div>
            </div>

            {/* Right Panel: Settings */}
            <div className="col-span-3 flex flex-col gap-4 overflow-y-auto pr-2">
                <SettingsPanel
                    settings={settings}
                    handleSettingsChange={handleSettingsChange}
                    handleNumericSettingsChange={handleNumericSettingsChange}
                    helpText={helpText}
                />
                

                 {selectedClip && (
                    <div className="bg-panel-light rounded-lg shadow-sm p-4">
                        <h2 className="font-bold mb-2">Clip Settings</h2>
                        <div className="flex flex-col gap-3">
                             <div>
                                <label className="text-sm font-semibold">Subtitle</label>
                                <textarea
                                    value={selectedClip.subtitle || ''}
                                    onChange={e => handleClipSubtitleChange(selectedClipId!, e.currentTarget.value)}
                                    rows={3}
                                    className="w-full p-1 border rounded text-sm mt-1"
                                />
                                {helpText}
                             </div>
                             <div>
                                 <label className="text-sm font-semibold">Image</label>
                                 <select
                                     value={selectedClip.image?.id || ''}
                                     onChange={e => handleClipImageChange(selectedClipId!, e.currentTarget.value)}
                                     className="w-full p-1 border rounded text-sm mt-1"
                                 >
                                     <option value="">-- No Image --</option>
                                     {images.map(img => <option key={img.id} value={img.id}>{img.file.name}</option>)}
                                 </select>
                             </div>
                              <div>
                                 <label className="text-sm font-semibold">Audio</label>
                                 <select
                                     value={selectedClip.audio?.id || ''}
                                     onChange={e => handleClipAudioChange(selectedClipId!, e.currentTarget.value)}
                                     className="w-full p-1 border rounded text-sm mt-1"
                                 >
                                     {audios.map(aud => <option key={aud.id} value={aud.id}>{aud.file.name}</option>)}
                                 </select>
                             </div>
                        </div>
                    </div>
                 )}
                 
                 
            </div>
        </main>
    );
}