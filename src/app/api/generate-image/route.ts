import { NextResponse } from 'next/server';
import Replicate from 'replicate';

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();

    // இங்கே நாம Flux-1.1-pro மாடலைப் பயன்படுத்தலாம், இது தரம் மற்றும் வேகத்திற்கு சிறந்தது
    const output = await replicate.run(
      "black-forest-labs/flux-1.1-pro",
      {
        input: {
          prompt: prompt,
          aspect_ratio: "1:1",
          output_format: "png",
        }
      }
    );

    return NextResponse.json({ url: output });
  } catch (error) {
    console.error("Image generation error:", error);
    return NextResponse.json({ error: "Failed to generate image" }, { status: 500 });
  }
}