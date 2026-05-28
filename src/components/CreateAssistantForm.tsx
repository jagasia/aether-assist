"use client";

import { useState } from "react";
import { db } from "../lib/firebase";
import { doc, setDoc } from "firebase/firestore";
import type { Assistant } from "../types";
import { useAuth } from "./AuthContext";
import { X } from "lucide-react";

const AVAILABLE_MODELS = [
  "google/gemini-2.5-flash",
  "openai/gpt-4-turbo",
  "openai/gpt-4o",
  "anthropic/claude-3-opus",
];

interface CreateAssistantFormProps {
  onSuccess?: () => void;
  onClose?: () => void;
  isModal?: boolean;
}

export default function CreateAssistantForm({
  onSuccess,
  onClose,
  isModal = false,
}: CreateAssistantFormProps) {
  const [name, setName] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [model, setModel] = useState("google/gemini-2.5-flash");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const { user, profile } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    if (!user) {
      setMessage("Please sign in to create an assistant.");
      return;
    }
    if (!name.trim()) {
      setMessage("Please provide a name for your assistant.");
      return;
    }
    if (!systemPrompt.trim()) {
      setMessage("Please provide system instructions for your assistant.");
      return;
    }

    setSaving(true);
    try {
      if (!db) {
        throw new Error("Firestore has not been initialized.");
      }

      const assistantId = typeof crypto !== "undefined" && (crypto as any).randomUUID
        ? (crypto as any).randomUUID()
        : `assistant-${Date.now()}`;

      const assistant: Assistant = {
        assistantId,
        userId: user.uid,
        name: name.trim(),
        systemPrompt: systemPrompt.trim(),
        model,
        createdAt: new Date().toISOString(),
      };

      await setDoc(doc(db, "assistants", assistantId), assistant);
      setMessage("Assistant created successfully!");
      setName("");
      setSystemPrompt("");
      setModel("google/gemini-2.5-flash");
      
      // Call success callback after a short delay to show the success message
      setTimeout(() => {
        onSuccess?.();
      }, 500);
    } catch (err) {
      console.error(err);
      setMessage("Failed to create assistant. Try again.");
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return (
      <div className={`p-6 rounded-xl ${isModal ? "bg-slate-900 text-slate-400" : "bg-slate-900 text-slate-400"}`}>
        <p className="text-sm">Please sign in to create assistants.</p>
      </div>
    );
  }

  if (isModal) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-gradient-to-tr from-slate-900 to-slate-800 rounded-xl shadow-lg p-6 w-full max-w-md mx-4 relative max-h-[90vh] overflow-y-auto">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-slate-200 transition"
          >
            <X className="w-5 h-5" />
          </button>

          <h3 className="text-2xl font-semibold mb-1 text-slate-100">Create Assistant</h3>
          <p className="text-xs text-slate-400 mb-4">Signed in as {profile?.name ?? user.email}</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-200 mb-1">
                Assistant Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-md bg-slate-900 border border-slate-700 px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="E.g. Java Expert, Python Guru"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-200 mb-1">
                System Prompt
              </label>
              <textarea
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                className="w-full rounded-md bg-slate-900 border border-slate-700 px-3 py-2 text-slate-100 min-h-[100px] focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Describe how the assistant should behave, its expertise, tone, and style..."
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-200 mb-1">
                Model
              </label>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full rounded-md bg-slate-900 border border-slate-700 px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {AVAILABLE_MODELS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-md border border-slate-600 text-slate-200 hover:bg-slate-800 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 rounded-md bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold transition"
              >
                {saving ? "Creating..." : "Create"}
              </button>
            </div>

            {message && (
              <div
                className={`text-sm mt-3 p-2 rounded ${
                  message.includes("success")
                    ? "bg-green-900/30 text-green-300"
                    : "bg-red-900/30 text-red-300"
                }`}
              >
                {message}
              </div>
            )}
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto p-6 bg-gradient-to-tr from-slate-900 to-slate-800 rounded-xl shadow-lg text-slate-100">
      <h3 className="text-2xl font-semibold mb-4">Create a new Assistant</h3>
      <p className="text-sm text-slate-300 mb-3">Signed in as {profile?.name ?? user.email}</p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Assistant Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-md bg-slate-900 border border-slate-700 px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="E.g. Java Expert, Python Guru"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">System Prompt</label>
          <textarea
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            className="w-full rounded-md bg-slate-900 border border-slate-700 px-3 py-2 text-slate-100 min-h-[120px] focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Describe how the assistant should behave, its expertise, tone, and style..."
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Model</label>
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="w-full rounded-md bg-slate-900 border border-slate-700 px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {AVAILABLE_MODELS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center justify-between">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold px-4 py-2 rounded-md shadow transition"
          >
            {saving ? "Creating..." : "Create Assistant"}
          </button>
        </div>

        {message && (
          <div
            className={`text-sm mt-2 p-2 rounded ${
              message.includes("success")
                ? "bg-green-900/30 text-green-300"
                : "bg-red-900/30 text-red-300"
            }`}
          >
            {message}
          </div>
        )}
      </form>
    </div>
  );
}
