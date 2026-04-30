import { memo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, Square, Pause, Play, Trash2 } from 'lucide-react';
import { useVoiceRecorder } from '@/hooks/useVoiceRecorder';
import { useToast } from '@/hooks/use-toast';

interface VoiceRecorderProps {
  onRecordingComplete: (blob: Blob) => void;
  onCancel?: () => void;
}

/**
 * VoiceRecorder Component
 * Provides UI for recording audio from microphone
 */
const VoiceRecorder = memo(function VoiceRecorder({
  onRecordingComplete,
  onCancel,
}: VoiceRecorderProps) {
  const { toast } = useToast();

  const {
    isRecording,
    isPaused,
    duration,
    error,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    cancelRecording,
  } = useVoiceRecorder();

  const handleStartRecording = useCallback(async () => {
    try {
      await startRecording();
    } catch (err) {
      toast({
        title: 'خطأ',
        description: 'فشل بدء التسجيل',
        variant: 'destructive',
      });
    }
  }, [startRecording, toast]);

  const handleStopRecording = useCallback(async () => {
    const blob = await stopRecording();
    if (blob) {
      onRecordingComplete(blob);
      toast({
        title: 'نجح',
        description: 'تم تسجيل الصوت بنجاح',
      });
    }
  }, [stopRecording, onRecordingComplete, toast]);

  const handleCancelRecording = useCallback(() => {
    cancelRecording();
    onCancel?.();
  }, [cancelRecording, onCancel]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (error) {
    return (
      <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
        <p className="text-sm text-destructive">{error}</p>
        <Button
          size="sm"
          variant="outline"
          onClick={handleCancelRecording}
          className="mt-2 border-destructive/20 text-destructive hover:bg-destructive/10"
        >
          إغلاق
        </Button>
      </div>
    );
  }

  if (!isRecording) {
    return (
      <Button
        onClick={handleStartRecording}
        variant="outline"
        size="sm"
        className="gap-2"
      >
        <Mic size={16} />
        تسجيل صوت
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2 bg-primary/5 border border-primary/20 rounded-xl p-3 animate-in fade-in zoom-in-95 duration-200">
      <div className="flex-1">
        <p className="text-sm font-bold text-foreground">
          {formatDuration(duration)}
        </p>
        <p className="text-[10px] text-muted-foreground">
          {isPaused ? 'موقوف مؤقتاً' : 'جاري التسجيل الآن...'}
        </p>
      </div>

      <div className="flex gap-1">
        {isPaused ? (
          <Button
            onClick={resumeRecording}
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-primary hover:bg-primary/10"
          >
            <Play size={16} />
          </Button>
        ) : (
          <Button
            onClick={pauseRecording}
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-primary hover:bg-primary/10"
          >
            <Pause size={16} />
          </Button>
        )}

        <Button
          onClick={handleStopRecording}
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-green-500 hover:text-green-600 hover:bg-green-500/10"
        >
          <Square size={16} />
        </Button>

        <Button
          onClick={handleCancelRecording}
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive hover:text-destructive/90 hover:bg-destructive/10"
        >
          <Trash2 size={16} />
        </Button>
      </div>
    </div>
  );
});

export default VoiceRecorder;
