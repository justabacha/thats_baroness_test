// api/baroness.js
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Parse body safely for JSON or raw strings
  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  const { 
    text, 
    voice = 'flux-alexis-en' // Deepgram Flux Voice (e.g., flux-alexis-en, flux-orion-en)
  } = body;

  if (!text) {
    return res.status(400).json({ error: 'Missing text field' });
  }

  const openRouterKey = process.env.OPENROUTER_API_KEY;

  // ---------- 1. PRIMARY: OpenRouter Deepgram Flux TTS (FREE) ----------
  if (openRouterKey) {
    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openRouterKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://thats-baroness-p.vercel.app',
          'X-Title': 'Baroness Companion App'
        },
        body: JSON.stringify({
          model: 'deepgram/flux-tts:free',
          input: text,
          voice: voice,
          response_format: 'mp3'
        })
      });

      if (response.ok) {
        // If OpenRouter streams/returns raw audio bytes
        const audioBuffer = await response.arrayBuffer();
        res.setHeader('Content-Type', 'audio/mpeg');
        return res.send(Buffer.from(audioBuffer));
      } else {
        const errText = await response.text();
        console.error(`OpenRouter TTS error (${response.status}):`, errText);
      }
    } catch (err) {
      console.error('OpenRouter TTS exception:', err.message);
    }
  } else {
    console.warn('Missing OPENROUTER_API_KEY in Vercel environment');
  }

  // ---------- 2. FALLBACK: Edge TTS ----------
  try {
    const { synthesize: edgeTTS } = await import('@echristian/edge-tts');
    const edgeResult = await edgeTTS({
      text: text,
      voice: 'en-US-JennyNeural',
      outputFormat: 'audio-24khz-96kbitrate-mono-mp3',
    });

    let audioBuffer;
    if (Buffer.isBuffer(edgeResult.audio)) {
      audioBuffer = edgeResult.audio;
    } else if (edgeResult.audio instanceof Uint8Array) {
      audioBuffer = Buffer.from(edgeResult.audio);
    } else {
      throw new Error('Unexpected audio format');
    }

    res.setHeader('Content-Type', 'audio/mpeg');
    return res.send(audioBuffer);
  } catch (err) {
    console.error('Edge TTS fallback failed:', err.message);
    return res.status(500).json({ error: 'All TTS engines failed, mate' });
  }
}
