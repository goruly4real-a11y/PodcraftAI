import { GoogleGenAI, Type, Modality } from "@google/genai";
import { Speaker, PodcastScript, Voice } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function generatePodcastScript(
  content: string,
  duration: string,
  notes?: string,
  image?: string, // base64
  speakers: Speaker[] = []
): Promise<PodcastScript> {
  const speakerContext = speakers.map(s => 
    `${s.name} (${s.voice}): A ${s.profession} with a ${s.tone} tone. Mode: ${s.mode}. Style: ${s.choiceOfWords}. Behavior: ${s.behavior}.`
  ).join("\n");

  const prompt = `
    You are a professional podcast scriptwriter. 
    Based on the provided content, create a conversational podcast script between the following speakers:
    ${speakerContext}

    Target Duration: Approximately ${duration}.
    
    Additional Instructions/Notes:
    ${notes || "None provided. Use your best judgment to make it engaging."}

    The podcast should be engaging, informative, and stay true to each speaker's personality and profession.
    Adjust the depth and detail of the conversation to match the requested duration and follow any specific notes provided.
    
    Content to discuss:
    ${content}

    Output the script in JSON format with a title and an array of lines, where each line has "speakerName" and "text".
  `;

  const parts: any[] = [{ text: prompt }];
  if (image) {
    parts.push({
      inlineData: {
        mimeType: "image/jpeg",
        data: image.split(",")[1] || image
      }
    });
  }

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: { parts },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          lines: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                speakerName: { type: Type.STRING },
                text: { type: Type.STRING }
              },
              required: ["speakerName", "text"]
            }
          }
        },
        required: ["title", "lines"]
      }
    }
  });

  return JSON.parse(response.text || "{}");
}

export async function generatePodcastAudio(
  script: PodcastScript,
  speakers: Speaker[]
): Promise<string | undefined> {
  const conversation = script.lines.map(line => `${line.speakerName}: ${line.text}`).join("\n");
  
  const prompt = `TTS the following conversation for a podcast titled "${script.title}":\n${conversation}`;

  // Map speaker names to their voices for the TTS config
  const speakerVoiceConfigs = speakers.map(s => ({
    speaker: s.name,
    voiceConfig: {
      prebuiltVoiceConfig: { voiceName: s.voice }
    }
  }));

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text: prompt }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        multiSpeakerVoiceConfig: {
          speakerVoiceConfigs: speakerVoiceConfigs
        }
      }
    }
  });

  return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
}
