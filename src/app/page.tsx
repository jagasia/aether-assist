"use client";

import { type FormEvent, useState } from "react";
import { ArrowRight, Sparkles, Settings } from "lucide-react";

const MODEL_OPTIONS = [
  { value: "google/gemini-2.5-flash", label: "google/gemini-2.5-flash" },
  { value: "google/gemini-2.5-pro", label: "google/gemini-2.5-pro" },
  { value: "meta-llama/llama-3-70b-instruct", label: "meta-llama/llama-3-70b-instruct" },
];

const roleStyles: Record<string, string> = {
  user: "bg-slate-800 text-slate-100 self-end rounded-3xl rounded-br-none border border-slate-700",
  assistant: "bg-slate-900 text-slate-100 self-start rounded-3xl rounded-bl-none border border-slate-700",
};

export default function Home() {
  const [model, setModel] = useState(MODEL_OPTIONS[0].value);
  const [messages, setMessages] = useState<{ id: string; role: string; content: string }[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    const userMessage = { id: crypto.randomUUID(), role: "user", content: trimmed };
    const currentMessages = [...messages, userMessage];
    setMessages(currentMessages);
    setInput("");
    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model, messages: currentMessages }),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || "Chat request failed.");
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("No readable stream available.");
      }

      const assistantMessage = { id: crypto.randomUUID(), role: "assistant", content: "" };
      setMessages((current) => [...current, assistantMessage]);

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (!value) continue;

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n");
        buffer = parts.pop() ?? "";

        for (const line of parts) {
          const trimmedLine = line.trim();
          if (!trimmedLine || !trimmedLine.startsWith("data:")) continue;

          const payload = trimmedLine.replace(/^data:\s*/, "");
          if (payload === "[DONE]") continue;

          try {
            const parsed = JSON.parse(payload);
            const delta = parsed.choices?.[0]?.delta?.content ?? parsed.choices?.[0]?.message?.content;
            if (typeof delta === "string" && delta.length > 0) {
              assistantMessage.content += delta;
              setMessages((current) =>
                current.map((message) =>
                  message.id === assistantMessage.id ? assistantMessage : message
                )
              );
            }
          } catch {
            // Ignore partial parse errors while streaming.
          }
        }
      }
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Something went wrong.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex min-h-screen max-w-[1600px] gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <aside className="hidden w-80 shrink-0 flex-col gap-6 rounded-3xl border border-slate-800 bg-slate-900/90 p-6 shadow-xl shadow-slate-950/20 lg:flex">
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Aether Assist</p>
                <h1 className="mt-2 text-2xl font-semibold text-white">Personal Assistant</h1>
              </div>
              <div className="rounded-2xl bg-slate-800 p-2 text-slate-300">
                <Sparkles className="h-5 w-5" />
              </div>
            </div>
            <p className="text-sm leading-6 text-slate-400">
              A premium conversation workspace for your private assistant. Choose a model and start a new chat.
            </p>
          </div>

          <div className="space-y-3">
            <div className="rounded-3xl border border-slate-800 bg-slate-950/70 p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Chat History</p>
              <div className="mt-4 space-y-3 text-sm text-slate-400">
                <button
                  type="button"
                  className="w-full rounded-2xl border border-slate-800 bg-slate-900/90 px-4 py-3 text-left transition hover:border-slate-700 hover:bg-slate-800"
                >
                  New conversation
                </button>
                <button
                  type="button"
                  className="w-full rounded-2xl border border-slate-800 bg-slate-900/90 px-4 py-3 text-left transition hover:border-slate-700 hover:bg-slate-800"
                >
                  Placeholder thread
                </button>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-800 bg-slate-950/70 p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Settings</p>
                <Settings className="h-4 w-4 text-slate-400" />
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-400">
                Model selection and conversation controls live in the workspace. This interface is designed for calm, private workflows.
              </p>
            </div>
          </div>
        </aside>

        <main className="flex flex-1 flex-col overflow-hidden rounded-[32px] border border-slate-800 bg-slate-950/90 shadow-2xl shadow-slate-950/20">
          <div className="flex flex-col gap-4 border-b border-slate-800 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Live assistant</p>
              <h2 className="mt-2 text-3xl font-semibold text-white">Aether Assist</h2>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <label className="flex min-w-[240px] flex-col gap-2 text-sm text-slate-400">
                Model
                <select
                  className="w-full rounded-2xl border border-slate-700 bg-slate-900/95 px-4 py-3 text-slate-100 outline-none transition focus:border-slate-500"
                  value={model}
                  onChange={(event) => setModel(event.target.value)}
                >
                  {MODEL_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          <section className="flex flex-1 flex-col overflow-hidden px-6 py-6">
            <div className="flex-1 space-y-4 overflow-y-auto pr-2">
              {messages.length === 0 ? (
                <div className="flex h-full min-h-[320px] flex-col items-center justify-center rounded-[28px] border border-dashed border-slate-800 bg-slate-900/60 p-10 text-center">
                  <p className="text-lg font-semibold text-white">Ready when you are</p>
                  <p className="mt-3 max-w-xl text-sm leading-6 text-slate-400">
                    Send a message below and Aether Assist will reply in real time through the OpenRouter stream.
                  </p>
                </div>
              ) : (
                messages.map((message, index) => (
                  <div key={`${message.id ?? index}-${index}`} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[90%] ${message.role === "user" ? "rounded-br-none" : "rounded-bl-none"} ${roleStyles[message.role === "user" ? "user" : "assistant"]} px-5 py-4`}>
                      <div className="mb-2 text-[11px] uppercase tracking-[0.24em] text-slate-500">
                        {message.role === "user" ? "You" : "Assistant"}
                      </div>
                      <div className="whitespace-pre-wrap text-sm leading-7 text-slate-100">{message.content}</div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <form className="mt-6 flex items-end gap-3 rounded-[28px] border border-slate-800 bg-slate-900/80 p-4 shadow-inner shadow-slate-950/20" onSubmit={sendMessage}>
              <textarea
                rows={1}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Ask something..."
                className="min-h-[60px] flex-1 resize-none rounded-2xl border border-slate-800 bg-slate-950/90 px-4 py-3 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-slate-500"
              />
              <button
                type="submit"
                disabled={isLoading}
                className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-950 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ArrowRight className="h-5 w-5" />
              </button>
            </form>

            {isLoading ? (
              <div className="mt-4 rounded-3xl border border-slate-800 bg-slate-900/80 px-4 py-3 text-sm text-slate-400">
                Generating response...
              </div>
            ) : null}
            {error ? (
              <div className="mt-4 rounded-3xl border border-rose-500/40 bg-rose-500/5 px-4 py-3 text-sm text-rose-200">
                {error}
              </div>
            ) : null}
          </section>
        </main>
      </div>
    </div>
  );
}
