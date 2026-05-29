import { NextResponse } from 'next/server';
import { ElevenLabsClient } from 'elevenlabs';

const client = new ElevenLabsClient({
  apiKey: process.env.ELEVENLABS_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { text, voiceId } = await req.json();

    if (!text) {
      return NextResponse.json({ error: "Text is required" }, { status: 400 });
    }

    // ElevenLabs streaming generation
    const audioStream = await client.textToSpeech.convertAsStream(
      voiceId || 'pNInz6obpgDQGcFmaJgB', // டிஃபால்ட்டாக Adam வாய்ஸ்
      {
        text: text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: { 
          stability: 0.5, 
          similarity_boost: 0.75,
          style: 0.5
        },
      }
    );

    return new Response(audioStream as any, {
      headers: { 
        'Content-Type': 'audio/mpeg',
        'Transfer-Encoding': 'chunked' 
      },
    });

  } catch (error) {
    console.error("TTS Error:", error);
    return NextResponse.json({ error: "Failed to generate audio" }, { status: 500 });
  }
}