import { lazy, Suspense, useState, useRef, useEffect, useMemo, useCallback } from 'react';
import Sidebar from '@/components/Sidebar';
import ChatMessageMultimodal from '@/components/ChatMessageMultimodal';
import ChatInputMultimodal from '@/components/ChatInputMultimodal';
import TypingIndicator from '@/components/TypingIndicator';
import { Button } from '@/components/ui/button';
import { Settings, BrainCircuit, Sparkles, Trash2, Search, X, PanelLeftOpen } from 'lucide-react';
import { streamChat } from '@/lib/gemini';
import { useToast } from '@/hooks/use-toast';
import { useChatStore, Attachment } from '@/stores/useChatStore';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const LazyDialogContent = lazy(() => Promise.resolve({ default: DialogContent }));

export default function Home() {
  const {
    conversations,
    activeConversationId,
    messages,
    fetchConversations,
    setActiveConversationId,
    createNewConversation,
    addLocalMessage,
    updateLastMessage,
    isLoading: storeLoading
  } = useChatStore();

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [searchQuery, setSearchQuery] = useState('');
  const [localSystemPrompt, setLocalSystemPrompt] = useState('You are a helpful AI assistant');
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast({ title: "متصل الآن", description: "تم استعادة الاتصال بالإنترنت." });
    };
    const handleOffline = () => {
      setIsOnline(false);
      toast({ title: "غير متصل", description: "يرجى التحقق من اتصال الإنترنت.", variant: "destructive" });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    fetchConversations();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [fetchConversations, toast]);

  const activeConversation = useMemo(() => 
    conversations.find(c => c.id === activeConversationId),
    [conversations, activeConversationId]
  );

  // Highlighted Search Results Logic
  const filteredMessages = useMemo(() => {
    if (!searchQuery.trim()) return messages;
    const query = searchQuery.toLowerCase();
    return messages.filter(m => m.content.toLowerCase().includes(query));
  }, [messages, searchQuery]);

  useEffect(() => {
    if (messages.length > 0 && !searchQuery) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length, storeLoading, searchQuery]);

  const handleUpdateSystemPrompt = useCallback(() => {
    toast({
      title: "تم التحديث",
      description: "تم تحديث شخصية الـ AI بنجاح.",
    });
  }, [toast]);

  const handleSendMessage = useCallback(async (content: string, attachments?: Attachment[]) => {
    if (!content.trim() && (!attachments || attachments.length === 0)) return;
    
    if (!isOnline) {
      toast({ title: "خطأ", description: "لا يمكن إرسال الرسالة وأنت غير متصل بالإنترنت.", variant: "destructive" });
      return;
    }

    let currentId = activeConversationId;
    if (!currentId) {
      currentId = await createNewConversation(content.slice(0, 30));
      if (!currentId) return;
    }

    // إضافة رسالة المستخدم محلياً
    addLocalMessage({
      id: Date.now().toString(),
      content,
      role: 'user',
      timestamp: new Date().toISOString(),
      attachments
    });

    // إضافة رسالة فارغة للـ AI
    addLocalMessage({
      id: (Date.now() + 1).toString(),
      content: '',
      role: 'assistant',
      timestamp: new Date().toISOString(),
      isStreaming: true
    });

    setIsSending(true);

    try {
      const stream = streamChat(content, currentId, attachments);
      let fullResponse = '';
      for await (const chunk of stream) {
        fullResponse += chunk;
        updateLastMessage(fullResponse, true);
      }
      updateLastMessage(fullResponse, false);
      // تحديث قائمة المحادثات لتعكس وقت النشاط الجديد
      fetchConversations();
    } catch (error: any) {
      toast({
        title: 'خطأ',
        description: error.message || 'فشل في إرسال الرسالة',
        variant: 'destructive',
      });
    } finally {
      setIsSending(false);
    }
  }, [activeConversationId, createNewConversation, addLocalMessage, updateLastMessage, fetchConversations, toast, isOnline]);

  return (
    <div className="flex h-screen bg-background overflow-hidden font-sans" dir="rtl">
      <Sidebar
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
      />

      <div className="flex-1 flex flex-col relative bg-background md:m-2 md:rounded-3xl md:shadow-2xl md:border md:border-border overflow-hidden transition-colors duration-300">
        {/* Header */}
        <header className="px-4 md:px-6 py-3 md:py-4 flex items-center justify-between border-b border-border bg-background/50 backdrop-blur-xl z-10">
          <div className="flex items-center gap-2 md:gap-3">
            {!sidebarOpen && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSidebarOpen(true)}
                className="hidden md:flex h-9 w-9 rounded-xl hover:bg-muted transition-all animate-in fade-in slide-in-from-right-2"
              >
                <PanelLeftOpen size={20} className="rotate-180" />
              </Button>
            )}
            <div className="bg-gradient-to-tr from-primary to-indigo-600 p-1.5 md:p-2 rounded-xl text-primary-foreground shadow-lg shadow-primary/20">
              <BrainCircuit size={18} className="md:w-5 md:h-5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm md:text-lg font-bold text-foreground flex items-center gap-2">
                AI Chat Pro
                <span className="hidden xs:inline-block bg-primary/10 text-primary text-[10px] px-2 py-0.5 rounded-full border border-primary/20">V2.5</span>
              </h1>
              <p className="text-[9px] md:text-[10px] text-muted-foreground truncate max-w-[120px] md:max-w-[200px]">
                {activeConversation?.title || 'محادثة جديدة'}
              </p>
            </div>
          </div>
          
          <div className="flex gap-2">
            {searchQuery && (
              <div className="hidden md:flex items-center bg-primary/10 px-3 py-1.5 rounded-full text-primary text-xs gap-2 animate-in fade-in slide-in-from-right-2">
                <Search size={12} />
                <span>نتائج البحث عن: <strong>{searchQuery}</strong></span>
                <button onClick={() => setSearchQuery('')} className="hover:text-primary/80">
                  <X size={12} />
                </button>
              </div>
            )}

            <Button 
              variant="ghost" 
              size="icon" 
              className="rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
              onClick={() => {
                if (confirm('هل أنت متأكد من مسح جميع المحادثات؟')) {
                  // Logic to clear all if needed
                }
              }}
              title="مسح الكل"
            >
              <Trash2 size={18} />
            </Button>
            
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full hover:bg-accent text-muted-foreground">
                  <Settings size={20} />
                </Button>
              </DialogTrigger>
              <Suspense fallback={<div className="p-4">Loading...</div>}>
                <LazyDialogContent className="sm:max-w-[425px] rounded-3xl bg-card border-border" dir="rtl">
                  <DialogHeader>
                    <DialogTitle className="text-xl font-bold text-foreground">إعدادات النظام المتقدمة</DialogTitle>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="system-prompt" className="text-sm font-medium text-foreground/80">شخصية المساعد الافتراضية</Label>
                      <Textarea
                        id="system-prompt"
                        placeholder="اكتب تعليمات الـ AI هنا..."
                        value={localSystemPrompt}
                        onChange={(e) => setLocalSystemPrompt(e.target.value)}
                        className="h-32 rounded-2xl border-border bg-background text-foreground focus:ring-primary focus:border-primary"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button onClick={handleUpdateSystemPrompt} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl py-6">حفظ وتطبيق</Button>
                  </DialogFooter>
                </LazyDialogContent>
              </Suspense>
            </Dialog>
          </div>
        </header>

        {/* Messages */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 custom-scrollbar">
          {filteredMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-6 animate-in fade-in zoom-in duration-500">
              <div className="relative">
                <div className="absolute -inset-4 bg-blue-500/10 rounded-full blur-2xl animate-pulse"></div>
                <div className="relative bg-gradient-to-b from-blue-500 to-indigo-600 p-8 rounded-3xl text-white shadow-2xl shadow-blue-200">
                  <Sparkles size={48} />
                </div>
              </div>
              <div className="max-w-sm">
                <h2 className="text-2xl font-black text-foreground">
                  {searchQuery ? 'لم يتم العثور على نتائج' : 'ميزات متقدمة بانتظارك'}
                </h2>
                <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
                  {searchQuery 
                    ? `لم نجد أي رسالة تحتوي على "${searchQuery}" في هذه المحادثة.`
                    : 'يمكنك الآن البحث، التثبيت، وإعادة تسمية محادثاتك بكل سهولة.'}
                </p>
                {searchQuery && (
                  <Button variant="outline" onClick={() => setSearchQuery('')} className="mt-4 rounded-xl">
                    عرض كل الرسائل
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto w-full">
              {filteredMessages.map((msg) => (
                <ChatMessageMultimodal
                  key={msg.id}
                  id={msg.id}
                  content={msg.content}
                  isUser={msg.role === 'user'}
                  timestamp={msg.timestamp}
                  isStreaming={msg.isStreaming}
                  rating={msg.rating}
                  attachments={msg.attachments}
                />
              ))}
            </div>
          )}
          {storeLoading && (
            <div className="max-w-4xl mx-auto w-full">
              <TypingIndicator />
            </div>
          )}
          <div ref={chatEndRef} className="h-4" />
        </main>

        {/* Input */}
        <footer className="p-4 md:p-8 bg-background/80 backdrop-blur-md border-t border-border/50">
          <div className="max-w-3xl mx-auto">
            <ChatInputMultimodal onSend={handleSendMessage} isLoading={isSending} />
          </div>
        </footer>
      </div>
    </div>
  );
}
