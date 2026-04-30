import { Bot } from 'lucide-react';

/**
 * TypingIndicator Component
 * 
 * Design Philosophy: Subtle, elegant typing indicator that shows AI is processing
 * - Animated dots indicate active streaming/processing
 * - Smooth pulse animation for better visual feedback
 * - Matches the overall chat message design
 */
export default function TypingIndicator() {
  return (
    <div className="flex gap-3 mb-4 animate-fadeIn">
      {/* Avatar */}
      <div className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-br from-primary to-indigo-600 text-primary-foreground">
        <Bot size={18} />
      </div>

      {/* Typing Indicator Bubble */}
      <div className="flex items-center gap-1.5 bg-card text-foreground border border-border rounded-lg px-4 py-3 shadow-sm">
        {/* Animated dots */}
        <div className="flex gap-1 items-center">
          <span className="inline-block w-2 h-2 bg-primary/40 rounded-full animate-pulse"></span>
          <span className="inline-block w-2 h-2 bg-primary/40 rounded-full animate-pulse animation-delay-100"></span>
          <span className="inline-block w-2 h-2 bg-primary/40 rounded-full animate-pulse animation-delay-200"></span>
        </div>
        <span className="text-xs text-muted-foreground mr-1">جاري الكتابة...</span>
      </div>
    </div>
  );
}
