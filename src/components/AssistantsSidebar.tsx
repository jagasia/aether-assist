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
    <div className="space-y-4">
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Your Assistants</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1 p-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition"
            title="Create Assistant"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
        <div className="mt-3 space-y-2">
          {loading ? (
            <div className="text-sm text-slate-400">Loading...</div>
          ) : assistants.length === 0 ? (
            <div className="text-sm text-slate-400">No assistants yet. Create one.</div>
          ) : (
            assistants.map((a) => (
              <button
                key={a.assistantId}
                onClick={() => selectAssistant(a)}
                className={`w-full text-left rounded-xl px-3 py-2 transition hover:bg-slate-800 ${activeAssistant?.assistantId === a.assistantId ? "bg-indigo-700/30" : "bg-slate-900/50"}`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-slate-100">{a.name}</div>
                    <div className="mt-1 text-xs text-slate-400 truncate">{a.systemPrompt?.substring(0, 50) || "—"}</div>
                  </div>
                  <div className="text-xs text-slate-400">
                    {formatRelativeTime(a.createdAt)}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      <div>
        <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Recent Chats</p>
        <div className="mt-3 space-y-2">
          {chats.length === 0 ? (
            <div className="text-sm text-slate-400">No recent chats</div>
          ) : (
            chats.slice(0, 6).map((c: any) => (
              <div key={c.chatId ?? c.id} className="w-full rounded-xl bg-slate-900/50 px-3 py-2">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-slate-100">{c.assistantId ?? "Chat"}</div>
                  <div className="text-xs text-slate-400">{formatRelativeTime(c.lastMessageAt)}</div>
                </div>
                <div className="mt-1 text-xs text-slate-400 truncate">{(c.messages?.[c.messages.length - 1]?.text) ?? "No messages"}</div>
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
