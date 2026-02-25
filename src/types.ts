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
}

export interface PodcastScriptLine {
  speakerName: string;
  text: string;
}

export interface PodcastScript {
  title: string;
  lines: PodcastScriptLine[];
}
