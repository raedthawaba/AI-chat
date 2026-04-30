import { memo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { X, Download, Play } from 'lucide-react';
import { Attachment } from '@/stores/useChatStore';

interface MediaPreviewProps {
  attachments: Attachment[];
  onRemove: (id: string) => void;
  isEditable?: boolean;
}

/**
 * MediaPreview Component
 * Displays preview of attached images, audio, and files
 */
const MediaPreview = memo(function MediaPreview({
  attachments,
  onRemove,
  isEditable = true,
}: MediaPreviewProps) {
  const formatFileSize = useCallback((bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }, []);

  if (attachments.length === 0) return null;

  return (
    <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-4">
      {attachments.map((attachment) => (
        <div
          key={attachment.id}
          className="relative group bg-muted rounded-xl overflow-hidden border border-border animate-in fade-in zoom-in-95 duration-200"
        >
          {attachment.type === 'image' && (
            <div className="aspect-square">
              <img
                src={attachment.url}
                alt={attachment.name}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {attachment.type === 'audio' && (
            <div className="aspect-square flex items-center justify-center bg-primary/5">
              <div className="text-center">
                <Play size={24} className="text-primary mx-auto mb-1" />
                <p className="text-xs text-foreground truncate px-1">
                  {attachment.name}
                </p>
                {attachment.duration && (
                  <p className="text-xs text-muted-foreground">
                    {Math.floor(attachment.duration)}s
                  </p>
                )}
              </div>
            </div>
          )}

          {attachment.type === 'file' && (
            <div className="aspect-square flex items-center justify-center bg-muted/50">
              <div className="text-center">
                <Download size={24} className="text-muted-foreground mx-auto mb-1" />
                <p className="text-xs text-foreground truncate px-1">
                  {attachment.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(attachment.size)}
                </p>
              </div>
            </div>
          )}

          {isEditable && (
            <Button
              onClick={() => onRemove(attachment.id)}
              variant="ghost"
              size="icon"
              className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity bg-red-500 hover:bg-red-600 text-white"
            >
              <X size={14} />
            </Button>
          )}
        </div>
      ))}
    </div>
  );
});

export default MediaPreview;
