"use client";

import { type FormEvent, useState, useEffect, useRef } from "react";
import { ArrowRight, Sparkles, Menu, X, Copy, Download, Volume2, Loader2, Square } from "lucide-react";
import { AuthProvider, useAuth } from "../components/AuthContext";
import { AssistantProvider, useAssistant } from "../components/AssistantContext";
import AssistantsSidebar from "../components/AssistantsSidebar";
import { useFirestoreChat } from "../hooks/useFirestoreChat";

import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";

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

interface ChatWorkspaceProps {
  onMenuClick: () => void;
}

function ChatWorkspace({ onMenuClick }: ChatWorkspaceProps) {
  const { user } = useAuth();
  const { activeAssistant, activeChatId, setActiveChatId, chats, assistants, selectAssistant } = useAssistant();
  const { messages, loadingMessages, sendMessageToFirestore, createNewChatThread } = useFirestoreChat(user?.uid, activeAssistant?.assistantId, activeChatId);

  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [model, setModel] = useState<string>("");
  const [streamingResponse, setStreamingResponse] = useState<string>("");
  const [isSpeaking, setIsSpeaking] = useState<string | null>(null);
  const [selectedVoice, setSelectedVoice] = useState('pNInz6obpgDQGcFmaJgB');
  
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });

  useEffect(() => { scrollToBottom(); }, [messages, streamingResponse]);

  const playAudio = async (text: string, messageId: string) => {
    if (isSpeaking === messageId) {
        audioRef.current?.pause();
        setIsSpeaking(null);
        return;
    }

    setIsSpeaking(messageId);
    try {
      const response = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, voiceId: selectedVoice }),
      });
      if (!response.ok) throw new Error("Audio generation failed");
      const audioBlob = await response.blob();
      const audio = new Audio(URL.createObjectURL(audioBlob));
      audioRef.current = audio;
      audio.play();
      audio.onended = () => setIsSpeaking(null);
    } catch (error) {
      console.error(error);
      setIsSpeaking(null);
    }
  };

  useEffect(() => {
    if (activeChatId && chats && chats.length > 0 && assistants && assistants.length > 0) {
      const currentChatData = chats.find((c) => c.id === activeChatId);
      if (currentChatData?.assistantId) {
        const matchingAssistant = assistants.find((a) => a.assistantId === currentChatData.assistantId);
        if (matchingAssistant && matchingAssistant.assistantId !== activeAssistant?.assistantId) {
          selectAssistant?.(matchingAssistant);
        }
      }
    }
  }, [activeChatId, chats, assistants, activeAssistant, selectAssistant]);

  useEffect(() => { if (activeAssistant?.model) setModel(activeAssistant.model); }, [activeAssistant]);

  const sendMessage = async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isLoading || !activeAssistant) {
      if (!activeAssistant) setError("Please select an assistant first.");
      return;
    }
    setInput(""); setError(null); setIsLoading(true); setStreamingResponse("");

    try {
      let currentTargetChatId = activeChatId;
      let isNewChat = false;
      if (!currentTargetChatId) {
        isNewChat = true;
        const newId = await createNewChatThread(trimmed.substring(0, 40) || "New Conversation");
        if (!newId) throw new Error("Failed to create a new chat session.");
        currentTargetChatId = newId;
        setActiveChatId?.(newId);
      }
      await sendMessageToFirestore(currentTargetChatId, "user", trimmed);
      const apiMessages = [...messages.map(m => ({ role: m.role, content: m.content })), { role: "user", content: trimmed }];

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: model || activeAssistant.model, messages: apiMessages, assistantId: activeAssistant.assistantId, systemPrompt: activeAssistant.systemPrompt, chatId: currentTargetChatId, isNewChat }),
      });

      if (!response.ok) throw new Error(await response.text() || "Chat request failed.");

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullAssistantResponse = "";
      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          chunk.split("\n").forEach(line => {
            if (line.startsWith("data:") && !line.includes("[DONE]")) {
              try {
                const parsed = JSON.parse(line.replace("data:", ""));
                const delta = parsed.choices?.[0]?.delta?.content ?? parsed.choices?.[0]?.message?.content;
                if (delta) { fullAssistantResponse += delta; setStreamingResponse(fullAssistantResponse); }
              } catch {}
            }
          });
        }
      }
      if (fullAssistantResponse) await sendMessageToFirestore(currentTargetChatId, "assistant", fullAssistantResponse);
    } catch (e: any) { setError(e.message); } finally { setIsLoading(false); setStreamingResponse(""); }
  };

  const MarkdownComponents = {
    code({ node, inline, className, children, ...props }: any) {
      const match = /language-(\w+)/.exec(className || "");
      const codeContent = String(children).replace(/\n$/, "");
      const handleCopy = () => navigator.clipboard.writeText(codeContent);
      const handleDownload = () => {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(new Blob([codeContent], { type: "text/plain" }));
        a.download = `code.${match ? match[1] : "txt"}`;
        a.click();
      };
      return !inline && match ? (
        <div className="my-3 overflow-hidden rounded-xl border border-slate-800 shadow-lg">
          <div className="bg-slate-900 px-4 py-1.5 text-xs font-mono text-slate-400 border-b border-slate-800 flex justify-between items-center">
            <span>{match[1].toUpperCase()}</span>
            <div className="flex gap-2">
              <button onClick={handleCopy} className="hover:text-white flex items-center gap-1"><Copy className="h-3 w-3" /> Copy</button>
              <button onClick={handleDownload} className="hover:text-white flex items-center gap-1"><Download className="h-3 w-3" /></button>
            </div>
          </div>
          <SyntaxHighlighter style={vscDarkPlus as any} language={match[1]} PreTag="div" customStyle={{ margin: 0, padding: "1rem", background: "#020617", fontSize: "14px", lineHeight: "1.5" }} {...props}>
            {codeContent}
          </SyntaxHighlighter>
        </div>
      ) : (
        <code className="bg-slate-950/80 text-rose-400 px-1.5 py-0.5 rounded font-mono text-sm" {...props}>{children}</code>
      );
    }
  };

  return (
    <main className="flex flex-1 flex-col overflow-hidden rounded-[32px] border border-slate-800 bg-slate-950/90 shadow-2xl relative">
      <div className="flex items-center justify-between border-b border-slate-800 px-6 py-5">
        <div className="flex items-center gap-3">
          <button onClick={onMenuClick} className="rounded-xl border border-slate-800 bg-slate-900/60 p-2 text-slate-400 hover:text-white lg:hidden"><Menu className="h-5 w-5" /></button>
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Live assistant</p>
            <h2 className="mt-1 text-2xl sm:text-3xl font-semibold text-white">{activeAssistant?.name || "Aether Assist"}</h2>
            <select 
                value={selectedVoice}
                onChange={(e) => setSelectedVoice(e.target.value)}
                className="mt-2 bg-slate-900 border border-slate-700 text-slate-300 text-xs rounded-lg p-1 outline-none hover:border-slate-500 cursor-pointer"
            >
                <option value="pNInz6obpgDQGcFmaJgB">Adam (Professional)</option>
                <option value="21m00Tcm4TlvDq8ikWAM">Rachel (Soft & Calm)</option>
                <option value="EXAVITQu4vr4xnSDxMaL">Bella (Expressive)</option>
            </select>
          </div>
        </div>
      </div>
      <section className="flex-1 overflow-y-auto px-6 py-6 space-y-4 min-h-0 pb-32">
        {loadingMessages ? (
          <div className="flex h-full min-h-[320px] flex-col items-center justify-center rounded-[28px] border border-dashed border-slate-800 bg-slate-900/60 p-10 text-center">
            <p className="text-lg font-semibold text-white animate-pulse">Loading chat...</p>
          </div>
        ) : messages.length === 0 && !streamingResponse ? (
          <div className="flex h-full min-h-[320px] flex-col items-center justify-center rounded-[28px] border border-dashed border-slate-800 bg-slate-900/60 p-10 text-center">
            <p className="text-lg font-semibold text-white">{activeAssistant ? `Chat with ${activeAssistant.name}` : "Ready when you are"}</p>
          </div>
        ) : (
          <>
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] sm:max-w-[75%] ${roleStyles[m.role]} px-5 py-4`}>
                    <div className="mb-2 text-[11px] uppercase tracking-[0.24em] text-slate-500">{m.role === "user" ? "You" : activeAssistant?.name}</div>
                    <div className="prose prose-invert max-w-none text-[15px] leading-7"><ReactMarkdown components={MarkdownComponents}>{m.content}</ReactMarkdown></div>
                    {m.role === "assistant" && (
                        <button 
                            onClick={() => playAudio(m.content, i.toString())}
                            className="mt-2 text-slate-500 hover:text-indigo-400 transition-colors"
                        >
                            {isSpeaking === i.toString() ? <Square className="h-4 w-4 fill-current" /> : <Volume2 className="h-4 w-4" />}
                        </button>
                    )}
                </div>
              </div>
            ))}
            {streamingResponse && (
                <div className="flex justify-start">
                    <div className="max-w-[85%] sm:max-w-[75%] rounded-3xl rounded-bl-none border border-slate-700 bg-slate-900 px-5 py-4">
                        <div className="prose prose-invert max-w-none text-[15px]"><ReactMarkdown components={MarkdownComponents}>{streamingResponse}</ReactMarkdown></div>
                    </div>
                </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </section>
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-slate-950 via-slate-950/95 to-transparent px-6 pb-6 pt-4 border-t border-t-slate-900/50">
        <form className="flex items-center gap-3 rounded-[24px] border border-slate-800 bg-slate-900/90 p-2.5 shadow-xl" onSubmit={sendMessage}>
          <textarea rows={1} value={input} onChange={(e) => setInput(e.target.value)} className="h-12 flex-1 resize-none rounded-xl border border-slate-800 bg-slate-950/90 px-4 py-3 text-sm text-slate-100 outline-none" style={{ minHeight: "48px" }} />
          <button type="submit" disabled={isLoading} className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-950 hover:bg-white"><ArrowRight className="h-5 w-5" /></button>
        </form>
      </div>
    </main>
  );
}

export default function Home() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 overflow-hidden">
      <div className="mx-auto flex h-screen max-w-[1600px] gap-6 p-4 sm:p-6 lg:p-8 overflow-hidden">
        <AuthProvider>
          <AssistantProvider>
            <AuthOverlay />
            <aside className="hidden w-80 shrink-0 flex-col gap-6 rounded-3xl border border-slate-800 bg-slate-900/90 p-6 shadow-xl shadow-slate-950/20 lg:flex overflow-y-auto">
                <div className="space-y-4">
                    <div className="flex items-center justify-between gap-4">
                        <div>
                            <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Aether Assist</p>
                            <h1 className="mt-2 text-2xl font-semibold text-white">Personal Assistant</h1>
                        </div>
                        <div className="rounded-2xl bg-slate-800 p-2 text-slate-300"><Sparkles className="h-5 w-5" /></div>
                    </div>
                </div>
                <div className="space-y-3 flex-1">
                    <div className="rounded-3xl border border-slate-800 bg-slate-950/70 p-4"><AssistantsSidebar /></div>
                </div>
            </aside>
            {sidebarOpen && <div className="fixed inset-0 z-40 bg-black/60 lg:hidden backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />}
            <div className={`fixed inset-y-0 left-0 z-50 w-80 transform bg-slate-900 border-r border-slate-800 p-6 shadow-2xl transition-transform duration-300 lg:hidden ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
                <div className="flex items-center justify-between mb-6">
                    <h1 className="text-xl font-semibold text-white">Aether Assist</h1>
                    <button onClick={() => setSidebarOpen(false)}><X className="h-5 w-5" /></button>
                </div>
                <AssistantsSidebar />
            </div>
            <ChatWorkspace onMenuClick={() => setSidebarOpen(true)} />
          </AssistantProvider>
        </AuthProvider>
      </div>
    </div>
  );
}