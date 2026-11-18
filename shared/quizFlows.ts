/**
 * Quiz flows for every report (numsecret-style): six one-tap questions per report, always with the
 * keys worry, detail, feeling, since, impact, want. Some answers double as the report's own inputs
 * (QUIZ_INPUTS). Shared so the server validates answers, stores them and gives the AI the buyer's
 * words, and the page shows the same labels and quotes them back on the paywall.
 * Shaadi's questions live in shaadiQuiz.ts (its flow went live first) and are adapted here.
 */
import { SHAADI_QUIZ_STEPS, shaadiQuizQuestion, type QuizOption, type ShaadiWorry } from "./shaadiQuiz";

export type QuizProduct = "shaadi" | "wapas" | "business" | "naukri";
export const QUIZ_PRODUCTS: readonly QuizProduct[] = ["shaadi", "wapas", "business", "naukri"];
export type QuizAnswers = Record<string, string>;
export const QUIZ_KEYS = ["worry", "detail", "feeling", "since", "impact", "want"] as const;
export type QuizKey = (typeof QUIZ_KEYS)[number];

/** The first question of the problem-picker entry: which part of life hurts most. */
export const PROBLEMS: readonly (QuizOption & { value: QuizProduct })[] = [
  { value: "shaadi", label: "शादी / रिश्ता" },
  { value: "wapas", label: "ब्रेकअप / Ex की याद" },
  { value: "business", label: "पैसा / काम-धंधा" },
  { value: "naukri", label: "सरकारी नौकरी" },
];

type StepDef = { key: QuizKey; kicker: string; title: string; options: readonly QuizOption[] };

const SINCE_GENERIC: readonly QuizOption[] = [
  { value: "months", label: "पिछले कुछ महीनों से" },
  { value: "y1_2", label: "1-2 साल से" },
  { value: "y3_5", label: "3-5 साल से" },
  { value: "y5plus", label: "5 साल से भी ज़्यादा" },
];

const WAPAS: readonly StepDef[] = [
  {
    key: "worry", kicker: "दिल से बताइए", title: "अभी आपके रिश्ते की क्या स्थिति है?",
    // Values are the report's own WapasStatus.
    options: [
      { value: "breakup", label: "ब्रेकअप हो गया है" },
      { value: "no_contact", label: "बात-चीत बंद है" },
      { value: "fight", label: "झगड़ा या नाराज़गी चल रही है" },
      { value: "separated", label: "शादी के बाद अलग रह रहे हैं" },
    ],
  },
  {
    key: "detail", kicker: "समझ रहे हैं", title: "सबसे ज़्यादा क्या चुभता है?",
    options: [
      { value: "silent", label: "उन्होंने अचानक बात बंद कर दी" },
      { value: "someone", label: "शायद उनकी ज़िंदगी में कोई और है" },
      { value: "family", label: "घरवालों की वजह से दूरी आई" },
      { value: "mistake", label: "एक ग़लती से सब बिगड़ गया" },
    ],
  },
  {
    key: "feeling", kicker: "समझ रहे हैं", title: "दिन भर कैसा महसूस होता है?",
    options: [
      { value: "checking", label: "बार-बार उनका मैसेज और फ़ोटो देखते हैं" },
      { value: "sleep", label: "रात को नींद नहीं आती" },
      { value: "mixed", label: "गुस्सा भी आता है और याद भी" },
      { value: "blame", label: "खुद को दोष देते रहते हैं" },
    ],
  },
  {
    key: "since", kicker: "बस थोड़ा और", title: "ये दूरी कब से है?",
    options: [
      { value: "weeks", label: "कुछ हफ़्तों से" },
      { value: "m1_3", label: "1-3 महीने से" },
      { value: "m3_12", label: "3-12 महीने से" },
      { value: "y1plus", label: "एक साल से ज़्यादा" },
    ],
  },
  {
    key: "impact", kicker: "दिल की बात", title: "आप सच में क्या चाहते हैं?",
    options: [
      { value: "back", label: "वो वापस आएँ, पूरे दिल से" },
      { value: "changed", label: "वापस आएँ, पर पहले जैसा न हो" },
      { value: "unsure", label: "पता नहीं, मन उलझा हुआ है" },
      { value: "moveon", label: "बस सुकून से आगे बढ़ना है" },
    ],
  },
  {
    key: "want", kicker: "आख़िरी सवाल", title: "अगर आज जवाब मिल जाए, तो सबसे पहले क्या जानना चाहेंगे?",
    options: [
      { value: "back", label: "क्या वो वापस आएँगे" },
      { value: "mind", label: "उनके मन में अभी क्या है" },
      { value: "when", label: "बात फिर कब बनेगी" },
      { value: "decide", label: "इंतज़ार करूँ या आगे बढ़ूँ" },
    ],
  },
];

