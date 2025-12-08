
import { GoogleGenAI, Content, Part, LiveServerMessage, Modality } from "@google/genai";
import { LEXAI_SYSTEM_INSTRUCTION } from '../constants';

const getClient = () => {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
        throw new Error("API_KEY is missing from environment variables");
    }
    return new GoogleGenAI({ apiKey });
};

export const sendMessageToLexAI = async (
    message: string, 
    history: { role: 'user' | 'model', text: string }[],
    mode: 'cruise' | 'serious'
): Promise<string> => {
    const client = getClient();
    
    // Adjust system instruction based on mode
    let systemInstruction = LEXAI_SYSTEM_INSTRUCTION;
    if (mode === 'serious') {
        systemInstruction = "You are a professional Nigerian Legal Assistant. Provide strictly formal, accurate legal advice citing the Nigerian Constitution and Acts. Do not use Pidgin or jokes. Maintain a professional, empathetic tone.";
    }

    // Convert history to Gemini format
    const contents: Content[] = history.map(msg => ({
        role: msg.role,
        parts: [{ text: msg.text } as Part]
    }));

    // Add current message
    contents.push({
        role: 'user',
        parts: [{ text: message } as Part]
    });

    try {
        const response = await client.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: contents,
            config: {
                systemInstruction: systemInstruction,
                temperature: mode === 'cruise' ? 0.8 : 0.3, // Higher creativity for cruise, lower for serious
            }
        });

        return response.text || "Ah, network small wahala. Abeg try asking again.";
    } catch (error) {
        console.error("Gemini API Error:", error);
        return "Omo, I encounter small error. Check your internet connection make we try again.";
    }
};

export const generateDocumentContent = async (
    templateType: string,
    formData: Record<string, string>
): Promise<string> => {
    const client = getClient();
    
    const prompt = `
    Act as a Nigerian Lawyer. Create a simple, legally sound draft for a "${templateType}".
    
    Here are the details provided:
    ${Object.entries(formData).map(([key, value]) => `- ${key}: ${value}`).join('\n')}
    
    Format nicely with clear headings. 
    Add a disclaimer at the bottom saying: "This is a generated template for educational purposes. Consult a lawyer before signing."
    `;

    try {
        const response = await client.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });
        return response.text || "Could not generate document.";
    } catch (error) {
        console.error(error);
        return "Error generating document.";
    }
};

// --- Live API Implementation ---

// Helpers for Audio Processing
function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

function createBlob(data: Float32Array): any {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    int16[i] = data[i] * 32768;
  }
  return {
    data: encode(new Uint8Array(int16.buffer)),
    mimeType: 'audio/pcm;rate=16000',
  };
}

export class LiveSessionManager {
  private client: GoogleGenAI;
  private inputAudioContext: AudioContext | null = null;
  private outputAudioContext: AudioContext | null = null;
  private inputSource: MediaStreamAudioSourceNode | null = null;
  private scriptProcessor: ScriptProcessorNode | null = null;
  private stream: MediaStream | null = null;
  private nextStartTime = 0;
  private sources = new Set<AudioBufferSourceNode>();
  private active = false;

  constructor() {
    this.client = getClient();
  }

  async connect(
    mode: 'cruise' | 'serious',
    onStatusChange: (status: string) => void,
    onVolume: (vol: number) => void
  ) {
    this.active = true;
    onStatusChange("Connecting to Padi...");

    this.inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
    this.outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    
    // Resume contexts if suspended (browser policy)
    await this.inputAudioContext.resume();
    await this.outputAudioContext.resume();

    const outputNode = this.outputAudioContext.createGain();
    outputNode.connect(this.outputAudioContext.destination);

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      onStatusChange("Connected");
    } catch (err) {
      console.error("Microphone error", err);
      onStatusChange("Mic Error");
      return;
    }
    
    // Config based on mode
    const systemInstruction = mode === 'cruise' 
      ? "You are LexAI, a funny Nigerian lawyer (Your Legal Padi). You speak in Nigerian Pidgin English. You are street-wise, hilarious, and give practical legal advice mixed with 'cruise' (humor). Keep responses relatively short and conversational for voice. Always sound confident."
      : "You are a professional Nigerian Legal Counsel. Speak in clear, formal English. Be empathetic, authoritative, and concise. Provide accurate legal guidance based on the Nigerian Constitution.";
    
    const voiceName = mode === 'cruise' ? 'Puck' : 'Zephyr'; // Puck (Playful) vs Zephyr (Calm)

    const sessionPromise = this.client.live.connect({
      model: 'gemini-2.5-flash-native-audio-preview-09-2025',
      callbacks: {
        onopen: () => {
          onStatusChange(mode === 'cruise' ? "Oya talk, I dey hear..." : "Listening...");
          
          if (!this.inputAudioContext || !this.stream) return;

          this.inputSource = this.inputAudioContext.createMediaStreamSource(this.stream);
          this.scriptProcessor = this.inputAudioContext.createScriptProcessor(4096, 1, 1);
          
          this.scriptProcessor.onaudioprocess = (e) => {
            if (!this.active) return;
            const inputData = e.inputBuffer.getChannelData(0);
            
            // Calculate volume for UI visualizer
            let sum = 0;
            for (let i = 0; i < inputData.length; i++) sum += inputData[i] * inputData[i];
            onVolume(Math.sqrt(sum / inputData.length));

            const pcmBlob = createBlob(inputData);
            sessionPromise.then((session) => {
              session.sendRealtimeInput({ media: pcmBlob });
            });
          };

          this.inputSource.connect(this.scriptProcessor);
          this.scriptProcessor.connect(this.inputAudioContext.destination);
        },
        onmessage: async (message: LiveServerMessage) => {
          if (!this.active || !this.outputAudioContext) return;

          const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
          
          if (base64Audio) {
            onStatusChange(mode === 'cruise' ? "Padi dey talk..." : "Speaking...");
            
            this.nextStartTime = Math.max(this.nextStartTime, this.outputAudioContext.currentTime);
            
            const audioBuffer = await decodeAudioData(
              decode(base64Audio),
              this.outputAudioContext,
              24000,
              1
            );

            const source = this.outputAudioContext.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(outputNode);
            
            source.addEventListener('ended', () => {
               this.sources.delete(source);
               if (this.sources.size === 0) {
                 onStatusChange(mode === 'cruise' ? "Oya talk, I dey hear..." : "Listening...");
               }
            });

            source.start(this.nextStartTime);
            this.nextStartTime += audioBuffer.duration;
            this.sources.add(source);
          }

          if (message.serverContent?.interrupted) {
            this.stopPlayback();
            this.nextStartTime = 0;
          }
        },
        onclose: () => {
          onStatusChange("Disconnected");
        },
        onerror: (err) => {
          console.error("Live session error:", err);
          onStatusChange("Error");
        }
      },
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName } }
        },
        systemInstruction: systemInstruction,
      }
    });

    return sessionPromise; // Keep reference if needed
  }

  stopPlayback() {
    for (const source of this.sources.values()) {
      source.stop();
    }
    this.sources.clear();
  }

  disconnect() {
    this.active = false;
    this.stopPlayback();
    
    if (this.scriptProcessor) {
      this.scriptProcessor.disconnect();
      this.scriptProcessor = null;
    }
    if (this.inputSource) {
      this.inputSource.disconnect();
      this.inputSource = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    if (this.inputAudioContext) {
      this.inputAudioContext.close();
      this.inputAudioContext = null;
    }
    if (this.outputAudioContext) {
      this.outputAudioContext.close();
      this.outputAudioContext = null;
    }
  }
}
