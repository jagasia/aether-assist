import { useEffect, useState, useCallback, useRef } from "react";
import { db } from "../lib/firebase";
import {
  collection,
  doc,
  setDoc,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  getDocs,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import type { Assistant } from "../types";

interface ChatMessage {
  id: string;
  content: string;
  role: "user" | "assistant";
  createdAt: string;
}

interface ChatSession {
  chatId: string;
  userId: string;
  assistantId: string;
  title: string;
  lastMessageAt: string;
}

export function useChat(userId: string | undefined, activeAssistant: Assistant | null) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentChat, setCurrentChat] = useState<ChatSession | null>(null);
  const [loading, setLoading] = useState(false);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  // Set up real-time listener for messages when chat changes
  useEffect(() => {
    if (!currentChat || !db) {
      setMessages([]);
      return;
    }

    setLoading(true);

    const messagesRef = collection(db, "chats", currentChat.chatId, "messages");
    const q = query(messagesRef, orderBy("createdAt", "asc"));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        } as ChatMessage));
        setMessages(items);
        setLoading(false);
      },
      (error) => {
        console.warn("Failed to listen to messages", error);
        setMessages([]);
        setLoading(false);
      }
    );

    unsubscribeRef.current = unsubscribe;
    return () => {
      unsubscribe();
    };
  }, [currentChat]);

  // Create or get chat when assistant changes
  const initializeChat = useCallback(async () => {
    if (!userId || !activeAssistant || !db) return;

    try {
      // Check if there's an existing chat for this user+assistant combination
      const chatsRef = collection(db, "chats");
      const q = query(chatsRef);
      const snapshots = await getDocs(q);

      let existingChat = null;
      for (const docSnapshot of snapshots.docs) {
        const data = docSnapshot.data() as ChatSession;
        if (
          data.userId === userId &&
          data.assistantId === activeAssistant.assistantId
        ) {
          existingChat = { ...data, chatId: docSnapshot.id } as ChatSession;
          break;
        }
      }

      if (existingChat) {
        setCurrentChat(existingChat);
      } else {
        // Create new chat
        const chatId = `chat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const newChat: ChatSession = {
          chatId,
          userId,
          assistantId: activeAssistant.assistantId,
          title: `Chat with ${activeAssistant.name}`,
          lastMessageAt: new Date().toISOString(),
        };

        await setDoc(doc(db, "chats", chatId), newChat);
        setCurrentChat(newChat);
      }
    } catch (error) {
      console.error("Failed to initialize chat", error);
    }
  }, [userId, activeAssistant]);

  // Save a message to Firestore
  const saveMessage = useCallback(
    async (content: string, role: "user" | "assistant"): Promise<string | null> => {
      if (!currentChat || !db) return null;

      try {
        const messagesRef = collection(db, "chats", currentChat.chatId, "messages");
        const docRef = await addDoc(messagesRef, {
          content,
          role,
          createdAt: serverTimestamp(),
        });

        // Update chat's lastMessageAt
        await updateDoc(doc(db, "chats", currentChat.chatId), {
          lastMessageAt: serverTimestamp(),
        });

        return docRef.id;
      } catch (error) {
        console.error("Failed to save message", error);
        return null;
      }
    },
    [currentChat]
  );

  // Update chat title on first message if needed
  const updateChatTitle = useCallback(
    async (title: string) => {
      if (!currentChat || !db) return;

      try {
        await updateDoc(doc(db, "chats", currentChat.chatId), { title });
        setCurrentChat({ ...currentChat, title });
      } catch (error) {
        console.error("Failed to update chat title", error);
      }
    },
    [currentChat]
  );

  return {
    messages,
    currentChat,
    loading,
    initializeChat,
    saveMessage,
    updateChatTitle,
  };
}