const BUSINESS: readonly StepDef[] = [
  {
    key: "worry", kicker: "दिल से बताइए", title: "पैसे को लेकर सबसे बड़ी परेशानी क्या है?",
    options: [
      { value: "stay", label: "पैसा आता है, पर टिकता नहीं" },
      { value: "debt", label: "कर्ज़ और EMI का बोझ बढ़ रहा है" },
      { value: "start", label: "अपना काम शुरू करना है, दिशा नहीं मिल रही" },
      { value: "growth", label: "मेहनत बहुत, पर कमाई नहीं बढ़ रही" },
    ],
  },
  {
    // Values are the report's own BusinessSituation.
    key: "detail", kicker: "समझ रहे हैं", title: "अभी आप क्या करते हैं?",
    options: [
      { value: "naukri", label: "नौकरी में हूँ" },
      { value: "business", label: "अपना काम या दुकान है" },
      { value: "berozgar", label: "अभी कोई काम नहीं है" },
      { value: "student", label: "पढ़ाई चल रही है" },
    ],
  },
  {
    key: "feeling", kicker: "समझ रहे हैं", title: "ये बात आपको कैसा महसूस कराती है?",
    options: [
      { value: "burden", label: "घर की ज़िम्मेदारी का बोझ भारी लगता है" },
      { value: "behind", label: "लगता है दूसरों से पीछे रह गए" },
      { value: "monthly", label: "हर महीने पैसों की चिंता रहती है" },
      { value: "ambition", label: "कुछ बड़ा करना है, मौका नहीं मिलता" },
    ],
  },
  { key: "since", kicker: "बस थोड़ा और", title: "ये परेशानी कब से है?", options: SINCE_GENERIC },
  {
    // Values are the report's six budget steps.
    key: "impact", kicker: "बस थोड़ा और", title: "अपना काम शुरू करने के लिए कितनी पूँजी लगा सकते हैं?",
    options: [
      { value: "1", label: "बिना पूँजी" },
      { value: "2", label: "₹25 हज़ार तक" },
      { value: "3", label: "₹25 से 50 हज़ार" },
      { value: "4", label: "₹50 हज़ार से 2 लाख" },
      { value: "5", label: "₹2 से 5 लाख" },
      { value: "6", label: "₹5 लाख से ज़्यादा" },
    ],
  },
  {
    key: "want", kicker: "आख़िरी सवाल", title: "अगर आज जवाब मिल जाए, तो सबसे पहले क्या जानना चाहेंगे?",
    options: [
      { value: "field", label: "कौन सा काम मेरे लिए सही है" },
      { value: "when", label: "पैसा कब बढ़ेगा" },
      { value: "why", label: "पैसा क्यों नहीं टिकता, और उपाय" },
      { value: "name", label: "काम या दुकान के नाम का शुभ अक्षर" },
    ],
  },
];

