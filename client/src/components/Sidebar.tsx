import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Plus, 
  Trash2, 
  MessageSquare, 
  Search, 
  Pin, 
  PinOff, 
  Edit3, 
  Tag as TagIcon,
  X,
  MoreVertical,
  Sun,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronRight,
  LogOut
} from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useChatStore } from '@/stores/useChatStore';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

export default function Sidebar({
  isOpen,
  onToggle,
}: SidebarProps) {
  const { 
    conversations, 
    activeConversationId, 
    setActiveConversationId, 
    createNewConversation, 
    deleteConversation,
    togglePin,
    updateTitle,
    logout
  } = useChatStore();
  
  const [searchQuery, setSearchQuery] = useState('');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const { theme, toggleTheme } = useTheme();

  // Filter and Sort Conversations
  const filteredConversations = useMemo(() => {
    let result = conversations;
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(c => 
        c.title.toLowerCase().includes(query)
      );
    }

    // Sort: Pinned first, then by timestamp
    return [...result].sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    });
  }, [conversations, searchQuery]);

  const handleRename = (id: string, currentTitle: string) => {
    setEditingId(id);
    setEditTitle(currentTitle);
  };

  const saveRename = (id: string) => {
    if (editTitle.trim()) {
      updateTitle(id, editTitle.trim());
    }
    setEditingId(null);
  };

  return (
    <>
      {/* Mobile Toggle Button (Floating) */}
      {!isOpen && (
        <button
          onClick={onToggle}
          className="fixed top-4 right-4 z-50 md:hidden p-3 bg-primary text-primary-foreground shadow-xl rounded-2xl transition-all hover:scale-105 active:scale-95 flex items-center justify-center"
        >
          <MessageSquare size={20} />
        </button>
      )}

      {/* Sidebar Container */}
      <div
        className={`fixed md:relative right-0 top-0 h-screen bg-card border-l border-border flex flex-col transition-all duration-300 ease-in-out z-40 ${
          isOpen 
            ? 'w-[85vw] md:w-80 translate-x-0' 
            : 'w-0 -translate-x-full md:translate-x-0 md:w-0 overflow-hidden border-none'
        }`}
      >
        {/* Header */}
        <div className="p-6 space-y-4 min-w-[280px]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-foreground">المحادثات</h2>
              <span className="bg-muted text-muted-foreground text-[10px] px-2 py-0.5 rounded-full">{conversations.length}</span>
            </div>
            <div className="flex items-center gap-1">
              <Button
                onClick={() => createNewConversation()}
                size="icon"
                variant="ghost"
                className="h-9 w-9 rounded-xl hover:bg-primary/10 hover:text-primary transition-colors"
                title="محادثة جديدة"
              >
                <Plus size={18} />
              </Button>
              <Button
                onClick={onToggle}
                size="icon"
                variant="ghost"
                className="h-9 w-9 rounded-xl hover:bg-muted transition-colors"
                title="إغلاق القائمة"
              >
                <PanelLeftClose size={18} className="rotate-180" />
              </Button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative group">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={16} />
            <Input
              placeholder="بحث في المحادثات..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-10 bg-muted border-none rounded-xl text-sm h-10 focus:ring-2 focus:ring-primary/20"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-1 custom-scrollbar min-w-[280px]">
          {filteredConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center px-4">
              <div className="bg-muted p-4 rounded-full text-muted-foreground/30 mb-3">
                <MessageSquare size={32} />
              </div>
              <p className="text-sm text-muted-foreground font-medium">
                {searchQuery ? 'لا توجد نتائج للبحث' : 'ابدأ محادثة جديدة الآن'}
              </p>
            </div>
          ) : (
            filteredConversations.map((conv) => (
              <div
                key={conv.id}
                className={`group relative flex items-center gap-2 p-3 rounded-2xl cursor-pointer transition-all ${
                  activeConversationId === conv.id
                    ? 'bg-accent text-accent-foreground shadow-sm ring-1 ring-primary/20'
                    : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                }`}
                onClick={() => {
                  setActiveConversationId(conv.id);
                  if (window.innerWidth < 768) onToggle();
                }}
              >
                <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${
                  activeConversationId === conv.id ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                }`}>
                  {conv.isPinned ? <Pin size={16} className="rotate-45" /> : <MessageSquare size={18} />}
                </div>

                <div className="flex-1 min-w-0 pr-1">
                  {editingId === conv.id ? (
                    <input
                      autoFocus
                      className="w-full bg-background border border-primary rounded px-1 outline-none text-sm text-foreground"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      onBlur={() => saveRename(conv.id)}
                      onKeyDown={(e) => e.key === 'Enter' && saveRename(conv.id)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <>
                      <p className="text-sm font-bold truncate">{conv.title}</p>
                      <p className="text-[10px] opacity-60">
                        {new Date(conv.updated_at).toLocaleDateString('ar-SA')}
                      </p>
                    </>
                  )}
                </div>

                {/* Actions Dropdown */}
                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-background/50 text-muted-foreground">
                        <MoreVertical size={14} />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="rounded-xl bg-card border-border">
                      <DropdownMenuItem onClick={() => togglePin(conv.id)} className="gap-2 text-foreground focus:bg-accent focus:text-accent-foreground">
                        {conv.isPinned ? <PinOff size={14} /> : <Pin size={14} />}
                        <span>{conv.isPinned ? 'إلغاء التثبيت' : 'تثبيت المحادثة'}</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleRename(conv.id, conv.title)} className="gap-2 text-foreground focus:bg-accent focus:text-accent-foreground">
                        <Edit3 size={14} />
                        <span>إعادة التسمية</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => deleteConversation(conv.id)} 
                        className="gap-2 text-destructive focus:text-destructive focus:bg-destructive/10"
                      >
                        <Trash2 size={14} />
                        <span>حذف المحادثة</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border space-y-2 min-w-[280px]">
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 rounded-xl text-muted-foreground hover:text-foreground"
            onClick={toggleTheme}
          >
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
            <span>{theme === 'light' ? 'الوضع الليلي' : 'الوضع النهاري'}</span>
          </Button>

          <Button
            variant="ghost"
            className="w-full justify-start gap-3 rounded-xl text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={logout}
          >
            <LogOut size={18} />
            <span>تسجيل الخروج</span>
          </Button>

          <div className="bg-muted p-4 rounded-2xl border border-border">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                <TagIcon size={14} />
              </div>
              <div className="flex-1">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">الإصدار الحالي</p>
                <p className="text-xs font-black text-foreground">Advanced v2.5</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm md:hidden z-30 animate-in fade-in duration-300"
          onClick={onToggle}
        />
      )}
    </>
  );
}
