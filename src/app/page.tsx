"use client";

import { type FormEvent, useState, useEffect } from "react";
import { ArrowRight, Sparkles, Menu, X } from "lucide-react";
import { AuthProvider, useAuth } from "../components/AuthContext";
import { AssistantProvider, useAssistant } from "../components/AssistantContext";
import AssistantsSidebar from "../components/AssistantsSidebar";
import { useFirestoreChat } from "../hooks/useFirestoreChat";

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
  
  // 1. Context-ல் இருந்து தேவையான அனைத்து வேரியபிள்களையும் இங்கே எடுக்கிறோம்
  const { 
    activeAssistant, 
    activeChatId, 
    setActiveChatId, 
    chats, 
    assistants, 
    selectAssistant 
  } = useAssistant();
  
  // லோக்கல் useChat-க்கு பதிலாக ஃபயர்ஸ்டோர் ஹூக்கைப் பயன்படுத்துகிறோம்
  const { 
    messages, 
    loadingMessages, 
    sendMessageToFirestore, 
    createNewChatThread 
  } = useFirestoreChat(user?.uid, activeAssistant?.assistantId, activeChatId);

  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [model, setModel] = useState<string>("");

  // 2. சாட் மாறும்போது அதற்குரிய அசிஸ்டண்ட்டை ஹெடருடன் சிங்க் செய்யும் மேஜிக் useEffect
  useEffect(() => {
    if (activeChatId && chats && chats.length > 0 && assistants && assistants.length > 0) {
      // தற்போதைய ஆக்டிவ் சாட்டின் விபரங்களை எடுக்கிறோம்
      const currentChatData = chats.find((c) => c.id === activeChatId);
      
      if (currentChatData && currentChatData.assistantId) {
        // அந்த சாட்டிற்குரிய அசிஸ்டண்ட்டை கண்டுபிடிக்கிறோம்
        const matchingAssistant = assistants.find((a) => a.assistantId === currentChatData.assistantId);
        
        // அது தற்போதைய ஆக்டிவ் அசிஸ்டண்ட்டாக இல்லை என்றால் மட்டும் அப்டேட் செய்கிறோம்
        if (matchingAssistant && matchingAssistant.assistantId !== activeAssistant?.assistantId) {
          if (selectAssistant) {
            selectAssistant(matchingAssistant);
          }
        }
      }
    }
  }, [activeChatId, chats, assistants, activeAssistant, selectAssistant]);
  
  // Sync model with active assistant
  useEffect(() => {
    if (activeAssistant?.model) {
      setModel(activeAssistant.model);
    }
  }, [activeAssistant]);

  const sendMessage = async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    const trimmed = input.trim();
    
    if (!trimmed || isLoading || !activeAssistant) {
      if (!activeAssistant) setError("Please select an assistant first.");
      return;
    }

    setInput("");
    setError(null);
    setIsLoading(true);

    try {
      let currentTargetChatId = activeChatId;

      // ஒருவேளை ஆக்டிவ் சாட் ஐடி இல்லை என்றால் (New Conversation Mode) புது த்ரெட் உருவாக்குதல்
      if (!currentTargetChatId) {
        const titlePreview = trimmed.substring(0, 40) || "New Conversation";
        const newId = await createNewChatThread(titlePreview);
        if (!newId) throw new Error("Failed to create a new chat session.");
        
        currentTargetChatId = newId;
        // Context-ஐ அப்டேட் செய்வதால் சைட்பாரிலும் இது ஆக்டிவ் ஆகும்
        if (setActiveChatId) setActiveChatId(newId);
      }

      // பயனரின் மெசேஜை ஃபயர்ஸ்டோரில் சேமித்தல்
      await sendMessageToFirestore(currentTargetChatId, "user", trimmed);

      // API-க்கு அனுப்ப தற்போதைய மெசேஜ்களை மேப் செய்தல்
      const apiMessages = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));
      apiMessages.push({
        role: "user",
        content: trimmed,
      });

      // ஏபிஐ கால் (API Request) செய்தல்
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
      if (!reader) throw new Error("No readable stream available.");

      const decoder = new TextDecoder();
      let buffer = "";
      let fullAssistantResponse = "";

      // ஸ்ட்ரீமிங் டேட்டாவைப் படித்தல்
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
            // Partial parse எர்ரர்களை இக்னோர் செய்தல்
          }
        }
      }

      // அசிஸ்டண்ட் ரெஸ்பான்ஸை ஃபயர்ஸ்டோரில் சேமித்தல்
      if (fullAssistantResponse) {
        await sendMessageToFirestore(currentTargetChatId, "assistant", fullAssistantResponse);
      }
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Something went wrong.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) return null;

  return (
    <main className="flex flex-1 flex-col overflow-hidden rounded-[32px] border border-slate-800 bg-slate-950/90 shadow-2xl shadow-slate-950/20 relative">
      {/* Header */}
      <div className="flex flex-row items-center justify-between border-b border-slate-800 px-6 py-5">
        <div className="flex items-center gap-3">
          <button 
            onClick={onMenuClick}
            className="rounded-xl border border-slate-800 bg-slate-900/60 p-2 text-slate-400 hover:text-white lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Live assistant</p>
            <h2 className="mt-1 text-2xl sm:text-3xl font-semibold text-white">
              {activeAssistant?.name || "Aether Assist"}
            </h2>
          </div>
        </div>
        <div className="hidden sm:flex flex-col gap-3 sm:flex-row sm:items-center">
          {activeAssistant && (
            <div className="flex min-w-[240px] flex-col gap-2 text-sm text-slate-400">
              <span className="text-xs font-medium">Model</span>
              <div className="rounded-2xl border border-slate-700 bg-slate-900/95 px-4 py-2.5 text-slate-100 text-xs">
                {activeAssistant.model}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Messages Area */}
      <section className="flex-1 overflow-y-auto px-6 py-6 space-y-4 min-h-0 pb-32">
        {loadingMessages ? (
          <div className="flex h-full min-h-[320px] flex-col items-center justify-center rounded-[28px] border border-dashed border-slate-800 bg-slate-900/60 p-10 text-center">
            <p className="text-lg font-semibold text-white animate-pulse">Loading chat...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full min-h-[320px] flex-col items-center justify-center rounded-[28px] border border-dashed border-slate-800 bg-slate-900/60 p-10 text-center">
            <p className="text-lg font-semibold text-white">
              {activeAssistant ? `Chat with ${activeAssistant.name}` : "Ready when you are"}
            </p>
            <p className="mt-3 max-w-xl text-sm leading-6 text-slate-400">
              {activeAssistant
                ? `${activeAssistant.systemPrompt?.substring(0, 100)}...`
                : "Select an assistant from the sidebar to start chatting."}
            </p>
          </div>
        ) : (
          messages.map((message, idx) => (
            <div key={idx} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[85%] sm:max-w-[75%] ${message.role === "user" ? "rounded-br-none" : "rounded-bl-none"} ${roleStyles[message.role === "user" ? "user" : "assistant"]} px-5 py-4`}>
                <div className="mb-2 text-[11px] uppercase tracking-[0.24em] text-slate-500">
                  {message.role === "user" ? "You" : activeAssistant?.name || "Assistant"}
                </div>
                <div className="whitespace-pre-wrap text-[15px] leading-7 text-slate-100">{message.content}</div>
              </div>
            </div>
          ))
        )}
      </section>

      {/* Fixed/Floating Input Area */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-slate-950 via-slate-950/95 to-transparent px-6 pb-6 pt-4 border-t border-t-slate-900/50">
        {activeAssistant ? (
          <form className="flex items-center gap-3 rounded-[24px] border border-slate-800 bg-slate-900/90 p-2.5 shadow-xl" onSubmit={sendMessage}>
            <textarea
              rows={1}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder={activeChatId ? "Ask something..." : "Type to start a new conversation..."}
              className="h-12 flex-1 resize-none rounded-xl border border-slate-800 bg-slate-950/90 px-4 py-3 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-slate-600"
              style={{ minHeight: "48px" }}
            />
            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-950 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ArrowRight className="h-5 w-5" />
            </button>
          </form>
        ) : (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 px-4 py-3 text-sm text-slate-400 text-center">
            Select an assistant from the sidebar to start chatting.
          </div>
        )}

        {isLoading && (
          <div className="absolute -top-10 left-6 right-6 rounded-xl border border-slate-800 bg-slate-900/95 px-4 py-2 text-xs text-slate-400 w-fit shadow-lg animate-pulse">
            Generating response...
          </div>
        )}
        {error && (
          <div className="absolute -top-12 left-6 right-6 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-2 text-xs text-rose-200 w-fit shadow-lg">
            {error}
          </div>
        )}
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
            
            {/* Desktop Sidebar */}
            <aside className="hidden w-80 shrink-0 flex-col gap-6 rounded-3xl border border-slate-800 bg-slate-900/90 p-6 shadow-xl shadow-slate-950/20 lg:flex overflow-y-auto">
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

              <div className="space-y-3 flex-1">
                <div className="rounded-3xl border border-slate-800 bg-slate-950/70 p-4">
                  <AssistantsSidebar />
                </div>
              </div>
            </aside>

            {/* Mobile Backdrop Overlay for Sidebar */}
            {sidebarOpen && (
              <div 
                className="fixed inset-0 z-40 bg-black/60 lg:hidden backdrop-blur-sm"
                onClick={() => setSidebarOpen(false)}
              />
            )}

            {/* Mobile Slide-over Drawer Sidebar */}
            <div className={`fixed inset-y-0 left-0 z-50 w-80 max-w-[calc(100vw-3rem)] transform bg-slate-900 border-r border-slate-800 p-6 shadow-2xl transition-transform duration-300 ease-in-out lg:hidden flex flex-col gap-6 overflow-y-auto ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Aether Assist</p>
                  <h1 className="mt-1 text-xl font-semibold text-white">Personal Assistant</h1>
                </div>
                <button 
                  onClick={() => setSidebarOpen(false)}
                  className="rounded-xl border border-slate-800 bg-slate-800 p-2 text-slate-400 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="overflow-y-auto flex-1 pb-4">
                <AssistantsSidebar />
              </div>
            </div>

            {/* Main Chat Area */}
            <ChatWorkspace onMenuClick={() => setSidebarOpen(true)} />
          </AssistantProvider>
        </AuthProvider>
      </div>
    </div>
  );
}