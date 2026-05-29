"use client";

import React, { useState } from "react";
import { useAssistant } from "./AssistantContext";
import CreateAssistantForm from "./CreateAssistantForm";
import { Plus, Trash2, MessageSquare } from "lucide-react";
import { db } from "../lib/firebase";
import { doc, deleteDoc } from "firebase/firestore";

function formatRelativeTime(timestamp?: any) {
  if (!timestamp) return "—";
  // Firestore timestamp-ஆக இருந்தால் அதை மில்லிசெகண்டாக மாற்றுதல்
  const date = timestamp?.seconds ? new Date(timestamp.seconds * 1000) : new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "—";

  const diff = Date.now() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return `Just now`;
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;

  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function AssistantsSidebar() {
  // குறிப்பு: உங்க AssistantContext-ல் activeChatId மற்றும் setActiveChatId (அல்லது selectChat) இருக்க வேண்டும்.
  // தற்போதைக்கு Context-ல் இவை இருப்பதாகக் கொண்டு எழுதியுள்ளேன்.
  const { 
    assistants, 
    chats, 
    activeAssistant, 
    selectAssistant, 
    loading,
    activeChatId,
    setActiveChatId 
  } = useAssistant();
  
  const [showCreateModal, setShowCreateModal] = useState(false);

  // சாட்டை டெலீட் செய்யும் ஃபங்ஷன்
  const handleDeleteChat = async (e: React.MouseEvent, chatId: string) => {
    e.stopPropagation(); // கிளிக் சாட் ஓப்பனாவதைத் தடுத்தல்
    if (!window.confirm("Are you sure you want to delete this chat?")) return;
    
    try {
      await deleteDoc(doc(db, "chats", chatId));
      if (activeChatId === chatId) {
        if (setActiveChatId) setActiveChatId(null);
      }
    } catch (error) {
      console.error("Error deleting chat:", error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Assistants List Section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Your Assistants</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1 p-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition border border-transparent hover:border-slate-700"
            title="Create Assistant"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
        <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
          {loading ? (
            <div className="text-sm text-slate-400 animate-pulse">Loading...</div>
          ) : assistants.length === 0 ? (
            <div className="text-sm text-slate-400 italic">No assistants yet. Create one.</div>
          ) : (
            assistants.map((a) => (
              <button
                key={a.assistantId}
                onClick={() => selectAssistant(a)}
                className={`w-full text-left rounded-xl px-3 py-2.5 transition hover:bg-slate-800 ${activeAssistant?.assistantId === a.assistantId ? "bg-indigo-700/30 border border-indigo-500/30" : "bg-slate-900/30 border border-slate-800/40"}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-slate-100 text-sm truncate">{a.name}</div>
                    <div className="mt-0.5 text-xs text-slate-400 truncate">{a.systemPrompt?.substring(0, 45) || "—"}</div>
                  </div>
                  <div className="text-[10px] text-slate-500 shrink-0">
                    {formatRelativeTime(a.createdAt)}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Recent Chats Section */}
      <div className="pt-2 border-t border-slate-800/60">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Recent Chats</p>
          <button
            onClick={() => setActiveChatId && setActiveChatId(null)}
            className="flex items-center gap-1 p-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition border border-transparent hover:border-slate-700"
            title="New Conversation"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
        
        <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
          {chats.length === 0 ? (
            <div className="text-sm text-slate-400 italic">No recent chats</div>
          ) : (
            chats.map((c: any) => {
              const chatId = c.id || c.chatId;
              const isActive = activeChatId === chatId;
              return (
                <div 
                  key={chatId} 
                  onClick={() => setActiveChatId && setActiveChatId(chatId)}
                  className={`group w-full rounded-xl border px-3 py-2.5 transition cursor-pointer flex items-center justify-between gap-2 
                    ${isActive 
                      ? "bg-indigo-700/20 border-indigo-500/40 hover:bg-indigo-700/30" 
                      : "bg-slate-900/40 border-slate-800/40 hover:bg-slate-800/40"
                    }`}
                >
                  <div className="flex-1 min-w-0 flex items-start gap-2">
                    <MessageSquare className={`w-4 h-4 mt-0.5 shrink-0 ${isActive ? "text-indigo-400" : "text-slate-500"}`} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-slate-200 truncate">{c.title || "Chat"}</div>
                      <div className="mt-0.5 text-xs text-slate-400 truncate">
                        {c.lastMessage || "Open conversation"}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="text-[10px] text-slate-500 group-hover:hidden">
                      {formatRelativeTime(c.lastMessageAt)}
                    </span>
                    <button
                      onClick={(e) => handleDeleteChat(e, chatId)}
                      className="p-1 rounded text-slate-500 hover:text-red-400 hover:bg-slate-800 transition opacity-0 group-hover:opacity-100"
                      title="Delete Chat"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {showCreateModal && (
        <CreateAssistantForm
          isModal={true}
          onSuccess={() => setShowCreateModal(false)}
          onClose={() => setShowCreateModal(false)}
        />
      )}
    </div>
  );
}