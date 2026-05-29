import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
// import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp } from "firebase/firestore";


interface Message {
  role: 'user' | 'assistant';
  content: string;
  createdAt?: any;
}

interface ChatSession {
  id: string;
  assistantId: string;
  title: string;
  lastMessageAt: any;
  userId: string;
}

export function useFirestoreChat(userId: string | undefined, activeAssistantId: string | undefined, activeChatId: string | null) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [chats, setChats] = useState<ChatSession[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);

  // 1. பயனரின் அனைத்து சாட் செஷன்களையும் (Chat Threads) ரியல்-டைமில் எடுத்தல்
  useEffect(() => {
    if (!userId) {
      setChats([]);
      return;
    }

    const chatsRef = collection(db, 'chats');
    const q = query(
      chatsRef,
      where('userId', '==', userId),
      orderBy('lastMessageAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const chatList: ChatSession[] = [];
      snapshot.forEach((doc) => {
        chatList.push({ id: doc.id, ...doc.data() } as ChatSession);
      });
      setChats(chatList);
    }, (error) => {
      console.error("Error fetching chats from Firestore:", error);
    });

    return () => unsubscribe();
  }, [userId]);

  // 2. செலக்ட் செய்யப்பட்ட சாட்டின் மெசேஜ்களை மட்டும் ரியல்-டைமில் எடுத்தல்
  useEffect(() => {
    if (!activeChatId) {
      setMessages([]);
      return;
    }

    setLoadingMessages(true);
    const messagesRef = collection(db, 'chats', activeChatId, 'messages');
    const q = query(messagesRef, orderBy('createdAt', 'asc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgList: Message[] = [];
      snapshot.forEach((doc) => {
        msgList.push(doc.data() as Message);
      });
      setMessages(msgList);
      setLoadingMessages(false);
    }, (error) => {
      console.error("Error fetching messages:", error);
      setLoadingMessages(false);
    });

    return () => unsubscribe();
  }, [activeChatId]);

  // 3. புதிய மெசேஜை ஃபயர்ஸ்டோரில் சேமிக்கும் ஃபங்ஷன்
  const sendMessageToFirestore = async (chatId: string, role: 'user' | 'assistant', content: string) => {
    if (!chatId) return null;

    try {
      // மெசேஜஸ் சப்-கலெக்ஷனில் ஆட் செய்தல்
      const messagesRef = collection(db, 'chats', chatId, 'messages');
      await addDoc(messagesRef, {
        role,
        content,
        createdAt: serverTimestamp()
      });

      // சாட் த்ரெட்டின் கடைசியாக வந்த மெசேஜ் நேரத்தை அப்டேட் செய்தல்
      const chatDocRef = doc(db, 'chats', chatId);
      await updateDoc(chatDocRef, {
        lastMessageAt: serverTimestamp()
      });
    } catch (error) {
      console.error("Error saving message to Firestore:", error);
    }
  };

  // 4. புதிய சாட் த்ரெட் ஒன்றை உருவாக்குதல் (உதாரணமாக: "hi Radha" என்று பேசும்போது)
  const createNewChatThread = async (title: string) => {
    if (!userId || !activeAssistantId) return null;

    try {
      const chatsRef = collection(db, 'chats');
      const newChatDoc = await addDoc(chatsRef, {
        userId,
        assistantId: activeAssistantId,
        title: title || 'New Conversation',
        lastMessageAt: serverTimestamp()
      });
      return newChatDoc.id;
    } catch (error) {
      console.error("Error creating new chat thread:", error);
      return null;
    }
  };

  return {
    messages,
    chats,
    loadingMessages,
    sendMessageToFirestore,
    createNewChatThread
  };
}