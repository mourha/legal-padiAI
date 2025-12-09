
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
  private inputAudioContext: AudioContext | null = null;
  private outputAudioContext: AudioContext | null = null;
  private inputSource: MediaStreamAudioSourceNode | null = null;
  private scriptProcessor: ScriptProcessorNode | null = null;
  private stream: MediaStream | null = null;
  private nextStartTime = 0;
  private sources = new Set<AudioBufferSourceNode>();
  private active = false;
  private currentSessionPromise: Promise<any> | null = null;
  private isConnecting = false;

  // Rate limiting: Static to persist across re-instantiations in React
  private static globalConnectionTimestamps: number[] = [];
  private static readonly RATE_LIMIT_WINDOW = 60000; // 60 seconds
  private static readonly MAX_REQUESTS = 5; // Max 5 calls per minute

  constructor() {
    // Empty
  }

  async connect(
    mode: 'cruise' | 'serious',
    onStatusChange: (status: string) => void,
    onVolume: (vol: number) => void,
    customSystemInstruction?: string
  ) {
    if (this.isConnecting) {
        console.warn("Connection already in progress.");
        return;
    }

    // --- Rate Limit Check ---
    const now = Date.now();
    LiveSessionManager.globalConnectionTimestamps = LiveSessionManager.globalConnectionTimestamps.filter(
        t => now - t < LiveSessionManager.RATE_LIMIT_WINDOW
    );

    if (LiveSessionManager.globalConnectionTimestamps.length >= LiveSessionManager.MAX_REQUESTS) {
        const waitTime = Math.ceil((LiveSessionManager.RATE_LIMIT_WINDOW - (now - LiveSessionManager.globalConnectionTimestamps[0])) / 1000);
        const errorMsg = `Connection Error: Rate limit exceeded. Wait ${waitTime}s.`;
        console.warn(errorMsg);
        onStatusChange(errorMsg);
        return; // Prevents calling API
    }
    
    // Add current attempt
    LiveSessionManager.globalConnectionTimestamps.push(now);
    // ------------------------

    this.isConnecting = true;

    // Ensure clean state before connecting
    await this.disconnect();
    
    this.active = true;
    onStatusChange("Initializing Audio...");

    let client: GoogleGenAI;

    try {
        const apiKey = process.env.API_KEY;
        if (!apiKey) throw new Error("API Key not found");
        client = new GoogleGenAI({ apiKey });

        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        this.inputAudioContext = new AudioContextClass({ sampleRate: 16000 });
        this.outputAudioContext = new AudioContextClass({ sampleRate: 24000 });
        
        // Resume contexts to handle browser autoplay policies
        if (this.inputAudioContext.state === 'suspended') await this.inputAudioContext.resume();
        if (this.outputAudioContext.state === 'suspended') await this.outputAudioContext.resume();

        // Get microphone stream
        this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        onStatusChange("Connecting to Server...");

    } catch (err: any) {
      console.error("Initialization error", err);
      let msg = "Mic/Audio Error";
      if (err.name === 'NotAllowedError') msg = "Mic Permission Denied";
      else if (err.name === 'NotFoundError') msg = "No Mic Found";
      
      onStatusChange(msg);
      await this.disconnect();
      this.isConnecting = false;
      return;
    }
    
    // Config based on mode or Custom Prompt
    let systemInstruction = "";
    
    if (customSystemInstruction) {
        // Robust instructions for roleplay
        systemInstruction = `
        IMPORTANT: YOU ARE IN A ROLEPLAY SIMULATION FOR EDUCATIONAL PURPOSES.
        
        YOUR CHARACTER:
        ${customSystemInstruction}
        
        RULES:
        1. COMMIT FULLY to the character. Do not break character to say "I am an AI".
        2. If the character is described as angry, rude, or aggressive, BE THAT WAY. This is a training simulation for conflict resolution.
        3. Speak in Nigerian Pidgin or appropriate local dialect for the character.
        4. Keep responses spoken-style (short, reactive, conversational).
        5. DO NOT provide legal advice in this mode. You are the 'Wahala' (Problem), not the solution.
        `;
    } else {
        systemInstruction = mode === 'cruise' 
          ? "You are LexAI, a funny Nigerian lawyer (Your Legal Padi). You speak in Nigerian Pidgin English. You are street-wise, hilarious, and give practical legal advice mixed with 'cruise' (humor). Keep responses relatively short and conversational for voice. Always sound confident."
          : "You are a professional Nigerian Legal Counsel. Speak in clear, formal English. Be empathetic, authoritative, and concise. Provide accurate legal guidance based on the Nigerian Constitution.";
    }
    
    const voiceName = mode === 'cruise' || customSystemInstruction ? 'Puck' : 'Zephyr';

    try {
        let outputNode: GainNode | null = null;
        if (this.outputAudioContext) {
           outputNode = this.outputAudioContext.createGain();
           outputNode.connect(this.outputAudioContext.destination);
        }

        // Safety Settings to allow "Angry" personas without refusal
        const safetySettings = customSystemInstruction ? [
            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
        ] : undefined;

        this.currentSessionPromise = client.live.connect({
          model: 'gemini-2.5-flash-native-audio-preview-09-2025',
          callbacks: {
            onopen: () => {
              if (!this.active) return;
              onStatusChange(customSystemInstruction ? "Actor Ready. Oya talk." : (mode === 'cruise' ? "Oya talk, I dey hear..." : "Listening..."));
              
              if (!this.inputAudioContext || !this.stream) return;

              try {
                this.inputSource = this.inputAudioContext.createMediaStreamSource(this.stream);
                this.scriptProcessor = this.inputAudioContext.createScriptProcessor(4096, 1, 1);
                
                this.scriptProcessor.onaudioprocess = (e) => {
                  if (!this.active || !this.currentSessionPromise) return;
                  
                  const inputData = e.inputBuffer.getChannelData(0);
                  
                  // Calculate volume for UI visualizer
                  let sum = 0;
                  for (let i = 0; i < inputData.length; i++) sum += inputData[i] * inputData[i];
                  onVolume(Math.sqrt(sum / inputData.length));

                  const pcmBlob = createBlob(inputData);
                  
                  this.currentSessionPromise!.then((session) => {
                    if (this.active) {
                        try {
                           session.sendRealtimeInput({ media: pcmBlob });
                        } catch(e) {
                           console.error("Error sending input", e);
                        }
                    }
                  }).catch(err => {
                      // Session might have closed
                  });
                };

                this.inputSource.connect(this.scriptProcessor);
                this.scriptProcessor.connect(this.inputAudioContext.destination);
              } catch (e) {
                console.error("Audio graph error", e);
              }
            },
            onmessage: async (message: LiveServerMessage) => {
              if (!this.active || !this.outputAudioContext) return;

              const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
              
              if (base64Audio) {
                onStatusChange(customSystemInstruction ? "Actor Speaking..." : (mode === 'cruise' ? "Padi dey talk..." : "Speaking..."));
                
                // Ensure output context is running
                if (this.outputAudioContext.state === 'suspended') {
                    await this.outputAudioContext.resume().catch(() => {});
                }

                this.nextStartTime = Math.max(this.nextStartTime, this.outputAudioContext.currentTime);
                
                const audioBuffer = await decodeAudioData(
                  decode(base64Audio),
                  this.outputAudioContext,
                  24000,
                  1
                );

                const source = this.outputAudioContext.createBufferSource();
                source.buffer = audioBuffer;
                
                if (outputNode) {
                    source.connect(outputNode);
                } else {
                    source.connect(this.outputAudioContext.destination);
                }
                
                source.addEventListener('ended', () => {
                   this.sources.delete(source);
                   if (this.sources.size === 0 && this.active) {
                     onStatusChange(customSystemInstruction ? "Actor Listening..." : (mode === 'cruise' ? "Oya talk, I dey hear..." : "Listening..."));
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
              if (this.active) {
                  onStatusChange("Connection Closed");
                  this.disconnect();
              }
            },
            onerror: (err) => {
              console.error("Live session error:", err);
              onStatusChange("Network Error. Retry?");
              this.disconnect();
            }
          },
          config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
              voiceConfig: { prebuiltVoiceConfig: { voiceName } }
            },
            systemInstruction: systemInstruction,
            safetySettings: safetySettings as any, // Cast to any to avoid strict type issues with new SDK variations
          }
        });

        // Wait for connection to establish before releasing lock
        await this.currentSessionPromise;
        
    } catch (err: any) {
        console.error("Connection failed", err);
        let msg = "Service Unavailable";
        if (err.message && err.message.includes("403")) msg = "API Key Error";
        else if (err.message && err.message.includes("503")) msg = "Service Busy";
        
        onStatusChange("Connection Error: " + msg);
        await this.disconnect();
    } finally {
        this.isConnecting = false;
    }
  }

  stopPlayback() {
    for (const source of this.sources.values()) {
      try { source.stop(); } catch (e) {}
    }
    this.sources.clear();
  }

  async disconnect() {
    this.active = false;
    this.stopPlayback();
    
    if (this.scriptProcessor) {
      try {
        this.scriptProcessor.disconnect();
        this.scriptProcessor.onaudioprocess = null;
      } catch (e) {}
      this.scriptProcessor = null;
    }
    
    if (this.inputSource) {
      try { this.inputSource.disconnect(); } catch (e) {}
      this.inputSource = null;
    }
    
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    
    if (this.inputAudioContext) {
      try { await this.inputAudioContext.close(); } catch (e) {}
      this.inputAudioContext = null;
    }
    
    if (this.outputAudioContext) {
      try { await this.outputAudioContext.close(); } catch (e) {}
      this.outputAudioContext = null;
    }

    if (this.currentSessionPromise) {
        this.currentSessionPromise.then(session => {
            if (session && typeof session.close === 'function') {
                session.close();
            }
        }).catch(() => {});
        this.currentSessionPromise = null;
    }
  }
}