const NAUKRI: readonly StepDef[] = [
  {
    // Values are the report's own NaukriStatus.
    key: "worry", kicker: "दिल से बताइए", title: "सरकारी नौकरी को लेकर अभी आपकी क्या स्थिति है?",
    options: [
      { value: "taiyari", label: "तैयारी चल रही है" },
      { value: "result", label: "पेपर दे दिया, रिज़ल्ट का इंतज़ार है" },
      { value: "private", label: "प्राइवेट या संविदा नौकरी में हूँ" },
      { value: "attempts", label: "कई बार कोशिश की, अब तक नहीं लगी" },
    ],
  },
  {
    // Values are the report's own NaukriTarget.
    key: "detail", kicker: "समझ रहे हैं", title: "किस नौकरी के लिए कोशिश कर रहे हैं?",
    options: [
      { value: "railway", label: "Railway" },
      { value: "ssc_bank", label: "SSC / Bank" },
      { value: "police_army", label: "Police / Army" },
      { value: "teacher", label: "Teacher" },
      { value: "upsc_pcs", label: "UPSC / PCS" },
      { value: "open", label: "अभी तय नहीं" },
    ],
  },
  {
    key: "feeling", kicker: "समझ रहे हैं", title: "सबसे ज़्यादा क्या चुभता है?",
    options: [
      { value: "family", label: "घरवालों की उम्मीदें बढ़ती जा रही हैं" },
      { value: "age", label: "उम्र निकलती जा रही है" },
      { value: "friends", label: "दोस्त आगे निकल गए" },
      { value: "effort", label: "इतनी मेहनत के बाद भी नतीजा नहीं" },
    ],
  },
  {
    key: "since", kicker: "बस थोड़ा और", title: "कब से कोशिश कर रहे हैं?",
    options: [
      { value: "lt1", label: "1 साल से कम" },
      { value: "y1_2", label: "1-2 साल से" },
      { value: "y3_5", label: "3-5 साल से" },
      { value: "y5plus", label: "5 साल से भी ज़्यादा" },
    ],
  },
  {
    key: "impact", kicker: "दिल की बात", title: "इसका सबसे ज़्यादा असर कहाँ पड़ा है?",
    options: [
      { value: "sleep", label: "रातों की नींद पर" },
      { value: "home", label: "घर के माहौल पर" },
      { value: "confidence", label: "खुद पर भरोसे पर" },
      { value: "shaadi", label: "शादी की बात पर" },
    ],
  },
  {
    key: "want", kicker: "आख़िरी सवाल", title: "अगर आज जवाब मिल जाए, तो सबसे पहले क्या जानना चाहेंगे?",
    options: [
      { value: "when", label: "नौकरी किस साल लगेगी" },
      { value: "yog", label: "कुंडली में सरकारी योग है या नहीं" },
      { value: "field", label: "कौन सी परीक्षा मेरे लिए सही है" },
      { value: "why", label: "रुकावट क्यों है, और उपाय" },
    ],
  },
];

/** Step i of a report's quiz (shaadi's step 2 depends on its first answer). */
export function quizStep(product: QuizProduct, i: number, answers: QuizAnswers): StepDef {
  if (product === "shaadi") {
    const key = SHAADI_QUIZ_STEPS[i];
    return { key, ...shaadiQuizQuestion(key, answers.worry as ShaadiWorry | undefined) };
  }
  return { wapas: WAPAS, business: BUSINESS, naukri: NAUKRI }[product][i];
}

/** True when every answer is one of the listed options of its step. */
export function isQuizAnswers(product: QuizProduct, v: unknown): v is QuizAnswers {
  if (!v || typeof v !== "object") return false;
  const a = v as Record<string, unknown>;
  const answers = Object.fromEntries(QUIZ_KEYS.map((k) => [k, String(a[k] ?? "")])) as QuizAnswers;
  return QUIZ_KEYS.every((k, i) => quizStep(product, i, answers).options.some((o) => o.value === a[k]));
}

/** Only the six answers, so nothing else a browser sends gets stored. */
export function pickQuizAnswers(v: QuizAnswers): QuizAnswers {
  return Object.fromEntries(QUIZ_KEYS.map((k) => [k, v[k]]));
}

/** The answers as the labels the buyer tapped. */
export function quizLabels(product: QuizProduct, a: QuizAnswers): Record<QuizKey, string> {
  return Object.fromEntries(
    QUIZ_KEYS.map((k, i) => [k, quizStep(product, i, a).options.find((o) => o.value === a[k])?.label ?? ""]),
  ) as Record<QuizKey, string>;
}

/** Which answer the paywall quotes back: the one that names the pain most directly. */
export const QUOTE_KEY: Record<QuizProduct, QuizKey> = { shaadi: "detail", wapas: "detail", business: "worry", naukri: "feeling" };

/** A line for the AI prompt, so the paid report speaks to what the buyer told us. */
export function quizWorryLine(product: QuizProduct, a: QuizAnswers | null | undefined): string {
  if (!a) return "";
  const l = quizLabels(product, a);
  return `\nUnki chinta (unke tappe hue jawab, Hindi me): "${l[QUOTE_KEY[product]]}", ${l.since}. Unhe sabse pehle jaanna hai: "${l.want}". Summary ke pehle vakya me is chinta ko naam lekar seedha sambodhit karo, phir kundli ka jawab do.`;
}
