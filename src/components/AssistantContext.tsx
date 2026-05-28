"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { db } from "../lib/firebase";
import { collection, query, where, orderBy, onSnapshot } from "firebase/firestore";
import type { Assistant } from "../types";
import { useAuth } from "./AuthContext";

type AssistantContextType = {
  assistants: Assistant[];
  chats: any[];
  activeAssistant: Assistant | null;
  selectAssistant: (a: Assistant) => void;
  loading: boolean;
  refresh: () => void;
};

const AssistantContext = createContext<AssistantContextType | undefined>(undefined);

export const AssistantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [assistants, setAssistants] = useState<Assistant[]>([]);
  const [chats, setChats] = useState<any[]>([]);
  const [activeAssistant, setActiveAssistant] = useState<Assistant | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setAssistants([]);
      setChats([]);
      setActiveAssistant(null);
      setLoading(false);
      return;
    }

    if (!db) {
      console.warn("Firestore has not been initialized.");
      setAssistants([]);
      setChats([]);
      setActiveAssistant(null);
      setLoading(false);
      return;
    }

    setLoading(true);

    const assistantsRef = collection(db, "assistants");
    const assistantsQ = query(assistantsRef, where("userId", "==", user.uid), orderBy("createdAt", "desc"));
    const unsubAssistants = onSnapshot(
      assistantsQ,
      (snap) => {
        const items: Assistant[] = snap.docs.map((d) => d.data() as Assistant);
        setAssistants(items);
        if (!activeAssistant && items.length > 0) setActiveAssistant(items[0]);
        setLoading(false);
      },
      (error) => {
        console.warn("Firestore assistants listener failed", error);
        setAssistants([]);
        setLoading(false);
      }
    );

    const chatsRef = collection(db, "chats");
    const chatsQ = query(chatsRef, where("userId", "==", user.uid), orderBy("lastMessageAt", "desc"));
    const unsubChats = onSnapshot(
      chatsQ,
      (snap) => {
        const items = snap.docs.map((d) => d.data());
        setChats(items);
      },
      (error) => {
        console.warn("Firestore chats listener failed", error);
        setChats([]);
      }
    );

    return () => {
      unsubAssistants();
      unsubChats();
    };
  }, [user]);

  const selectAssistant = (a: Assistant) => {
    setActiveAssistant(a);
  };

  const refresh = () => {
    // placeholder; onSnapshot keeps in sync
  };

  return (
    <AssistantContext.Provider value={{ assistants, chats, activeAssistant, selectAssistant, loading, refresh }}>
      {children}
    </AssistantContext.Provider>
  );
};

export const useAssistant = () => {
  const ctx = useContext(AssistantContext);
  if (!ctx) throw new Error("useAssistant must be used within AssistantProvider");
  return ctx;
};
