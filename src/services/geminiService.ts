import { GoogleGenAI, Type, Modality } from "@google/genai";
import { Speaker, PodcastScript, Voice, PodcastSegment } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function generatePodcastScript(
  content: string,
  duration: string,
  notes?: string,
  images?: string[], // array of base64 strings
  speakers: Speaker[] = [],
  segments?: PodcastSegment[]
): Promise<PodcastScript> {
  const speakerContext = speakers.map(s => 
    `${s.name} (${s.voice}): A ${s.profession} with a ${s.tone} tone. Mode: ${s.mode}. Style: ${s.choiceOfWords}. Behavior: ${s.behavior}. Language: ${s.language || 'English'}. Accent: ${s.accent || 'Neutral'}.`
  ).join("\n");

  let structureContext = "";
  if (segments && segments.length > 0) {
    structureContext = `
      The podcast should follow this specific structure:
      ${segments.map((s, i) => {
        const leadSpeaker = speakers.find(sp => sp.id === s.leadSpeakerId);
        return `${i + 1}. ${s.title} (${s.duration}): ${s.notes}${leadSpeaker ? ` (Lead Speaker: ${leadSpeaker.name})` : ""}`;
      }).join("\n")}
    `;
  }

  let targetWordCount = 750;
  if (duration.includes('3')) targetWordCount = 450;
  else if (duration.includes('5')) targetWordCount = 750;
  else if (duration.includes('10')) targetWordCount = 1500;
  else if (duration.includes('15')) targetWordCount = 2250;
  else if (duration.includes('30')) targetWordCount = 4500;
  else if (duration.includes('45')) targetWordCount = 6750;
  else if (duration.includes('1 hour')) targetWordCount = 9000;
  else if (duration.includes('2 hour')) targetWordCount = 18000;
  else if (duration.includes('3 hour')) targetWordCount = 27000;

  const prompt = `
    You are a professional podcast scriptwriter. 
    Based on the provided content (which may include text from multiple documents and visual information from multiple images), create a conversational podcast script between the following speakers:
    ${speakerContext}

    Target Duration: ${duration}.
    CRITICAL LENGTH REQUIREMENT: To achieve a ${duration} podcast, your script MUST be approximately ${targetWordCount} words long. 
    - Do NOT summarize. Do NOT rush the conversation.
    - Dive extremely deep into the details of the provided content.
    - Include long anecdotes, extensive debates, and thorough explanations.
    - If you need to reach the word count, explore tangential but relevant topics based on the speakers' professions.
    - IMPORTANT: The podcast MUST be written in the languages specified by the speakers. If multiple languages are present, they can mix or translate for each other.
    
    ${structureContext}

    Additional Instructions/Notes:
    ${notes || "None provided. Use your best judgment to make it engaging."}

    IMPORTANT: Make the conversation feel REAL and HUMAN. 
    1. Paralinguistic Nuances (CRITICAL):
       - Include fillers naturally using words (e.g., "um", "uh", "you know", "like").
       - Use phonetic reductions where appropriate (e.g., "gonna", "wanna", "wassup", "kinda").
       - Add written-out sighs and breaths (e.g., "Haaaah...", "Phew.", "Ugh.", "Hmm.").
       - Add stuttering for hesitation (e.g., "I-I-I don't think so", "W-wait a minute").
    2. Conversational Glue, Interruptions & Yelling:
       - Include backchanneling on separate lines (e.g., "Speaker 2: Mhm.", "Speaker 1: Yeah, exactly.").
       - Include false starts (e.g., "I think we... I mean, I know we should...").
       - For interruptions, use em-dashes to cut off sentences (e.g., "But I don't think that--", "Wait, let me stop you there.").
       - For yelling or heated arguments, write the words in ALL CAPS (e.g., "NO, THAT IS NOT WHAT I SAID!").
       - For pauses, use ellipses frequently (e.g., "Well... let me think about that... yeah.").
    
    CRITICAL TTS RULE: DO NOT use bracketed stage directions (like [sighs], [laughs], [music fades], [interrupts]) in the 'text' field. The text-to-speech engine will read them aloud literally. 
    - Instead of [laughs], write "Hahaha!" or "Heh heh."
    - Instead of [sighs], write "Ugh..." or "Haaaah..."
    - Instead of [pauses], use ellipses "..."
    - Instead of [interrupts], just use em-dashes "--" at the end of the interrupted line and start the next line immediately.
    
    Content to discuss:
    ${content}

    Output the script in JSON format with:
    1. "title": The title of the podcast.
    2. "lines": An array of objects with "speakerName" and "text".
    3. "showNotes": A concise summary of the podcast, including key takeaways and any mentioned resources.
  `;

  const parts: any[] = [{ text: prompt }];
  if (images && images.length > 0) {
    images.forEach(img => {
      parts.push({
        inlineData: {
          mimeType: "image/jpeg",
          data: img.split(",")[1] || img
        }
      });
    });
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: { parts },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            showNotes: { type: Type.STRING },
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
          required: ["title", "lines", "showNotes"]
        }
      }
    });

    if (!response.text) {
      throw new Error("Model returned an empty response. The content might be too complex or violated safety guidelines.");
    }

    return JSON.parse(response.text);
  } catch (error: any) {
    console.error("Script Generation Error:", error);
    if (error.message?.includes("xhr error") || error.message?.includes("500")) {
      throw new Error("The AI service is currently overloaded or the request was too large for a single turn. Try a shorter duration or less content.");
    }
    throw error;
  }
}

