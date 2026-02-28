export enum Voice {
  Puck = "Puck",
  Charon = "Charon",
  Kore = "Kore",
  Fenrir = "Fenrir",
  Zephyr = "Zephyr"
}

export interface Speaker {
  id?: number;
  name: string;
  voice: Voice;
  profession: string;
  tone: string;
  mode: string;
  choiceOfWords: string;
  behavior: string;
  isPrebuilt?: boolean;
  pitch?: string; // e.g., "high", "low", "medium"
  speed?: string; // e.g., "fast", "slow", "normal"
  emotion?: string; // e.g., "happy", "serious", "excited"
  clonedVoiceData?: string; // base64 sample
  gender?: 'male' | 'female' | 'non-binary';
  accent?: string;
  language?: string;
}

export interface PodcastSegment {
  id: string;
  title: string;
  notes: string;
  duration: string;
  leadSpeakerId?: number;
}

export interface PodcastScriptLine {
  speakerName: string;
  text: string;
}

export interface PodcastScript {
  title: string;
  lines: PodcastScriptLine[];
  showNotes?: string;
  coverImageUrl?: string;
}
