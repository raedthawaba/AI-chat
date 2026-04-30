import { memo, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Paperclip, Image, FileText } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface AttachmentButtonProps {
  onImageSelect: (file: File) => void;
  onFileSelect: (file: File) => void;
  isLoading?: boolean;
}

/**
 * AttachmentButton Component
 * Provides dropdown menu for selecting attachments (images, files)
 */
const AttachmentButton = memo(function AttachmentButton({
  onImageSelect,
  onFileSelect,
  isLoading = false,
}: AttachmentButtonProps) {
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        onImageSelect(file);
      }
      if (imageInputRef.current) {
        imageInputRef.current.value = '';
      }
    },
    [onImageSelect]
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        onFileSelect(file);
      }
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    [onFileSelect]
  );

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-12 w-12 rounded-2xl text-muted-foreground hover:text-primary hover:bg-primary/10"
            disabled={isLoading}
          >
            <Paperclip size={20} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48 bg-card border-border rounded-xl">
          <DropdownMenuItem onClick={() => imageInputRef.current?.click()} className="gap-2 text-foreground focus:bg-accent focus:text-accent-foreground">
            <Image size={16} />
            <span>إضافة صورة</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => fileInputRef.current?.click()} className="gap-2 text-foreground focus:bg-accent focus:text-accent-foreground">
            <FileText size={16} />
            <span>إضافة ملف (PDF/TXT)</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <input
        ref={imageInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={handleImageChange}
        className="hidden"
      />

      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.txt"
        onChange={handleFileChange}
        className="hidden"
      />
    </>
  );
});

export default AttachmentButton;
