import { Streamdown } from 'streamdown';
import { Bot, User, Copy, RotateCcw, ThumbsUp, ThumbsDown, Check } from 'lucide-react';
import { useState, memo } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';

interface ChatMessageProps {
  id: string;
  content: string;
  isUser: boolean;
  timestamp?: Date;
  isStreaming?: boolean;
  rating?: 'like' | 'dislike' | null;
  onRetry?: () => void;
  onRate?: (rating: 'like' | 'dislike') => void;
}

/**
 * ChatMessage Component - Optimized with React.memo
 * 
 * Performance Note: Using memo to prevent re-rendering of all messages
 * when only the last message is being updated during streaming.
 */
const ChatMessage = memo(function ChatMessage({
  id,
  content,
  isUser,
  timestamp,
  isStreaming = false,
  rating = null,
  onRetry,
  onRate,
}: ChatMessageProps) {
  const [copied, setCopied] = useState(false);
  const [hovering, setHovering] = useState(false);
  const { toast } = useToast();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      toast({
        title: 'تم النسخ',
        description: 'تم نسخ الرسالة إلى الحافظة',
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
      toast({
        title: 'خطأ',
        description: 'فشل نسخ الرسالة',
        variant: 'destructive',
      });
    }
  };

  return (
    <div
      className={`flex gap-3 mb-4 group ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      {/* Avatar */}
      <div
        className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${
          isUser
            ? 'bg-blue-500 text-white'
            : 'bg-gradient-to-br from-blue-400 to-purple-500 text-white'
        }`}
      >
        {isUser ? <User size={18} /> : <Bot size={18} />}
      </div>

      {/* Message Content Container */}
      <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} flex-1`}>
        {/* Message Bubble */}
        <div
          className={`rounded-lg px-4 py-3 max-w-2xl break-words transition-all ${
            isUser
              ? 'bg-blue-100 text-blue-900 shadow-sm'
              : 'bg-white border border-gray-100 text-gray-900 shadow-sm'
          } ${isStreaming ? 'opacity-90 ring-1 ring-blue-200' : ''}`}
        >
          {isUser ? (
            <p className="text-sm whitespace-pre-wrap">{content}</p>
          ) : (
            <div className="text-sm prose prose-sm max-w-none prose-blue">
              <Streamdown>{content}</Streamdown>
            </div>
          )}

          {/* Streaming Indicator */}
          {isStreaming && !isUser && (
            <div className="mt-2 flex items-center gap-2 text-[10px] text-blue-500 font-medium">
              <div className="flex gap-1">
                <span className="inline-block w-1 h-1 bg-blue-500 rounded-full animate-bounce"></span>
                <span className="inline-block w-1 h-1 bg-blue-500 rounded-full animate-bounce delay-100"></span>
                <span className="inline-block w-1 h-1 bg-blue-500 rounded-full animate-bounce delay-200"></span>
              </div>
              <span>جاري توليد الرد...</span>
            </div>
          )}
        </div>

        {/* Timestamp & Actions */}
        <div className={`flex items-center gap-3 mt-1 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
          {timestamp && (
            <span className="text-[10px] text-gray-400">
              {timestamp.toLocaleTimeString('ar-SA', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          )}

          {/* Action Buttons - Only for AI messages */}
          {!isUser && !isStreaming && (hovering || rating) && (
            <div className="flex gap-1 animate-in fade-in slide-in-from-bottom-1 duration-200">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopy}
                className="h-6 w-6 p-0 text-gray-400 hover:text-blue-600"
                title="نسخ"
              >
                {copied ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
              </Button>

              {onRetry && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onRetry}
                  className="h-6 w-6 p-0 text-gray-400 hover:text-blue-600"
                  title="إعادة"
                >
                  <RotateCcw size={12} />
                </Button>
              )}

              <Button
                variant="ghost"
                size="sm"
                onClick={() => onRate?.('like')}
                className={`h-6 w-6 p-0 ${rating === 'like' ? 'text-green-500' : 'text-gray-400 hover:text-green-500'}`}
                title="إعجاب"
              >
                <ThumbsUp size={12} />
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => onRate?.('dislike')}
                className={`h-6 w-6 p-0 ${rating === 'dislike' ? 'text-red-500' : 'text-gray-400 hover:text-red-500'}`}
                title="عدم إعجاب"
              >
                <ThumbsDown size={12} />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Only re-render if content, isStreaming, or rating changes
  return (
    prevProps.content === nextProps.content &&
    prevProps.isStreaming === nextProps.isStreaming &&
    prevProps.rating === nextProps.rating
  );
});

export default ChatMessage;
