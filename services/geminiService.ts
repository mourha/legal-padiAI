import { ChatMessage, UserMode } from '../types';

export const sendMessageToLexAI = async (
    message: string, 
    history: { role: 'user' | 'model', text: string }[],
    mode: 'cruise' | 'serious'
): Promise<string> => {
    try {
        const response = await fetch("/api/lexai/chat", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ message, history, mode })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data.text || "Ah, network small wahala. Abeg try asking again.";
    } catch (error) {
        console.error("Gemini API Error:", error);
        return "Omo, I encounter small error. Check your internet connection make we try again.";
    }
};

export const generateDocumentContent = async (
    templateType: string,
    formData: Record<string, string>
): Promise<string> => {
    try {
        const response = await fetch("/api/lexai/document", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ templateType, formData })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data.text || "Could not generate document.";
    } catch (error) {
        console.error("Document Generator Error:", error);
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
  private socket: WebSocket | null = null;
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
        return;
    }
    
    LiveSessionManager.globalConnectionTimestamps.push(now);
    this.isConnecting = true;

    // Ensure clean state before connecting
    await this.disconnect();
    
    this.active = true;
    onStatusChange("Initializing Audio...");

    try {
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

    try {
        let outputNode: GainNode | null = null;
        if (this.outputAudioContext) {
           outputNode = this.outputAudioContext.createGain();
           outputNode.connect(this.outputAudioContext.destination);
        }

        // Establish WebSocket connection to full-stack server proxy endpoint
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        let wsUrl = `${protocol}//${window.location.host}/api/live?mode=${mode}`;
        if (customSystemInstruction) {
            wsUrl += `&customSystemInstruction=${encodeURIComponent(customSystemInstruction)}`;
        }

        this.socket = new WebSocket(wsUrl);

        this.socket.onopen = () => {
            if (!this.active) return;
            console.log("WebSocket proxy connection established");
        };

        this.socket.onmessage = async (event) => {
            if (!this.active) return;
            try {
                const parsed = JSON.parse(event.data);
                
                if (parsed.type === "open") {
                    onStatusChange(customSystemInstruction ? "Actor Ready. Oya talk." : (mode === 'cruise' ? "Oya talk, I dey hear..." : "Listening..."));
                    
                    if (!this.inputAudioContext || !this.stream) return;

                    try {
                        this.inputSource = this.inputAudioContext.createMediaStreamSource(this.stream);
                        this.scriptProcessor = this.inputAudioContext.createScriptProcessor(4096, 1, 1);
                        
                        this.scriptProcessor.onaudioprocess = (e) => {
                          if (!this.active || !this.socket || this.socket.readyState !== WebSocket.OPEN) return;
                          
                          const inputData = e.inputBuffer.getChannelData(0);
                          
                          // Calculate volume for UI visualizer
                          let sum = 0;
                          for (let i = 0; i < inputData.length; i++) sum += inputData[i] * inputData[i];
                          onVolume(Math.sqrt(sum / inputData.length));

                          const pcmBlob = createBlob(inputData);
                          
                          try {
                              this.socket.send(JSON.stringify({
                                  type: "realtimeInput",
                                  input: { audio: pcmBlob }
                              }));
                          } catch (e) {
                              console.error("Error sending real-time audio chunk:", e);
                          }
                        };

                        this.inputSource.connect(this.scriptProcessor);
                        this.scriptProcessor.connect(this.inputAudioContext.destination);
                    } catch (e) {
                        console.error("Audio graph error:", e);
                    }
                } else if (parsed.type === "message" && this.outputAudioContext) {
                    const message = parsed.message;
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
                } else if (parsed.type === "close") {
                    onStatusChange("Connection Closed");
                    this.disconnect();
                } else if (parsed.type === "error") {
                    onStatusChange("Error: " + parsed.error);
                    this.disconnect();
                }
            } catch (err) {
                console.error("Error processing websocket message:", err);
            }
        };

        this.socket.onclose = () => {
            if (this.active) {
                onStatusChange("Connection Closed");
                this.disconnect();
            }
        };

        this.socket.onerror = (err) => {
            console.error("WebSocket error:", err);
            onStatusChange("Network Error. Retry?");
            this.disconnect();
        };

    } catch (err: any) {
        console.error("Connection failed", err);
        onStatusChange("Connection Error: Service Unavailable");
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

    if (this.socket) {
        try {
            this.socket.close();
        } catch (e) {}
        this.socket = null;
    }
  }
}
