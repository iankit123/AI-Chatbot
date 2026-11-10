import { CRISIS_HELPLINE } from "@shared/crisisSupport";

const COPY = {
  hindi: {
    title: "यह चैट इस डिवाइस पर बंद है",
    body: "आप जिस बात से गुज़र रहे हैं, उसके लिए किसी प्रशिक्षित इंसान से बात करना सबसे अच्छा है। Tele-MANAS पर काउंसलर 24 घंटे, मुफ़्त, आपकी भाषा में बात करते हैं।",
    call: `${CRISIS_HELPLINE.number} पर कॉल करें`,
    emergency: `अभी खतरा हो तो ${CRISIS_HELPLINE.emergencyNumber} पर कॉल करें।`,
  },
  english: {
    title: "This chat is closed on this device",
    body: "For what you're going through, it's best to talk to a trained person. Tele-MANAS counsellors are free, available 24×7, and speak your language.",
    call: `Call ${CRISIS_HELPLINE.number}`,
    emergency: `If you're in danger right now, call ${CRISIS_HELPLINE.emergencyNumber}.`,
  },
} as const;

function readLanguage(): "hindi" | "english" {
  try {
    return localStorage.getItem("chatLanguage") === "english" ? "english" : "hindi";
  } catch {
    return "hindi";
  }
}

/** Shown on every visit after a self-harm message. Keeps the helpline one tap away. */
export function SupportBlockedPage() {
  const copy = COPY[readLanguage()];
  return (
    <main className="flex min-h-screen items-center justify-center bg-white px-4 py-10">
      <div className="w-full max-w-sm text-center">
        <h1 className="text-xl font-semibold text-neutral-900">{copy.title}</h1>
        <p className="mt-3 text-[15px] leading-relaxed text-neutral-600">{copy.body}</p>
        <a
          href={`tel:${CRISIS_HELPLINE.number}`}
          className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#128c7e] px-6 py-3 text-base font-medium text-white"
        >
          <span className="material-icons text-[20px]">call</span>
          {copy.call}
        </a>
        <p className="mt-4 text-sm text-neutral-500">{copy.emergency}</p>
      </div>
    </main>
  );
}
