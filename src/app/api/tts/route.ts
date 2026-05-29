import { NextResponse } from 'next/server';
import { ElevenLabsClient } from 'elevenlabs';

const client = new ElevenLabsClient({
  apiKey: process.env.ELEVENLABS_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { text } = await req.json();

    if (!text) {
      return NextResponse.json({ error: "Text is required" }, { status: 400 });
    }

    // ElevenLabs streaming generation
    const audioStream = await client.textToSpeech.convertAsStream(
      'pNInz6obpgDQGcFmaJgB', // Adam voice ID (இது ஒரு அருமையான பேலன்ஸ்டு வாய்ஸ்)
      {
        text: text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: { 
          stability: 0.5, 
          similarity_boost: 0.75,
          style: 0.5 // இது எக்ஸ்பிரஷன்ஸை அதிகப்படுத்தும்
        },
      }
    );

    // ஆடியோவை ஸ்ட்ரீமாகவே பிரவுசருக்கு அனுப்புகிறோம்
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