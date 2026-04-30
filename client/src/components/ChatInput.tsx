import { useRef, useState, useEffect, memo } from 'react';
import { Button } from '@/components/ui/button';
import { Send } from 'lucide-react';

interface ChatInputProps {
  onSend: (message: string) => void;
  isLoading: boolean;
}

/**
 * ChatInput Component - Optimized with React.memo
 * 
 * Performance Note: Using memo to prevent re-rendering the entire input area
 * when messages are being added or updated in the parent component.
 */
const ChatInput = memo(function ChatInput({ onSend, isLoading }: ChatInputProps) {
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px';
    }
  }, [message]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !isLoading) {
      onSend(message);
      setMessage('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as any);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="flex gap-3 items-end">
        <div className="flex-1 bg-white rounded-2xl px-4 py-3 border border-gray-200 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all shadow-sm">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="اكتب رسالتك هنا... (Shift+Enter لسطر جديد)"
            className="w-full bg-transparent resize-none outline-none text-sm text-gray-900 placeholder-gray-400 min-h-[24px]"
            rows={1}
            disabled={isLoading}
          />
        </div>
        <Button
          type="submit"
          disabled={!message.trim() || isLoading}
          size="icon"
          className="h-12 w-12 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-200 disabled:bg-gray-200 disabled:shadow-none transition-all flex-shrink-0"
        >
          <Send size={20} className={isLoading ? 'animate-pulse' : ''} />
        </Button>
      </div>
      <p className="text-[10px] text-gray-400 mt-2 px-2">
        اضغط <strong>Enter</strong> للإرسال، <strong>Shift+Enter</strong> لسطر جديد
      </p>
    </form>
  );
});

export default ChatInput;