export async function generatePodcastAudio(
  script: PodcastScript,
  speakers: Speaker[],
  onProgress?: (current: number, total: number) => void
): Promise<string | undefined> {
  try {
    // Create a mapping of speaker names to their modulation instructions
    const speakerInstructions = speakers.map(s => {
      let modulation = `[Pitch: ${s.pitch || 'medium'}, Speed: ${s.speed || 'normal'}, Emotion: ${s.emotion || 'neutral'}, Accent: ${s.accent || 'Neutral'}, Language: ${s.language || 'English'}]`;
      if (s.mode?.toLowerCase().includes('storytell')) {
        modulation += ` - STORYTELLING MODE: Adopt a highly expressive and dynamic vocal delivery suitable for narrative content. Vary your pacing, heavily emphasize key narrative words, use dramatic pauses, and maintain a deeply emotive tone to captivate the listener.`;
      }
      return `${s.name}: ${modulation}`;
    }).join("\n");

    // Map speaker names to their voices for the TTS config
    const speakerVoiceConfigs = speakers.map(s => ({
      speaker: s.name,
      voiceConfig: {
        prebuiltVoiceConfig: { voiceName: s.voice }
      }
    }));

    const CHUNK_SIZE = 10; // Increased to 10 for better speed
    const PARALLEL_LIMIT = 3; // Process 3 chunks in parallel
    const pcmChunks: Uint8Array[] = [];
    
    // Generate a consistent random seed for this specific podcast generation
    const podcastSeed = Math.floor(Math.random() * 1000000);
    const totalChunks = Math.ceil(script.lines.length / CHUNK_SIZE);
    
    // Pre-calculate all chunk prompts
    const chunkPrompts: { index: number, prompt: string }[] = [];
    for (let i = 0; i < script.lines.length; i += CHUNK_SIZE) {
      const chunkIndex = Math.floor(i / CHUNK_SIZE);
      const chunkLines = script.lines.slice(i, i + CHUNK_SIZE);
      const conversation = chunkLines.map(line => {
        const speaker = speakers.find(s => s.name === line.speakerName);
        const emotionPrefix = speaker?.emotion && speaker.emotion !== 'neutral' ? `(${speaker.emotion}) ` : '';
        const accentPrefix = speaker?.accent && speaker.accent !== 'Neutral' ? `(in a ${speaker.accent} accent) ` : '';
        return `${line.speakerName}: ${accentPrefix}${emotionPrefix}${line.text}`;
      }).join("\n");
      
      const prompt = `
        TTS the following conversation for a podcast titled "${script.title}".
        This is part ${chunkIndex + 1} of the podcast.
        
        Voice Modulation Instructions:
        ${speakerInstructions}
        
        IMPORTANT PERFORMANCE INSTRUCTIONS:
        - CRITICAL VOICE CONSISTENCY: You MUST maintain the exact same voice timbre, pitch, accent, and character persona for each speaker as established. Do not let the voices drift or change.
        - GENDER ADHERENCE: Respect the specified gender for each speaker. If a male speaker is assigned a voice that sounds female (or vice versa), you MUST modify the pitch and timbre to match the requested gender as closely as possible.
        - ACCENT ENFORCEMENT: The requested accents are CRITICAL. If a speaker has a "British" accent, they MUST sound British. If "Southern US", they MUST sound Southern. Do not revert to the default American accent of the base voice.
        - This is a HIGH-QUALITY, HUMAN-LIKE podcast. 
        - Speak in the specified language and apply the requested accent naturally.
        - Use natural prosody, breathing, and pauses throughout. Avoid a robotic or monotone delivery.
        - PAUSES & BREATHS: When you see ellipses ("..."), take a natural pause, hesitate, or take an audible breath.
        - VOCALIZATIONS: Interpret words like "Hahaha", "Heh", "Ugh", "Phew", "Hmm", "Haaaah" with rich emotional vocalizations (actual laughing, sighing, exhaling), do not just read them as flat text.
        - STUTTERING: When you see repeated letters (e.g., "I-I-I" or "W-wait"), perform them as genuine human stuttering or hesitation.
        - Make fillers ("um", "uh") sound natural, not read.
        - INTERRUPTIONS: When a line ends with an em-dash ("--"), the speaker is being interrupted. You MUST NOT leave any pause or silence between this line and the next. The next speaker's audio MUST overlap and start instantly, cutting off the previous speaker abruptly.
        - YELLING: When text is written in ALL CAPS, the speaker MUST raise their volume and yell or shout the words aggressively.
        - Backchanneling ("mhm", "yeah") should be soft and supportive, and should happen quickly without breaking the flow.
        - False starts should sound like genuine hesitation and correction.
        
        Conversation:
        ${conversation}
      `;
      chunkPrompts.push({ index: chunkIndex, prompt });
    }

    // Process chunks in parallel batches
    const results: { index: number, data: Uint8Array }[] = [];
    let completedCount = 0;

    for (let i = 0; i < chunkPrompts.length; i += PARALLEL_LIMIT) {
      const batch = chunkPrompts.slice(i, i + PARALLEL_LIMIT);
      
      await Promise.all(batch.map(async ({ index, prompt }) => {
        let retries = 3;
        let success = false;
        
        while (retries > 0 && !success) {
          try {
            const response = await ai.models.generateContent({
              model: "gemini-2.5-flash-preview-tts",
              contents: [{ parts: [{ text: prompt }] }],
              config: {
                responseModalities: [Modality.AUDIO],
                seed: podcastSeed,
                speechConfig: {
                  multiSpeakerVoiceConfig: {
                    speakerVoiceConfigs: speakerVoiceConfigs
                  }
                }
              }
            });

            const audioData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
            if (audioData) {
              const binaryString = atob(audioData);
              const bytes = new Uint8Array(binaryString.length);
              for (let j = 0; j < binaryString.length; j++) {
                bytes[j] = binaryString.charCodeAt(j);
              }
              results.push({ index, data: bytes });
              success = true;
              completedCount++;
              if (onProgress) {
                onProgress(completedCount, totalChunks);
              }
            } else {
               throw new Error("No audio data returned");
            }
          } catch (err) {
            console.warn(`Chunk ${index + 1} failed, retrying... (${retries} attempts left)`, err);
            retries--;
            if (retries === 0) throw err;
            await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000)); // Random backoff
          }
        }
      }));
    }

    // Sort results by index to ensure correct order
    results.sort((a, b) => a.index - b.index);
    results.forEach(r => pcmChunks.push(r.data));

    if (pcmChunks.length === 0) {
      throw new Error("Failed to generate audio. No audio data returned.");
    }

    // Concatenate all PCM chunks
    const totalLength = pcmChunks.reduce((acc, chunk) => acc + chunk.length, 0);
    const combinedPcm = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of pcmChunks) {
      combinedPcm.set(chunk, offset);
      offset += chunk.length;
    }

    // Encode combined PCM back to base64
    let binary = '';
    const chunkSize = 0x8000; // 32KB chunks to avoid call stack limits
    for (let i = 0; i < combinedPcm.length; i += chunkSize) {
      binary += String.fromCharCode.apply(null, Array.from(combinedPcm.subarray(i, i + chunkSize)));
    }
    return btoa(binary);
  } catch (error: any) {
    console.error("Audio Generation Error:", error);
    throw error;
  }
}

