"use client";

import React, { useState } from "react";
import { useAssistant } from "./AssistantContext";
import CreateAssistantForm from "./CreateAssistantForm";
import { Plus } from "lucide-react";

function formatRelativeTime(timestamp?: string) {
  if (!timestamp) return "—";
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "—";

  const diff = Date.now() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return `${seconds}s ago`;
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;

  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function AssistantsSidebar() {
  const { assistants, chats, activeAssistant, selectAssistant, loading } = useAssistant();
  const [showCreateModal, setShowCreateModal] = useState(false);

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
        <p className="text-xs uppercase tracking-[0.24em] text-slate-500 mb-3">Recent Chats</p>
        <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
          {chats.length === 0 ? (
            <div className="text-sm text-slate-400 italic">No recent chats</div>
          ) : (
            chats.slice(0, 6).map((c: any) => (
              <div key={c.chatId ?? c.id} className="w-full rounded-xl bg-slate-900/40 border border-slate-800/40 px-3 py-2.5 hover:bg-slate-800/30 transition cursor-pointer">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm font-medium text-slate-200 truncate">{c.title || c.assistantId || "Chat"}</div>
                  <div className="text-[10px] text-slate-500 shrink-0">{formatRelativeTime(c.lastMessageAt)}</div>
                </div>
                <div className="mt-0.5 text-xs text-slate-400 truncate">
                  {(c.messages?.[c.messages.length - 1]?.text) || (c.title ? "Open conversation" : "No messages")}
                </div>
              </div>
            ))
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