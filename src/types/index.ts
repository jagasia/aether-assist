export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  createdAt: string;
  plan: 'free' | 'pro' | 'premium';
  credits: number;
}

export interface Assistant {
  assistantId: string;
  userId: string;
  name: string;
  systemPrompt: string;
  model: string;
  voiceId?: string;  // Futuristic: ElevenLabs Voice ID
  avatarUrl?: string; // Futuristic: FLUX.1 Generated Image URL
  createdAt: string;
}

export interface ChatMessage {
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  audioUrl?: string; // Futuristic: Voice note play URL
  imageUrl?: string; // Futuristic: Uncensored image URL
}

export interface ChatSession {
  chatId: string;
  userId: string;
  assistantId: string;
  lastMessageAt: string;
  messages: ChatMessage[];
}
