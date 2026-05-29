"use client";

import React, { useState } from "react";
import { useAssistant } from "./AssistantContext";
import CreateAssistantForm from "./CreateAssistantForm";
import { Plus, Trash2, Edit2, Check, X, MessageSquare, Play } from "lucide-react";
import { db } from "../lib/firebase";
import { doc, deleteDoc, updateDoc } from "firebase/firestore";

function formatRelativeTime(timestamp?: any) {
  if (!timestamp) return "—";
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
  const { 
    assistants, 
    chats, 
    activeAssistant, 
    selectAssistant, 
    loading,
    activeChatId,
    setActiveChatId,
    selectedVoice,     // கன்டெக்ஸ்டில் இருந்து பெறுவது
    setSelectedVoice   // கன்டெக்ஸ்டில் இருந்து பெறுவது
  } = useAssistant();
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");

  const handleDeleteChat = async (e: React.MouseEvent, chatId: string) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this chat?")) return;
    try {
      await deleteDoc(doc(db, "chats", chatId));
      if (activeChatId === chatId) setActiveChatId?.(null);
    } catch (error) {
      console.error("Error deleting chat:", error);
    }
  };

  const handleStartEdit = (e: React.MouseEvent, chatId: string, currentTitle: string) => {
    e.stopPropagation();
    setEditingChatId(chatId);
    setEditTitle(currentTitle || "Chat");
  };

  const handleSaveTitle = async (chatId: string) => {
    if (!editTitle.trim()) { setEditingChatId(null); return; }
    try {
      await updateDoc(doc(db, "chats", chatId), { title: editTitle.trim() });
      setEditingChatId(null);
    } catch (error) {
      console.error("Error updating chat title:", error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Voice Selection Section */}
      <div className="bg-slate-950/50 p-4 rounded-2xl border border-slate-800">
        <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 mb-3">Voice Settings</p>
        <select 
            value={selectedVoice}
            onChange={(e) => setSelectedVoice?.(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 text-slate-200 p-2.5 rounded-xl text-sm outline-none hover:border-slate-600 cursor-pointer transition"
        >
            <option value="pNInz6obpgDQGcFmaJgB">Adam (Professional)</option>
            <option value="21m00Tcm4TlvDq8ikWAM">Rachel (Soft & Calm)</option>
            <option value="EXAVITQu4vr4xnSDxMaL">Bella (Expressive)</option>
        </select>
      </div>

      {/* Assistants List Section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Your Assistants</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1 p-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition border border-transparent hover:border-slate-700"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
        <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
          {loading ? (
            <div className="text-sm text-slate-400 animate-pulse">Loading...</div>
          ) : assistants.length === 0 ? (
            <div className="text-sm text-slate-400 italic">No assistants yet.</div>
          ) : (
            assistants.map((a) => (
              <button
                key={a.assistantId}
                onClick={() => selectAssistant(a)}
                className={`w-full text-left rounded-xl px-3 py-2.5 transition hover:bg-slate-800 ${activeAssistant?.assistantId === a.assistantId ? "bg-indigo-700/30 border border-indigo-500/30" : "bg-slate-900/30 border border-slate-800/40"}`}
              >
                <div className="font-semibold text-slate-100 text-sm truncate">{a.name}</div>
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
            onClick={() => setActiveChatId?.(null)}
            className="p-1.5 rounded-md hover:bg-slate-800 text-slate-400 transition"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
        
        <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
          {chats.map((c: any) => {
            const chatId = c.id || c.chatId;
            const isActive = activeChatId === chatId;
            const isEditing = editingChatId === chatId;

            return (
              <div key={chatId} className={`group w-full rounded-xl border px-3 py-2.5 flex items-center justify-between ${isActive ? "bg-indigo-700/20 border-indigo-500/40" : "bg-slate-900/40 border-slate-800/40"}`}>
                <div className="flex-1 truncate" onClick={() => !isEditing && setActiveChatId?.(chatId)}>
                  {isEditing ? (
                    <input autoFocus value={editTitle} onChange={(e) => setEditTitle(e.target.value)} onBlur={() => handleSaveTitle(chatId)} className="w-full bg-slate-800 text-sm px-1 outline-none" />
                  ) : (
                    <span className="text-sm text-slate-200">{c.title || "Chat"}</span>
                  )}
                </div>
                {!isEditing && (
                  <div className="hidden group-hover:flex items-center">
                    <button onClick={(e) => handleStartEdit(e, chatId, c.title)} className="p-1 text-slate-400 hover:text-indigo-400"><Edit2 className="w-3.5 h-3.5" /></button>
                    <button onClick={(e) => handleDeleteChat(e, chatId)} className="p-1 text-slate-500 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {showCreateModal && (
        <CreateAssistantForm isModal={true} onSuccess={() => setShowCreateModal(false)} onClose={() => setShowCreateModal(false)} />
      )}
    </div>
  );
}