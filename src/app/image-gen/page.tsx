"use client";

import { useState } from 'react';

export default function ImageGenPage() {
  const [prompt, setPrompt] = useState('');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const generateImage = async () => {
    if (!prompt) return;
    setLoading(true);
    setImageUrl(null);

    try {
      const response = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });

      const data = await response.json();
      if (data.url) {
        setImageUrl(data.url);
      } else {
        alert('Image generation failed!');
      }
    } catch (error) {
      console.error(error);
      alert('Error generating image');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">AI Image Generator</h1>
      <textarea
        className="w-full p-2 border border-slate-700 bg-slate-900 rounded text-slate-100"
        rows={3}
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Enter your prompt here..."
      />
      <button
        onClick={generateImage}
        disabled={loading}
        className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white disabled:opacity-50"
      >
        {loading ? 'Generating...' : 'Generate Image'}
      </button>

      {imageUrl && (
        <div className="mt-8">
          <img src={imageUrl as string} alt="Generated" className="w-full rounded-lg shadow-xl" />
        </div>
      )}
    </div>
  );
}