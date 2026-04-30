import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';

export interface Attachment {
  id: string;
  type: 'image' | 'audio' | 'file';
  name: string;
  mimeType: string;
  size: number;
  url: string;
  base64?: string;
}

export interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: string;
  isStreaming?: boolean;
  rating?: 'like' | 'dislike' | null;
  attachments?: Attachment[];
}

export interface Conversation {
  id: string;
  title: string;
  systemPrompt?: string;
  isPinned?: boolean;
  updated_at: string;
}

interface ChatState {
  conversations: Conversation[];
  activeConversationId: string | null;
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  
  // Actions
  fetchConversations: () => Promise<void>;
  fetchMessages: (conversationId: string) => Promise<void>;
  setActiveConversationId: (id: string | null) => void;
  
  createNewConversation: (title?: string) => Promise<string | null>;
  deleteConversation: (id: string) => Promise<void>;
  togglePin: (id: string) => Promise<void>;
  updateTitle: (id: string, title: string) => Promise<void>;
  
  addLocalMessage: (message: Message) => void;
  updateLastMessage: (content: string, isStreaming: boolean) => void;
  
  logout: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: [],
  activeConversationId: null,
  messages: [],
  isLoading: false,
  error: null,

  fetchConversations: async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const res = await fetch('/api/chat/conversations', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        set({ conversations: data });
      }
    } catch (err) {
      console.error('Fetch conversations failed', err);
    }
  },

  fetchMessages: async (conversationId: string) => {
    const token = localStorage.getItem('token');
    if (!token) return;
    set({ isLoading: true });
    try {
      const res = await fetch(`/api/chat/conversations/${conversationId}/messages`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        set({ messages: data, activeConversationId: conversationId });
      }
    } catch (err) {
      console.error('Fetch messages failed', err);
    } finally {
      set({ isLoading: false });
    }
  },

  setActiveConversationId: (id) => {
    set({ activeConversationId: id });
    if (id) get().fetchMessages(id);
    else set({ messages: [] });
  },

  createNewConversation: async (title = 'محادثة جديدة') => {
    const token = localStorage.getItem('token');
    if (!token) return null;
    try {
      const res = await fetch('/api/chat/conversations', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ title })
      });
      if (res.ok) {
        const data = await res.json();
        await get().fetchConversations();
        set({ activeConversationId: data.id, messages: [] });
        return data.id;
      }
    } catch (err) {
      console.error('Create conversation failed', err);
    }
    return null;
  },

  deleteConversation: async (id) => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const res = await fetch(`/api/chat/conversations/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        set(state => ({
          conversations: state.conversations.filter(c => c.id !== id),
          activeConversationId: state.activeConversationId === id ? null : state.activeConversationId,
          messages: state.activeConversationId === id ? [] : state.messages
        }));
      }
    } catch (err) {
      console.error('Delete failed', err);
    }
  },

  togglePin: async (id) => {
    const token = localStorage.getItem('token');
    if (!token) return;
    const conv = get().conversations.find(c => c.id === id);
    if (!conv) return;
    try {
      await fetch(`/api/chat/conversations/${id}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ isPinned: !conv.isPinned })
      });
      await get().fetchConversations();
    } catch (err) {
      console.error('Toggle pin failed', err);
    }
  },

  updateTitle: async (id, title) => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      await fetch(`/api/chat/conversations/${id}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ title })
      });
      await get().fetchConversations();
    } catch (err) {
      console.error('Update title failed', err);
    }
  },

  addLocalMessage: (message) => {
    set(state => ({ messages: [...state.messages, message] }));
  },

  updateLastMessage: (content, isStreaming) => {
    set(state => {
      const newMessages = [...state.messages];
      if (newMessages.length > 0) {
        const last = newMessages[newMessages.length - 1];
        if (last.role === 'assistant') {
          newMessages[newMessages.length - 1] = { ...last, content, isStreaming };
        }
      }
      return { messages: newMessages };
    });
  },

  logout: () => {
    localStorage.removeItem('token');
    set({ conversations: [], activeConversationId: null, messages: [] });
    window.location.href = '/login';
  }
}));
