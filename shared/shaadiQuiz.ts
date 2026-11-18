/**
 * The six one-tap questions of the /shaadi quiz flow (see SHAADI_QUIZ in astroProducts.ts).
 * Shared so the server can validate answers, store them on the report, and give the AI the
 * buyer's own words; the page shows the same labels and quotes them back on the paywall.
 * Step 2 ("detail") depends on the answer to step 1 ("worry").
 */

export type QuizOption = { value: string; label: string };

export const SHAADI_WORRIES = [
  { value: "delay", label: "शादी में देर हो रही है" },
  { value: "rishta", label: "रिश्ते आते हैं, पर बात नहीं बनती" },
  { value: "love", label: "किसी से प्यार है, घरवाले नहीं मान रहे" },
  { value: "partner", label: "जीवनसाथी कैसा मिलेगा, यही सवाल है" },
] as const satisfies readonly QuizOption[];
export type ShaadiWorry = (typeof SHAADI_WORRIES)[number]["value"];

export const SHAADI_DETAILS: Record<ShaadiWorry, readonly QuizOption[]> = {
  delay: [
    { value: "age", label: "उम्र बढ़ रही है, समय निकलता जा रहा है" },
    { value: "others", label: "आसपास सबकी शादी हो गई, बस मेरी नहीं" },
    { value: "dosh", label: "किसी ने कुंडली में दोष बताया है" },
    { value: "why", label: "समझ नहीं आता कि देर क्यों हो रही है" },
  ],
  rishta: [
    { value: "breaks", label: "बात पक्की होते-होते टूट जाती है" },
    { value: "match", label: "कुंडली नहीं मिलती" },
    { value: "liking", label: "पसंद का रिश्ता नहीं आता" },
    { value: "refusal", label: "सामने वालों की तरफ़ से मना हो जाता है" },
  ],
  love: [
    { value: "family", label: "घरवाले राज़ी नहीं हो रहे" },
    { value: "them", label: "पता नहीं वो शादी के लिए तैयार हैं या नहीं" },
    { value: "kundli", label: "डर है कि कुंडली नहीं मिलेगी" },
    { value: "confused", label: "लव या अरेंज, मन उलझा हुआ है" },
  ],
  partner: [
    { value: "looks", label: "वो दिखने में कैसे होंगे" },
    { value: "nature", label: "स्वभाव अच्छा होगा या नहीं" },
    { value: "type", label: "लव मैरिज होगी या अरेंज" },
    { value: "where", label: "रिश्ता कहाँ से आएगा" },
  ],
};

export const SHAADI_FEELINGS = [
  { value: "lonely", label: "अकेलापन महसूस होता है" },
  { value: "pressure", label: "घरवालों का दबाव बढ़ता जा रहा है" },
  { value: "fear", label: "डर लगता है कि ग़लत इंसान न मिल जाए" },
  { value: "tired", label: "थक गए हैं, उम्मीद कम हो रही है" },
] as const satisfies readonly QuizOption[];

export const SHAADI_SINCE = [
  { value: "months", label: "पिछले कुछ महीनों से" },
  { value: "y1_2", label: "1-2 साल से" },
  { value: "y3_5", label: "3-5 साल से" },
  { value: "y5plus", label: "5 साल से भी ज़्यादा" },
] as const satisfies readonly QuizOption[];

export const SHAADI_IMPACTS = [
  { value: "sleep", label: "रातों की नींद पर" },
  { value: "home", label: "घर के माहौल पर" },
  { value: "confidence", label: "खुद पर भरोसे पर" },
  { value: "work", label: "काम और पढ़ाई पर" },
] as const satisfies readonly QuizOption[];

/** What they want to know first; the paywall puts that answer card on top. */
export const SHAADI_WANTS = [
  { value: "when", label: "शादी किस साल होगी" },
  { value: "who", label: "जीवनसाथी के नाम का पहला अक्षर" },
  { value: "why", label: "देर की वजह और उपाय" },
  { value: "kind", label: "लव मैरिज होगी या अरेंज" },
] as const satisfies readonly QuizOption[];

export type ShaadiQuizAnswers = {
  worry: ShaadiWorry;
  detail: string;
  feeling: (typeof SHAADI_FEELINGS)[number]["value"];
  since: (typeof SHAADI_SINCE)[number]["value"];
  impact: (typeof SHAADI_IMPACTS)[number]["value"];
  want: (typeof SHAADI_WANTS)[number]["value"];
};

export const SHAADI_QUIZ_STEPS = ["worry", "detail", "feeling", "since", "impact", "want"] as const;
export type ShaadiQuizStep = (typeof SHAADI_QUIZ_STEPS)[number];

/** Question text, the small line above it, and the options for each step. */
export function shaadiQuizQuestion(step: ShaadiQuizStep, worry?: ShaadiWorry): { kicker: string; title: string; options: readonly QuizOption[] } {
  switch (step) {
    case "worry":
      return { kicker: "दिल से बताइए", title: "शादी को लेकर सबसे बड़ी चिंता क्या है?", options: SHAADI_WORRIES };
    case "detail":
      return { kicker: "समझ रहे हैं", title: "इसमें सबसे ज़्यादा क्या परेशान करता है?", options: SHAADI_DETAILS[worry ?? "delay"] };
    case "feeling":
      return { kicker: "समझ रहे हैं", title: "ये बात आपको कैसा महसूस कराती है?", options: SHAADI_FEELINGS };
    case "since":
      return { kicker: "बस थोड़ा और", title: "ये चिंता कब से है?", options: SHAADI_SINCE };
    case "impact":
      return { kicker: "दिल की बात", title: "इसका सबसे ज़्यादा असर कहाँ पड़ा है?", options: SHAADI_IMPACTS };
    case "want":
      return { kicker: "आख़िरी सवाल", title: "अगर आज जवाब मिल जाए, तो सबसे पहले क्या जानना चाहेंगे?", options: SHAADI_WANTS };
  }
}

const labelOf = (options: readonly QuizOption[], value: string) => options.find((o) => o.value === value)?.label ?? "";

/** The buyer's answers as the labels they tapped. */
export function shaadiQuizLabels(a: ShaadiQuizAnswers) {
  return {
    worry: labelOf(SHAADI_WORRIES, a.worry),
    detail: labelOf(SHAADI_DETAILS[a.worry] ?? [], a.detail),
    feeling: labelOf(SHAADI_FEELINGS, a.feeling),
    since: labelOf(SHAADI_SINCE, a.since),
    impact: labelOf(SHAADI_IMPACTS, a.impact),
    want: labelOf(SHAADI_WANTS, a.want),
  };
}

/** True when every answer is one of the listed options (detail checked against its worry). */
export function isShaadiQuizAnswers(v: unknown): v is ShaadiQuizAnswers {
  if (!v || typeof v !== "object") return false;
  const a = v as Record<string, unknown>;
  const has = (opts: readonly QuizOption[], x: unknown) => typeof x === "string" && opts.some((o) => o.value === x);
  return (
    has(SHAADI_WORRIES, a.worry) &&
    has(SHAADI_DETAILS[a.worry as ShaadiWorry], a.detail) &&
    has(SHAADI_FEELINGS, a.feeling) &&
    has(SHAADI_SINCE, a.since) &&
    has(SHAADI_IMPACTS, a.impact) &&
    has(SHAADI_WANTS, a.want)
  );
}
