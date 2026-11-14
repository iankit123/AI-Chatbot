import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

const KeyboardOpenContext = createContext(false);

/** True while the on-screen keyboard is open (the bottom tab bar hides to give the chat room). */
export const useKeyboardOpen = () => useContext(KeyboardOpenContext);

/**
 * Full-screen frame for every chat page: header on top, messages in the middle, message
 * box at the bottom, all inside the part of the screen that is actually visible.
 *
 * `100vh` on phones includes the area under the browser's address bar and the keyboard,
 * which pushed the header off the top and hid the message box. This sizes the frame to
 * the visual viewport instead and keeps it pinned when the keyboard opens.
 */
export function ChatShell({ children }: { children: ReactNode }) {
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  useEffect(() => {
    const viewport = window.visualViewport;
    const root = document.documentElement;
    if (!viewport) return;

    let tallest = viewport.height;
    const update = () => {
      root.style.setProperty("--app-height", `${viewport.height}px`);
      root.style.setProperty("--app-top", `${viewport.offsetTop}px`);
      tallest = Math.max(tallest, viewport.height);
      setKeyboardOpen(viewport.height < tallest - 150);
    };

    update();
    viewport.addEventListener("resize", update);
    viewport.addEventListener("scroll", update);
    return () => {
      viewport.removeEventListener("resize", update);
      viewport.removeEventListener("scroll", update);
      root.style.removeProperty("--app-height");
      root.style.removeProperty("--app-top");
    };
  }, []);

  return (
    <KeyboardOpenContext.Provider value={keyboardOpen}>
      <div
        className="fixed inset-x-0 flex flex-col overflow-hidden bg-[#e5ddd5]"
        style={{ top: "var(--app-top, 0px)", height: "var(--app-height, 100dvh)" }}
      >
        {children}
      </div>
    </KeyboardOpenContext.Provider>
  );
}