export async function suggestSegmentNotes(title: string, content: string): Promise<string> {
  try {
    const prompt = `
      Based on the following podcast source material, suggest 3-4 brief, engaging key points or discussion notes for a segment titled "${title}".
      Make the notes concise and actionable for a podcast host. Do not use markdown formatting like bolding or asterisks, just return a simple text list.
      
      Content:
      ${content.substring(0, 15000)}
    `;
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt
    });
    return response.text || "";
  } catch (error) {
    console.error("Suggest Notes Error:", error);
    return "Failed to generate suggestions. Please try again.";
  }
}

export async function generatePodcastCover(title: string, content: string): Promise<string | undefined> {
  try {
    const prompt = `Create a professional, modern podcast cover art for a show titled "${title}". 
    The podcast is about: ${content.substring(0, 500)}. 
    The style should be clean, high-quality, and visually striking. Do not include any text other than potentially the title if it fits well.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        imageConfig: {
          aspectRatio: "1:1"
        }
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
  } catch (error) {
    console.error("Cover Generation Error:", error);
  }
  return undefined;
}

export async function generateSpeakerPreview(speaker: Speaker): Promise<string | undefined> {
  try {
    const prompt = `
      Say the following sentence with a ${speaker.accent || 'Neutral'} accent and a ${speaker.tone || 'neutral'} tone:
      "Hello, I'm ${speaker.name}. I'm a ${speaker.profession} and I'll be your ${speaker.mode} today."
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: speaker.voice }
          }
        }
      }
    });

    const audioData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (audioData) {
      return audioData; // Return base64 string directly
    }
  } catch (error) {
    console.error("Preview Generation Error:", error);
    throw error;
  }
  return undefined;
}
