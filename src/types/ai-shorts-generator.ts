// --- Types for Classic Editor ---
export type AspectRatio = '1:1' | '9:16' | '16:9';

export interface MediaFile {
  id: string;
  file: File;
  objectUrl: string;
  duration?: number;
  isLoaded?: boolean;
  isError?: boolean;
}

export interface Clip {
  id:string;
  image?: MediaFile;
  audio?: MediaFile;
  subtitle?: string;
}

export interface ProjectSettings {
  aspectRatio: AspectRatio;
  topGuideline: number; // percentage
  bottomGuideline: number; // percentage
  ctaGuideline: number; // percentage
  titleLine1: string;
  titleLine1FontSize: number;
  titleLine1StrokeSize: number;
  titleLine2: string;
  titleLine2FontSize: number;
  titleLine2StrokeSize: number;
  subtitleFontSize: number;
  subtitleStrokeSize: number;
  ctaFontSize: number;
  ctaStrokeSize: number;
  ctaText: string;
}

export type ParsedTextPart = {
  text: string;
  color: string;
};

export interface GeneratedClip {
  script: string;
  imagePrompt: string;
}

export interface GeneratedScript {
  title: string;
  cta: string;
  clips: GeneratedClip[];
}


// --- WebCodecs API type declarations ---

type VideoFrameSource = CanvasImageSource | VideoFrame;

interface VideoFrameInit {
    duration?: number;
    timestamp?: number;
}

declare class VideoFrame {
    constructor(source: VideoFrameSource, init?: VideoFrameInit);
    close(): void;
}

interface EncodedVideoChunkMetadata {
    // We don't use properties, but need the type for the callback
}

declare class EncodedVideoChunk {
    // We don't use properties, but need the type for the callback
}

interface VideoEncoderInit {
    output: (chunk: EncodedVideoChunk, metadata?: EncodedVideoChunkMetadata) => void;
    error: (error: Error) => void;
}

interface VideoEncoderConfig {
    codec: string;
    width: number;
    height: number;
    framerate: number;
    bitrate: number;
}

interface VideoEncoderEncodeOptions {
    keyFrame?: boolean;
}

declare class VideoEncoder {
    constructor(init: VideoEncoderInit);
    configure(config: VideoEncoderConfig): void;
    encode(frame: VideoFrame, options?: VideoEncoderEncodeOptions): void;
    flush(): Promise<void>;
}


type AudioSampleFormat = 'u8' | 's16' | 's32' | 'f32' | 'u8-planar' | 's16-planar' | 's32-planar' | 'f32-planar';

interface AudioDataInit {
    format: AudioSampleFormat;
    sampleRate: number;
    numberOfFrames: number;
    numberOfChannels: number;
    timestamp: number;
    data: BufferSource;
}

declare class AudioData {
    constructor(init: AudioDataInit);
    close(): void;
}



interface AudioEncoderInit {
    output: (chunk: EncodedAudioChunk, metadata?: EncodedAudioChunkMetadata) => void;
    error: (error: Error) => void;
}

interface AudioEncoderConfig {
    codec: string;
    sampleRate: number;
    numberOfChannels: number;
    bitrate: number;
}

declare class AudioEncoder {
    constructor(init: AudioEncoderInit);
    configure(config: AudioEncoderConfig): void;
    encode(data: AudioData): void;
    flush(): Promise<void>;
}

// Add to window object for checks like `if (!window.VideoEncoder)`
declare global {
  interface Window {
    VideoEncoder: typeof VideoEncoder;
    AudioEncoder: typeof AudioEncoder;
    AudioData: typeof AudioData;
    gapi: any;
    google: any;
  }
}

export interface UserProfile {
    name: string;
    email: string;
    picture: string;
}