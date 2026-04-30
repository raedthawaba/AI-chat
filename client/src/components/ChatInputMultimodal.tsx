import { useRef, useState, useEffect, memo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Send } from 'lucide-react';
import VoiceRecorder from './VoiceRecorder';
import AttachmentButton from './AttachmentButton';
import MediaPreview from './MediaPreview';
import { Attachment } from '@/stores/useChatStore';
import { useFileUpload } from '@/hooks/useFileUpload';
import { useToast } from '@/hooks/use-toast';

interface ChatInputMultimodalProps {
  onSend: (message: string, attachments?: Attachment[]) => void;
  isLoading: boolean;
}

/**
 * ChatInputMultimodal Component
 * Enhanced input with support for text, voice, images, and files
 */
const ChatInputMultimodal = memo(function ChatInputMultimodal({
  onSend,
  isLoading,
}: ChatInputMultimodalProps) {
  const [message, setMessage] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();
  const { uploadImage, uploadAudio, uploadFile, error: uploadError, clearError } = useFileUpload();

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px';
    }
  }, [message]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if ((message.trim() || attachments.length > 0) && !isLoading) {
      onSend(message, attachments.length > 0 ? attachments : undefined);
      setMessage('');
      setAttachments([]);
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

  const handleImageSelect = useCallback(
    async (file: File) => {
      const attachment = await uploadImage(file);
      if (attachment) {
        setAttachments((prev) => [...prev, attachment]);
        toast({
          title: 'نجح',
          description: 'تم تحميل الصورة بنجاح',
        });
      } else if (uploadError) {
        toast({
          title: 'خطأ',
          description: uploadError,
          variant: 'destructive',
        });
        clearError();
      }
    },
    [uploadImage, uploadError, toast, clearError]
  );

  const handleFileSelect = useCallback(
    async (file: File) => {
      const attachment = await uploadFile(file);
      if (attachment) {
        setAttachments((prev) => [...prev, attachment]);
        toast({
          title: 'نجح',
          description: 'تم تحميل الملف بنجاح',
        });
      } else if (uploadError) {
        toast({
          title: 'خطأ',
          description: uploadError,
          variant: 'destructive',
        });
        clearError();
      }
    },
    [uploadFile, uploadError, toast, clearError]
  );

  const handleRecordingComplete = useCallback(
    async (blob: Blob) => {
      const attachment = await uploadAudio(blob);
      if (attachment) {
        setAttachments((prev) => [...prev, attachment]);
        setShowVoiceRecorder(false);
        toast({
          title: 'نجح',
          description: 'تم تحميل الصوت بنجاح',
        });
      } else if (uploadError) {
        toast({
          title: 'خطأ',
          description: uploadError,
          variant: 'destructive',
        });
        clearError();
      }
    },
    [uploadAudio, uploadError, toast, clearError]
  );

  const handleRemoveAttachment = useCallback((id: string) => {
    setAttachments((prev) => prev.filter((att) => att.id !== id));
  }, []);

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-3">
      {/* Media Preview */}
      {attachments.length > 0 && (
        <MediaPreview
          attachments={attachments}
          onRemove={handleRemoveAttachment}
          isEditable
        />
      )}

      {/* Voice Recorder */}
      {showVoiceRecorder && (
        <VoiceRecorder
          onRecordingComplete={handleRecordingComplete}
          onCancel={() => setShowVoiceRecorder(false)}
        />
      )}

      {/* Input Area */}
      <div className="flex gap-2 md:gap-3 items-end">
        <div className="flex-1 bg-card rounded-xl md:rounded-2xl px-3 md:px-4 py-2.5 md:py-3 border border-border focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all shadow-sm">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="اكتب رسالتك هنا..."
            className="w-full bg-transparent resize-none outline-none text-sm text-foreground placeholder-muted-foreground min-h-[20px] md:min-h-[24px]"
            rows={1}
            disabled={isLoading}
          />
        </div>

        {/* Attachment Button */}
        <div className="flex-shrink-0">
          <AttachmentButton
            onImageSelect={handleImageSelect}
            onFileSelect={handleFileSelect}
            isLoading={isLoading}
          />
        </div>

        {/* Voice Recorder Toggle */}
        {!showVoiceRecorder && (
          <Button
            type="button"
            onClick={() => setShowVoiceRecorder(true)}
            variant="outline"
            size="icon"
            disabled={isLoading}
            className="h-10 w-10 md:h-12 md:w-12 rounded-xl md:rounded-2xl flex-shrink-0"
          >
            <svg
              className="w-5 h-5"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
              <path d="M17 16.91c-1.48 1.46-3.51 2.36-5.7 2.36-2.2 0-4.2-.9-5.7-2.36l-1.41 1.41c1.84 1.84 4.35 2.98 7.11 2.98s5.27-1.13 7.11-2.98l-1.41-1.41zM12 19c.55 0 1-.45 1-1s-.45-1-1-1-1 .45-1 1 .45 1 1 1z" />
            </svg>
          </Button>
        )}

        {/* Send Button */}
        <Button
          type="submit"
          disabled={(!message.trim() && attachments.length === 0) || isLoading}
          size="icon"
          className="h-10 w-10 md:h-12 md:w-12 rounded-xl md:rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-md shadow-primary/20 disabled:bg-muted disabled:text-muted-foreground disabled:shadow-none transition-all flex-shrink-0"
        >
          <Send size={18} className={`md:w-5 md:h-5 ${isLoading ? 'animate-pulse' : ''}`} />
        </Button>
      </div>

      <p className="hidden md:block text-[10px] text-muted-foreground px-2">
        اضغط <strong>Enter</strong> للإرسال، <strong>Shift+Enter</strong> لسطر جديد
      </p>
    </form>
  );
});

export default ChatInputMultimodal;
