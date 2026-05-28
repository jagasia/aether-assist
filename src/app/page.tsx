"use client";

import { type FormEvent, useState, useEffect } from "react";
import { ArrowRight, Sparkles, Settings } from "lucide-react";
import { AuthProvider, useAuth } from "../components/AuthContext";
import { AssistantProvider, useAssistant } from "../components/AssistantContext";
import AssistantsSidebar from "../components/AssistantsSidebar";
import CreateAssistantForm from "../components/CreateAssistantForm";
import { useChat } from "../hooks/useChat";

function AuthOverlay() {
  const { user, signInWithGoogle } = useAuth();
  if (user) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="max-w-md w-full rounded-xl bg-slate-900 p-8 text-center">
        <Sparkles className="mx-auto mb-4 h-10 w-10 text-slate-300" />
        <h2 className="mb-2 text-2xl font-semibold">Welcome to Aether Assist</h2>
        <p className="mb-6 text-slate-400">Sign in to create personalized AI assistants and persist chats.</p>
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={() => signInWithGoogle()}
            className="inline-flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 font-semibold text-white hover:bg-indigo-500"
          >
            Sign in with Google
          </button>
        </div>
      </div>
    </div>
  );
}

const roleStyles: Record<string, string> = {
  user: "bg-slate-800 text-slate-100 self-end rounded-3xl rounded-br-none border border-slate-700",
  assistant: "bg-slate-900 text-slate-100 self-start rounded-3xl rounded-bl-none border border-slate-700",
};

function ChatWorkspace() {
  const { user } = useAuth();
  const { activeAssistant } = useAssistant();
  const { messages, currentChat, loading, initializeChat, saveMessage, updateChatTitle } = useChat(user?.uid, activeAssistant);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [model, setModel] = useState<string>("");

  // Initialize chat when assistant changes
  useEffect(() => {
    if (activeAssistant) {
      initializeChat();
    }
  }, [activeAssistant, initializeChat]);

  // Sync model with active assistant
  useEffect(() => {
    if (activeAssistant?.model) {
      setModel(activeAssistant.model);
    }
  }, [activeAssistant]);

  const sendMessage = async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isLoading || !activeAssistant || !currentChat) {
      if (!activeAssistant) {
        setError("Please select an assistant first.");
      }
      if (!currentChat) {
        setError("Initializing chat...");
      }
      return;
    }

    setInput("");
    setError(null);
    setIsLoading(true);

    try {
      // Save user message to Firestore first
      await saveMessage(trimmed, "user");

      // Update chat title if it's the first message (title starts with "Chat with")
      if (messages.length === 0) {
        const titlePreview = trimmed.substring(0, 50);
        await updateChatTitle(titlePreview);
      }

      // Build the messages array for the API (all previous messages + current)
      const apiMessages = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));
      apiMessages.push({
        role: "user",
        content: trimmed,
      });

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: model || activeAssistant.model,
          messages: apiMessages,
          assistantId: activeAssistant.assistantId,
          systemPrompt: activeAssistant.systemPrompt,
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || "Chat request failed.");
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("No readable stream available.");
      }

      const decoder = new TextDecoder();
      let buffer = "";
      let fullAssistantResponse = "";

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
              fullAssistantResponse += delta;
            }
          } catch {
            // Ignore partial parse errors while streaming.
          }
        }
      }

      // Save the complete assistant response to Firestore after streaming ends
      if (fullAssistantResponse) {
        await saveMessage(fullAssistantResponse, "assistant");
      }
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Something went wrong.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) {
    return null; // Auth overlay will show
  }

  return (
    <main className="flex flex-1 flex-col overflow-hidden rounded-[32px] border border-slate-800 bg-slate-950/90 shadow-2xl shadow-slate-950/20">
      <div className="flex flex-col gap-4 border-b border-slate-800 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Live assistant</p>
          <h2 className="mt-2 text-3xl font-semibold text-white">
            {activeAssistant?.name || "Aether Assist"}
          </h2>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {activeAssistant && (
            <div className="flex min-w-[240px] flex-col gap-2 text-sm text-slate-400">
              <span className="text-xs font-medium">Model</span>
              <div className="rounded-2xl border border-slate-700 bg-slate-900/95 px-4 py-3 text-slate-100">
                {activeAssistant.model}
              </div>
            </div>
          )}
        </div>
      </div>

      <section className="flex flex-1 flex-col overflow-hidden px-6 py-6">
        <div className="flex-1 space-y-4 overflow-y-auto pr-2">
          {loading ? (
            <div className="flex h-full min-h-[320px] flex-col items-center justify-center rounded-[28px] border border-dashed border-slate-800 bg-slate-900/60 p-10 text-center">
              <p className="text-lg font-semibold text-white">Loading chat...</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex h-full min-h-[320px] flex-col items-center justify-center rounded-[28px] border border-dashed border-slate-800 bg-slate-900/60 p-10 text-center">
              <p className="text-lg font-semibold text-white">
                {activeAssistant ? `Chat with ${activeAssistant.name}` : "Ready when you are"}
              </p>
              <p className="mt-3 max-w-xl text-sm leading-6 text-slate-400">
                {activeAssistant
                  ? `${activeAssistant.systemPrompt.substring(0, 100)}...`
                  : "Select an assistant from the sidebar to start chatting."}
              </p>
            </div>
          ) : (
            messages.map((message) => (
              <div key={message.id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[90%] ${message.role === "user" ? "rounded-br-none" : "rounded-bl-none"} ${roleStyles[message.role === "user" ? "user" : "assistant"]} px-5 py-4`}>
                  <div className="mb-2 text-[11px] uppercase tracking-[0.24em] text-slate-500">
                    {message.role === "user" ? "You" : activeAssistant?.name || "Assistant"}
                  </div>
                  <div className="whitespace-pre-wrap text-sm leading-7 text-slate-100">{message.content}</div>
                </div>
              </div>
            ))
          )}
        </div>

        {activeAssistant && currentChat ? (
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
        ) : (
          <div className="mt-6 rounded-3xl border border-slate-700 bg-slate-900/80 px-4 py-3 text-sm text-slate-400 text-center">
            {activeAssistant ? "Initializing chat..." : "Select an assistant from the sidebar to start chatting."}
          </div>
        )}

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
  );
}

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex min-h-screen max-w-[1600px] gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <AuthProvider>
          <AssistantProvider>
            <AuthOverlay />
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
                  A premium conversation workspace for your private assistant. Choose an assistant and start a new chat.
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
                  <AssistantsSidebar />
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

            <ChatWorkspace />
          </AssistantProvider>
        </AuthProvider>
      </div>
    </div>
  );
}
