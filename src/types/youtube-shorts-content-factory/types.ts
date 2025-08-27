
export enum ShortStatus {
  IDEA = 'Idea',
  SCRIPTING = 'Scripting',
  DRAFT_GENERATED = 'Draft Generated',
  REVISED = 'Revised',
  UPLOADED = 'Uploaded',
}

export interface Script {
  idea: string;
  draft: string;
  hook: string;
  immersion: string;
  body: string;
  cta: string;
}

export interface Metadata {
  tags: string; // Storing as a comma-separated string for simplicity in UI
  cta: string;
  imageIdeas: string;
  audioNotes: string;
}

export interface Short {
  id: string;
  projectId: string;
  title: string;
  status: ShortStatus;
  script: Script;
  metadata: Metadata;
  googleDocId?: string; // Added googleDocId
  images?: string[]; // Base64 encoded images array
  titleLine1?: string; // New field for Short title line 1
  titleLine2?: string; // New field for Short title line 2
}

export interface Project {
  id:string;
  name: string;
  description: string;
  shorts: Short[];
}
// Dummy comment to trigger re-compilation
