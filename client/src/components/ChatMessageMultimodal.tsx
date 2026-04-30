import { memo, useMemo, useCallback } from 'react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Copy, RotateCcw, ThumbsUp, ThumbsDown, Play, Download } from 'lucide-react';
import { Streamdown } from 'streamdown';
import { Message, Attachment } from '@/stores/useChatStore';
import { useToast } from '@/hooks/use-toast';

interface ChatMessageMultimodalProps {
  id: string;
  content: string;
  isUser: boolean;
  timestamp?: string;
  isStreaming?: boolean;
  rating?: 'like' | 'dislike' | null;
  attachments?: Attachment[];
  onRetry?: () => void;
  onRate?: (messageId: string, rating: 'like' | 'dislike') => void | ((messageId: string, rating: 'like' | 'dislike') => void);
}

/**
 * ChatMessageMultimodal Component
 * Renders chat messages with support for text, images, audio, and files
 */
const ChatMessageMultimodal = memo(
  function ChatMessageMultimodal({
    id,
    content,
    isUser,
    timestamp,
    isStreaming,
    rating,
    attachments = [],
    onRetry,
    onRate,
  }: ChatMessageMultimodalProps) {
    const { toast } = useToast();

    const handleCopy = useCallback(() => {
      navigator.clipboard.writeText(content);
      toast({
        title: 'تم النسخ',
        description: 'تم نسخ الرسالة إلى الحافظة',
      });
    }, [content, toast]);

    const handleRate = useCallback(
      (ratingValue: 'like' | 'dislike') => {
        onRate?.(id, ratingValue);
        toast({
          title: 'شكراً',
          description: 'تم تسجيل تقييمك',
        });
      },
      [id, onRate, toast]
    );

    const formatFileSize = useCallback((bytes: number) => {
      if (bytes === 0) return '0 Bytes';
      const k = 1024;
      const sizes = ['Bytes', 'KB', 'MB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
    }, []);

    const formatTime = useMemo(() => {
      if (!timestamp) return '';
      const date = new Date(timestamp);
      return date.toLocaleTimeString('ar-SA', {
        hour: '2-digit',
        minute: '2-digit',
      });
    }, [timestamp]);

    return (
      <div
        className={`flex gap-3 mb-4 group animate-in fade-in slide-in-from-bottom-2 duration-300 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
      >
        <Avatar className="h-8 w-8 flex-shrink-0">
          <AvatarImage src={isUser ? undefined : '/bot-avatar.png'} />
          <AvatarFallback>{isUser ? 'أنت' : 'AI'}</AvatarFallback>
        </Avatar>

        <div
          className={`flex flex-col gap-2 max-w-[85%] md:max-w-[70%] ${
            isUser ? 'items-end' : 'items-start'
          }`}
        >
          {/* Attachments */}
          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {attachments.map((attachment) => (
                <div
                  key={attachment.id}
                  className={`rounded-lg overflow-hidden ${
                    attachment.type === 'image'
                      ? 'max-w-xs'
                      : 'bg-muted p-2 border border-border'
                  }`}
                >
                  {attachment.type === 'image' && (
                    <img
                      src={attachment.url}
                      alt={attachment.name}
                      className="max-w-xs max-h-64 rounded-lg"
                    />
                  )}

                  {attachment.type === 'audio' && (
                    <div className="flex items-center gap-2 px-3 py-2">
                      <audio
                        src={attachment.url}
                        controls
                        className="h-8 max-w-xs"
                      />
                    </div>
                  )}

                  {attachment.type === 'file' && (
                    <div className="flex items-center gap-2 px-3 py-2">
                      <Download size={16} className="text-muted-foreground" />
                      <div className="flex flex-col">
                        <p className="text-sm font-medium text-foreground truncate">
                          {attachment.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatFileSize(attachment.size)}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Message Bubble */}
          <div
            className={`rounded-2xl px-3 md:px-4 py-2 md:py-3 transition-colors duration-200 text-sm md:text-base ${
              isUser
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-card text-foreground border border-border shadow-sm'
            }`}
          >
            {content ? (
              <Streamdown>{content}</Streamdown>
            ) : (
              isStreaming && (
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-primary/40 rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-primary/40 rounded-full animate-bounce delay-100" />
                  <div className="w-2 h-2 bg-primary/40 rounded-full animate-bounce delay-200" />
                </div>
              )
            )}
          </div>

          {/* Timestamp & Actions Container */}
          <div className={`flex items-center gap-3 px-2 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
            {formatTime && (
              <p className="text-[10px] text-muted-foreground">{formatTime}</p>
            )}

            {/* Actions */}
            {!isUser && (
              <div className="flex gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all duration-200">
                <Button
                  onClick={handleCopy}
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-primary"
                >
                  <Copy size={12} />
                </Button>
                {onRetry && (
                  <Button
                    onClick={onRetry}
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-primary"
                  >
                    <RotateCcw size={12} />
                  </Button>
                )}
                <Button
                  onClick={() => handleRate('like')}
                  variant="ghost"
                  size="icon"
                  className={`h-7 w-7 ${
                    rating === 'like' ? 'text-green-500' : 'text-muted-foreground hover:text-green-500'
                  }`}
                >
                  <ThumbsUp size={12} />
                </Button>
                <Button
                  onClick={() => handleRate('dislike')}
                  variant="ghost"
                  size="icon"
                  className={`h-7 w-7 ${
                    rating === 'dislike' ? 'text-destructive' : 'text-muted-foreground hover:text-destructive'
                  }`}
                >
                  <ThumbsDown size={12} />
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.content === nextProps.content &&
      prevProps.isStreaming === nextProps.isStreaming &&
      prevProps.rating === nextProps.rating &&
      prevProps.attachments?.length === nextProps.attachments?.length
    );
  }
);

export default ChatMessageMultimodal;
