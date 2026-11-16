import { useEffect } from "react";
import { Link } from "wouter";
import { logAstro, saveSelfIfEmpty } from "@/lib/astroApi";
import { loadStoredKundliBirth } from "@/lib/kundliBirthStorage";
import { rememberMilanPartner, type ChatSuggestion } from "@/lib/questionTopic";

/** What each report card says in the Jyotish chat. */
function copyFor(s: ChatSuggestion) {
  switch (s.kind) {
    case "shaadi":
      return {
        eyebrow: "Shaadi report",
        title: "Shaadi kab hogi aur kisse?",
        body: "Aapki kundli se shaadi ka samay, love ya arranged, aur jeevansathi ka swabhav, ek poori report me.",
        cta: "Shaadi ka yog dekhein",
      };
    case "wapas":
      return {
        eyebrow: "Ex report",
        title: "Kya aapka Ex wapas aayega?",
        body: "Dono ki kundli se unke mann me kya hai, doori ki wajah aur baat dobara kab banegi.",
        cta: "Wapas aane ka yog dekhein",
      };
    case "milan":
      return {
        eyebrow: "Kundli milan",
        title: s.partnerName ? `${s.partnerName} ke saath aapke kitne gun milte hain?` : "Jinke baare me pooch rahe hain, unse aapke kitne gun milte hain?",
        body: "Aap dono ki kundli milakar 36 me se gun, dosh aur rishta aage kaisa chalega.",
        cta: "Gun milan dekhein",
      };
    case "naukri":
      return {
        eyebrow: "Naukri report",
        title: "Naukri kab lagegi?",
        body: "Kis saal aur kin mahino me naukri ka mauka hai, aur Railway, Police, Bank, Teacher me se kaunsi aapke liye.",
        cta: "Naukri ka yog dekhein",
      };
    case "business":
      return {
        eyebrow: "Business report",
        title: "Kaunsa business aapke liye shubh hai?",
        body: "Janm kundli se sabse shubh vyapar, shuruaat ka sahi samay aur dukan ke naam ka akshar.",
        cta: "Vyapar yog dekhein",
      };
  }
}

/**
 * Under the astrologer's reply in the Kundli chat, when the person asked about marriage, an ex,
 * a specific person, a job or a business: the report that answers it. Their birth details from
 * the chat go along, so the report form opens filled in.
 */
export function ReportCtaCard({ suggestion }: { suggestion: ChatSuggestion }) {
  const target = suggestion.kind;
  const copy = copyFor(suggestion);
  useEffect(() => {
    logAstro("astro_report_action", target, { action: "chat_xsell_shown", source: "kundli_chat" });
  }, [target]);
  const onClick = () => {
    const birth = loadStoredKundliBirth();
    if (birth) {
      saveSelfIfEmpty({
        name: birth.name,
        ...(birth.gender === "male" || birth.gender === "female" ? { gender: birth.gender } : {}),
        dob: birth.dateOfBirth,
        tob: birth.timeOfBirth || null,
        place: birth.cityOfBirth,
      });
    }
    if (suggestion.kind === "milan") rememberMilanPartner({ name: suggestion.partnerName, dob: suggestion.partnerDob });
    logAstro("astro_report_action", target, { action: "chat_xsell_click", source: "kundli_chat" });
  };
  return (
    <div className="mb-2 flex items-end justify-start gap-2">
      <div className="h-8 w-8 shrink-0" aria-hidden />
      <Link
        href={`/${target}`}
        onClick={onClick}
        className="block min-w-0 max-w-[min(85%,20rem)] flex-1 overflow-hidden rounded-2xl border border-[#7a2d3a]/20 bg-gradient-to-br from-white via-white to-[#fbf0e3] px-3.5 py-3 text-left shadow-[0_4px_14px_rgba(122,45,58,0.15)] ring-1 ring-[#7a2d3a]/10 active:scale-[0.98]"
      >
        <span className="block text-[11px] font-semibold uppercase tracking-wide text-[#9a6b1f]">{copy.eyebrow}</span>
        <span className="mt-0.5 block text-[15px] font-semibold leading-snug text-neutral-900">{copy.title}</span>
        <span className="mt-1 block text-[13px] leading-snug text-neutral-600">{copy.body}</span>
        <span className="mt-2.5 inline-flex items-center gap-1 rounded-full bg-[#7a2d3a] px-3.5 py-1.5 text-[13px] font-semibold text-white">
          {copy.cta}
          <span className="material-icons text-[16px] leading-none" aria-hidden>
            chevron_right
          </span>
        </span>
      </Link>
    </div>
  );
}
