"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { db } from "../lib/firebase";
import { collection, query, where, orderBy, onSnapshot } from "firebase/firestore";
import type { Assistant } from "../types/index";
import { useAuth } from "./AuthContext";

type AssistantContextType = {
  assistants: Assistant[];
  chats: any[];
  activeAssistant: Assistant | null;
  selectAssistant: (a: Assistant) => void;
  loading: boolean;
  refresh: () => void;
  activeChatId: string | null; // புதுசு
  setActiveChatId: (id: string | null) => void; // புதுசு
};

const AssistantContext = createContext<AssistantContextType | undefined>(undefined);

export const AssistantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [assistants, setAssistants] = useState<Assistant[]>([]);
  const [chats, setChats] = useState<any[]>([]);
  const [activeAssistant, setActiveAssistant] = useState<Assistant | null>(null);
  const [loading, setLoading] = useState(true);
  
  // நாம் புதிதாக சேர்க்கும் சாட் ஸ்டேட்
  const [activeChatId, setActiveChatId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setAssistants([]);
      setChats([]);
      setActiveAssistant(null);
      setActiveChatId(null);
      setLoading(false);
      return;
    }

    if (!db) {
      console.warn("Firestore has not been initialized.");
      setAssistants([]);
      setChats([]);
      setActiveAssistant(null);
      setActiveChatId(null);
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
        // இங்கே கிரிட்டிகல் சேஞ்ச்: c.id-ஐயும் சேர்த்து எடுக்கிறோம் (டெலீட் மற்றும் செலக்ட் செய்ய இது மிக முக்கியம்!)
        const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
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
    // அசிஸ்டண்ட்டை மாற்றும்போது பழைய சாட் ஐடியை க்ளியர் செய்து புது சாட் விண்டோவிற்கு வழி செய்கிறோம்
    setActiveChatId(null); 
  };

  const refresh = () => {
    // placeholder; onSnapshot keeps in sync
  };

  return (
    <AssistantContext.Provider 
      value={{ 
        assistants, 
        chats, 
        activeAssistant, 
        selectAssistant, 
        loading, 
        refresh,
        activeChatId, // எக்ஸ்போர்ட் செய்கிறோம்
        setActiveChatId // எக்ஸ்போர்ட் செய்கிறோம்
      }}
    >
      {children}
    </AssistantContext.Provider>
  );
};

export const useAssistant = () => {
  const ctx = useContext(AssistantContext);
  if (!ctx) throw new Error("useAssistant must be used within AssistantProvider");
  return ctx;
};