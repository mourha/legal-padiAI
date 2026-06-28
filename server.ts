import express from "express";
import path from "path";
import http from "http";
import { WebSocketServer } from "ws";
import { GoogleGenAI, Modality } from "@google/genai";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;
  
  app.use(express.json());

  // Initialize Gemini server-side using GEMINI_API_KEY
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("Warning: GEMINI_API_KEY is not defined in environment variables.");
  }
  const ai = new GoogleGenAI({
    apiKey: apiKey || "",
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });

  // Robust helper to generate text content with auto-retry and sequential model fallback
  async function generateContentWithFallback(options: {
    contents: any[];
    systemInstruction?: string;
    temperature?: number;
  }) {
    // Sequence of models to try in case of 503 UNAVAILABLE or other transient failures.
    // We prioritize gemini-2.5-flash as it is highly robust and has lower traffic/higher free limits right now.
    const models = ["gemini-2.5-flash", "gemini-1.5-flash", "gemini-3.5-flash", "gemini-3.1-flash-lite"];
    let lastError = null;

    for (const model of models) {
      let attempts = 3;
      while (attempts > 0) {
        try {
          console.log(`[LexAI API] Attempting generateContent using model: ${model} (${attempts} attempts remaining)`);
          const response = await ai.models.generateContent({
            model: model,
            contents: options.contents,
            config: {
              systemInstruction: options.systemInstruction,
              temperature: options.temperature,
            }
          });
          
          if (response && response.text) {
            console.log(`[LexAI API] Successfully generated content using model: ${model}`);
            return response;
          }
          throw new Error("Received empty text response from model");
        } catch (err: any) {
          lastError = err;
          const status = err.status || (err.error && err.error.status);
          const code = err.code || (err.error && err.error.code);
          const message = err.message || "";

          console.error(`[LexAI API] Error with model ${model}:`, message);

          const isTransient = 
            status === "UNAVAILABLE" || 
            code === 503 || 
            message.includes("503") ||
            message.includes("high demand") ||
            message.includes("temporary");

          // Note: status === "RESOURCE_EXHAUSTED" / 429 indicates rate/quota limits.
          // In that case, we must NOT retry the same model immediately, we should switch to the fallback model right away!
          const isQuotaExceeded =
            status === "RESOURCE_EXHAUSTED" ||
            code === 429 ||
            message.includes("quota") ||
            message.includes("Rate limit") ||
            message.includes("RESOURCE_EXHAUSTED") ||
            message.includes("429");

          if (isTransient && attempts > 1) {
            attempts--;
            console.log(`[LexAI API] Transient 503 error detected. Retrying ${model} in 1 second...`);
            await new Promise((resolve) => setTimeout(resolve, 1000));
          } else {
            if (isQuotaExceeded) {
              console.log(`[LexAI API] Quota/Rate limit (429) hit on ${model}. Switching immediately to fallback model.`);
            } else {
              console.log(`[LexAI API] Error with ${model}. Switching to next available fallback model.`);
            }
            break; // Stop retrying this model, proceed to fallback model
          }
        }
      }
    }
    throw lastError || new Error("All model fallback paths exhausted.");
  }

  // API Route for LexAI Chat
  app.post("/api/lexai/chat", async (req, res) => {
    try {
      const { message, history, mode } = req.body;
      
      let systemInstruction = "You are LexAI, a funny Nigerian lawyer (Your Legal Padi). You speak in Nigerian Pidgin English. You are street-wise, hilarious, and give practical legal advice mixed with 'cruise' (humor). Always sound confident.";
      if (mode === 'serious') {
        systemInstruction = "You are a professional Nigerian Legal Assistant. Provide strictly formal, accurate legal advice citing the Nigerian Constitution and Acts. Do not use Pidgin or jokes. Maintain a professional, empathetic tone.";
      }

      // Convert history to Gemini format
      const contents = history.map((msg: any) => ({
        role: msg.role,
        parts: [{ text: msg.text }]
      }));

      contents.push({
        role: 'user',
        parts: [{ text: message }]
      });

      const response = await generateContentWithFallback({
        contents: contents,
        systemInstruction: systemInstruction,
        temperature: mode === 'cruise' ? 0.8 : 0.3,
      });

      res.json({ text: response.text || "Ah, network small wahala. Abeg try asking again." });
    } catch (error: any) {
      console.error("Chat API error:", error);
      res.status(500).json({ error: error.message || "Something went wrong" });
    }
  });

  // API Route for LexAI Document Generator
  app.post("/api/lexai/document", async (req, res) => {
    try {
      const { templateType, formData } = req.body;
      const prompt = `
      Act as a Nigerian Lawyer. Create a simple, legally sound draft for a "${templateType}".
      
      Here are the details provided:
      ${Object.entries(formData || {}).map(([key, value]) => `- ${key}: ${value}`).join('\n')}
      
      Format nicely with clear headings. 
      Add a disclaimer at the bottom saying: "This is a generated template for educational purposes. Consult a lawyer before signing."
      `;

      const response = await generateContentWithFallback({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
      });

      res.json({ text: response.text || "Could not generate document." });
    } catch (error: any) {
      console.error("Document generator API error:", error);
      res.status(500).json({ error: error.message || "Something went wrong" });
    }
  });

  // Set up HTTP server to integrate both Express and WebSockets
  const server = http.createServer(app);

  // Set up WebSocket Server for Live API proxy
  const wss = new WebSocketServer({ noServer: true });

  wss.on("connection", async (clientWs, request) => {
    console.log("Client connected to Live Proxy WebSocket");
    
    // Parse query parameters
    const url = new URL(request.url || "", `http://${request.headers.host || "localhost"}`);
    const mode = url.searchParams.get("mode") || "cruise";
    const customSystemInstruction = url.searchParams.get("customSystemInstruction");

    // Config based on mode or Custom Prompt
    let systemInstruction = "";
    if (customSystemInstruction) {
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

    let session: any = null;
    let connected = false;
    const liveModels = ['gemini-2.0-flash-exp', 'gemini-3.1-flash-live-preview'];

    // Helper to connect to a specific Live API model sequentially
    const connectToLiveModel = (modelName: string): Promise<any> => {
      return new Promise((resolve, reject) => {
        let activeSession: any = null;
        let isResolved = false;

        console.log(`[LexAI Live] Initiating connection using model: ${modelName}...`);
        ai.live.connect({
          model: modelName,
          config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
              voiceConfig: { prebuiltVoiceConfig: { voiceName } }
            },
            systemInstruction: systemInstruction,
          },
          callbacks: {
            onopen: () => {
              console.log(`[LexAI Live] Connection opened via ${modelName}`);
              isResolved = true;
              clientWs.send(JSON.stringify({ type: "open" }));
              resolve(activeSession);
            },
            onmessage: (message: any) => {
              clientWs.send(JSON.stringify({ type: "message", message }));
            },
            onclose: () => {
              console.log(`[LexAI Live] Connection closed for ${modelName}`);
              clientWs.send(JSON.stringify({ type: "close" }));
              try { clientWs.close(); } catch (e) {}
            },
            onerror: (err: any) => {
              console.error(`[LexAI Live] Error callback with ${modelName}:`, err);
              if (!isResolved) {
                isResolved = true;
                reject(err);
              } else {
                clientWs.send(JSON.stringify({ type: "error", error: err.message || "Gemini error" }));
                try { clientWs.close(); } catch (e) {}
              }
            }
          }
        }).then((s) => {
          activeSession = s;
        }).catch((err) => {
          if (!isResolved) {
            isResolved = true;
            reject(err);
          }
        });

        // Timeout connection attempt after 6 seconds to prevent hanging
        setTimeout(() => {
          if (!isResolved) {
            isResolved = true;
            reject(new Error("Connection timeout after 6 seconds"));
          }
        }, 6000);
      });
    };

    // Sequential fallback loop
    for (const liveModel of liveModels) {
      if (connected) break;
      try {
        session = await connectToLiveModel(liveModel);
        connected = true;
        console.log(`[LexAI Live] Successfully connected with model: ${liveModel}`);
        
        // Only register client message listener once connected
        clientWs.on("message", async (data: any) => {
          try {
            const parsed = JSON.parse(data.toString());
            if (parsed.type === "realtimeInput" && session) {
              await session.sendRealtimeInput(parsed.input);
            }
          } catch (err) {
            console.error("[LexAI Live] Error processing client message:", err);
          }
        });

        clientWs.on("close", () => {
          console.log("[LexAI Live] Client closed connection");
          if (session) {
            try {
              session.close();
            } catch (e) {}
          }
        });

        break;
      } catch (err: any) {
        console.warn(`[LexAI Live] Failed with model ${liveModel}:`, err.message || err);
      }
    }

    if (!connected) {
      console.error("[LexAI Live] All Live API fallback models failed to connect.");
      clientWs.send(JSON.stringify({ type: "error", error: "Failed to connect to AI voice service. Try again soon." }));
      try { clientWs.close(); } catch (e) {}
    }
  });

  // Handle upgrade to WebSockets
  server.on("upgrade", (request, socket, head) => {
    const { pathname } = new URL(request.url || "", `http://${request.headers.host || "localhost"}`);
    if (pathname === "/api/live") {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit("connection", ws, request);
      });
    } else {
      socket.destroy();
    }
  });

  // Serve static assets and SPA fallback in production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
