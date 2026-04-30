/**
 * اختبار UX/تجربة استخدام (Integration)
 * --------------------------------------
 * يتأكّد من أن مكوّنات الدردشة الأساسية تتفاعل بشكل صحيح من منظور المستخدم.
 */
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import TypingIndicator from "@/components/TypingIndicator";

describe("UX: chat surface", () => {
  it("shows the Arabic typing indicator while the AI is generating", () => {
    render(<TypingIndicator />);
    // النص الذي يراه المستخدم العربي عند انتظار الردّ
    expect(screen.getByText(/جاري الكتابة/)).toBeInTheDocument();
  });

  it("renders three animated dots so the user sees activity", () => {
    const { container } = render(<TypingIndicator />);
    const dots = container.querySelectorAll(".animate-pulse");
    expect(dots.length).toBe(3);
  });
});
