import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, Plugin} from 'vite';
import dotenv from 'dotenv';

dotenv.config();

function geminiApiPlugin(): Plugin {
  const handler = async (req: any, res: any) => {
    if (req.method !== 'POST') {
      res.statusCode = 405;
      return res.end('Method Not Allowed');
    }

    let bodyStr = '';
    req.on('data', (chunk: any) => {
      bodyStr += chunk;
    });

    req.on('end', async () => {
      try {
        const { message, history = [], images = [], classContext = '', aiModel = 'gemini-3.1-flash-lite' } = JSON.parse(bodyStr || '{}');

        if (!message && (!images || images.length === 0)) {
          res.statusCode = 400;
          res.setHeader('Content-Type', 'application/json');
          return res.end(JSON.stringify({ error: 'Pesan atau gambar diperlukan.' }));
        }

        const envKey = process.env.GEMINI_API_KEY;
        const apiKey = (envKey && envKey !== 'No key selected' && envKey.trim() !== '') ? envKey.trim() : '';

        if (apiKey) {
          try {
            const { GoogleGenAI } = await import('@google/genai');
            const ai = new GoogleGenAI({
              apiKey,
              httpOptions: {
                headers: {
                  'User-Agent': 'aistudio-build',
                },
              },
            });

            const systemInstruction = `Kamu adalah Assistant Kelas (Kating & Mentor Ramah) di platform RemindTask.
Pedoman Komunikasi Utama:
1. GAYA BAHASA SANGAT MANUSIAWI & NATURAL: Gunakan bahasa Indonesia sehari-hari yang luwes, santai, hangat, dan asik seperti teman sebaya atau kakak senior kampus idaman (gunakan kata 'kamu' dan 'aku', boleh gunakan partikel santai seperti 'nih', 'yuk', 'lho', 'ya', 'santai aja', 'wkwk'). HINDARI bahasa birokratis atau kalimat template robot yang kaku!
2. NYAMBUNG & MEMPERHATIKAN KONTEKS: Perhatikan riwayat percakapan sebelumnya. Jika siswa mengirim pesan celetukan pendek ("woi", "apasih", "lah"), tanggapi dengan asyik dan nyambung.
${classContext ? `Konteks Kelas & Tugas Siswa Saat Ini:\n${classContext}` : ''}`;

            const contents: any[] = [];

            if (Array.isArray(history) && history.length > 0) {
              const validTurns = history.filter((t: any) => t.role && t.text);
              let startIndex = 0;
              while (startIndex < validTurns.length && validTurns[startIndex].role !== 'user') {
                startIndex++;
              }
              for (let i = startIndex; i < validTurns.length; i++) {
                const turn = validTurns[i];
                if (contents.length === 0) {
                  contents.push({
                    role: 'user',
                    parts: [{ text: turn.text }],
                  });
                } else {
                  const prevRole = contents[contents.length - 1].role;
                  if (turn.role !== prevRole) {
                    contents.push({
                      role: turn.role === 'user' ? 'user' : 'model',
                      parts: [{ text: turn.text }],
                    });
                  }
                }
              }
              if (contents.length > 0 && contents[contents.length - 1].role === 'user') {
                contents.pop();
              }
            }

            const currentParts: any[] = [];
            const promptText = message || (images.length > 0 ? 'Tolong analisis dan jelaskan foto soal/materi ini secara rinci dan mudah dipahami.' : '');
            currentParts.push({ text: promptText });

            contents.push({
              role: 'user',
              parts: currentParts,
            });

            let response;
            const modelsToTry = [
              aiModel && !aiModel.includes('2.5') ? aiModel : 'gemini-3.1-flash-lite',
              'gemini-3.1-flash-lite',
              'gemini-3.8-flash',
            ];

            for (const m of Array.from(new Set(modelsToTry))) {
              try {
                response = await ai.models.generateContent({
                  model: m,
                  contents,
                  config: {
                    systemInstruction,
                    temperature: 0.85,
                  },
                });
                if (response && response.text) break;
              } catch {
                // try next
              }
            }

            if (response && response.text) {
              res.setHeader('Content-Type', 'application/json');
              res.setHeader('Access-Control-Allow-Origin', '*');
              return res.end(JSON.stringify({ reply: response.text }));
            }
          } catch (innerErr) {
            console.warn('AI Gen error in plugin, using fallback:', innerErr);
          }
        }

        const { generateSmartTutorResponse } = await import('./src/services/smartTutorSolver.ts');
        const smartReply = generateSmartTutorResponse(message || '', images, classContext, history);
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Access-Control-Allow-Origin', '*');
        return res.end(JSON.stringify({ reply: smartReply }));
      } catch (error: any) {
        console.error('Gemini chat error in Vite middleware:', error);
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        return res.end(JSON.stringify({ error: error.message }));
      }
    });
  };

  return {
    name: 'gemini-api-plugin',
    configureServer(server) {
      server.middlewares.use('/api/gemini/chat', handler);
    },
    configurePreviewServer(server) {
      server.middlewares.use('/api/gemini/chat', handler);
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), geminiApiPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
