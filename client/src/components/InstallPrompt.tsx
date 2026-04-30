/**
 * InstallPrompt — زر تثبيت التطبيق على الجهاز (PWA Install)
 * ----------------------------------------------------------
 * يستمع لحدث `beforeinstallprompt` ويعرض زرّاً صغيراً عندما يكون
 * بإمكان المستخدم تثبيت الموقع كتطبيق على هاتفه (Android Chrome / Edge).
 *
 * - يختفي تلقائياً بعد التثبيت أو عند رفض المستخدم
 * - يحفظ القرار في localStorage حتى لا يُزعج المستخدم
 */
import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { analytics } from "@/lib/analytics";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "ai-chat-pro:install-dismissed";

export default function InstallPrompt() {
  const [event, setEvent] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (localStorage.getItem(DISMISS_KEY) === "1") return;

    const handler = (e: Event) => {
      e.preventDefault();
      setEvent(e as BeforeInstallPromptEvent);
      analytics.track("pwa_install_prompt_shown");
    };

    const installed = () => {
      setEvent(null);
      analytics.track("pwa_installed");
    };

    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", installed);
    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", installed);
    };
  }, []);

  if (!event) return null;

  const handleInstall = async () => {
    await event.prompt();
    const { outcome } = await event.userChoice;
    analytics.track("pwa_install_choice", { outcome });
    if (outcome === "dismissed") {
      localStorage.setItem(DISMISS_KEY, "1");
    }
    setEvent(null);
  };

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, "1");
    setEvent(null);
  };

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-card border border-border shadow-lg rounded-xl px-3 py-2 animate-fadeIn">
      <Button size="sm" onClick={handleInstall} className="gap-2">
        <Download size={16} />
        تثبيت التطبيق
      </Button>
      <button
        onClick={handleDismiss}
        className="text-xs text-muted-foreground px-2 py-1 hover:text-foreground"
      >
        لاحقاً
      </button>
    </div>
  );
}
