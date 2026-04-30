import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCcw } from 'lucide-react';
import { logger } from '@/lib/logger';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * مكون Error Boundary لحماية التطبيق من الانهيار الكامل عند حدوث خطأ في التصيير
 * تم تحسينه ليكون متوافقاً مع التصميم الاحترافي (المرحلة 8 - النقطة 3)
 */
class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    // تحديث الحالة بحيث تظهر واجهة الخطأ البديلة
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // إرسال الخطأ إلى نظام التسجيل المركزي (يطبع في console + يرسل للسيرفر)
    logger.error('react ErrorBoundary caught', {
      name: error.name,
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4 text-center" dir="rtl">
          <div className="max-w-md w-full space-y-6 p-8 rounded-3xl border border-border bg-card shadow-2xl animate-in fade-in zoom-in duration-300">
            <div className="flex justify-center">
              <div className="p-4 bg-destructive/10 rounded-full text-destructive">
                <AlertTriangle size={48} />
              </div>
            </div>
            
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-foreground">عذراً، حدث خطأ غير متوقع</h1>
              <p className="text-muted-foreground text-sm leading-relaxed">
                واجه التطبيق مشكلة تقنية تمنعه من الاستمرار. لا تقلق، بياناتك محفوظة في التخزين المحلي.
              </p>
            </div>

            {this.state.error && (
              <div className="p-3 bg-muted rounded-xl text-xs font-mono text-left overflow-auto max-h-32 opacity-70" dir="ltr">
                {this.state.error.toString()}
              </div>
            )}

            <Button 
              onClick={this.handleReset}
              className="w-full py-6 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground flex items-center justify-center gap-2"
            >
              <RefreshCcw size={18} />
              إعادة تحميل التطبيق
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
