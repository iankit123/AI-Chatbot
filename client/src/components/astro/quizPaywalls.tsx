import type { ReactNode } from "react";
import { Check, Lock } from "lucide-react";
import { QUOTE_KEY, quizLabels, type QuizAnswers, type QuizProduct } from "@shared/quizFlows";
import { AstroFooter, ErrorNote, LevelMeter, PayBar, ScoreRing } from "@/components/astro/ui";
import { ReportBanner, SectionHead } from "@/components/astro/editorial";
import { PartnerSilhouette } from "@/components/astro/partnerSilhouette";
import {
  AnswerCard, BlurLines, KundliCard, LockedList, LockPill, PriceCard, QuizFaq, QuoteCard,
} from "@/components/astro/quizFlow";
import type { BusinessReport, NaukriReport, ShaadiReport, WapasReport } from "@/lib/astroApi";

/**
 * Paywalls for reports made in a quiz flow (SHAADI_QUIZ test): the buyer's words quoted back, their
 * real birth chart, three locked answer cards (ordered by what they want to know first) and ₹99.
 * Each shows only what that report's free preview already exposes; the readings stay server-side.
 */

type PayProps = { error: string | null; paying: boolean; onPay: () => void };

const firstName = (name: string) => {
  const raw = name.split(/\s+/)[0] ?? "";
  return raw.charAt(0).toUpperCase() + raw.slice(1);
};

/** Cards in the order the buyer asked for; unknown wants keep the default order. */
function ordered<K extends string>(cards: Record<K, (n: number) => ReactNode>, order: K[]) {
  return order.map((k, i) => cards[k](i + 1));
}

function Frame({
  product, quiz, banner, chips, top, kundli, cards, price, how, line, props,
}: {
  product: QuizProduct; quiz?: QuizAnswers; banner: ReactNode; chips: ReactNode; top?: ReactNode; kundli: ReactNode;
  cards: ReactNode; price: ReactNode; how: string; line: string; props: PayProps & { price: { rupees: number; strike: number } };
}) {
  const l = quiz ? quizLabels(product, quiz) : null;
  return (
    <>
      {banner}
      <div className="mt-4 flex flex-wrap gap-2 text-[12px]">{chips}</div>
      <div className="mt-6 space-y-4">
        {top}
        {l && <QuoteCard quote={l[QUOTE_KEY[product]]} meta={l.since} line={line} />}
        {kundli}
        <div className="pt-4">
          <SectionHead kicker="आपकी कुंडली से" title="आपके 3 जवाब तैयार हैं" sub="तीनों आपकी कुंडली से निकाले गए हैं। पूरी रिपोर्ट में खुलेंगे।" />
          <div className="space-y-4">{cards}</div>
        </div>
        {price}
        <ErrorNote message={props.error} />
        <QuizFaq how={how} />
      </div>
      <AstroFooter />
      <PayBar price={props.price} label="पूरी रिपोर्ट खोलें" sub="Razorpay से सुरक्षित · UPI, कार्ड · तुरंत खुलेगी" busy={props.paying} onPay={props.onPay} />
    </>
  );
}

const Chip = ({ k, v }: { k: string; v: ReactNode }) => (
  <span className="glass px-3 py-1.5">{k}: <b className="font-semibold">{v}</b></span>
);

function YearBlur({ range }: { range?: boolean }) {
  return (
    <p className="font-display ink mt-1 text-[2.6rem] leading-none" aria-label="Saal poori report me khulega">
      20<span className="blur-lock inline-block !blur-[9px]" aria-hidden>88</span>
      {range && <>–<span className="blur-lock inline-block !blur-[9px]" aria-hidden>88</span></>}
    </p>
  );
}

// ---------------------------------------------------------------- Shaadi

export function ShaadiQuizPaywall({ report, ...props }: PayProps & { report: ShaadiReport }) {
  const who = report.gender === "male" ? "पत्नी" : "पति";
  const strong = /prabal/i.test(report.headline);
  const delays = report.delayCount ?? 0;
  const want = report.quiz?.want;
  const order: ("when" | "who" | "why")[] = want === "who" ? ["who", "when", "why"] : want === "why" ? ["why", "when", "who"] : ["when", "who", "why"];
  const cards = {
    when: (n: number) => (
      <AnswerCard key="when" n={n} img="/astro/k-venus.webp" title="शादी कब होगी">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="ink-soft text-[13px]">{strong ? "विवाह का प्रबल योग" : "विवाह का योग"}</p>
            <YearBlur range={report.windowIsRange} />
          </div>
          <LockPill text="साल और महीने" />
        </div>
        <p className="ink mt-3 text-[14px] leading-relaxed">
          आपकी कुंडली में शादी का सबसे मज़बूत समय निकल आया है{report.windowIsRange ? ", जो दो साल के बीच फैला है" : ""}। यह समय आपकी विंशोत्तरी दशा और विवाह भाव से निकाला गया है।
        </p>
        {want === "kind" && <p className="ink-soft mt-2 text-[13px]">लव मैरिज होगी या अरेंज, यह भी इसी हिस्से में है।</p>}
        <BlurLines />
      </AnswerCard>
    ),
    who: (n: number) => (
      <AnswerCard key="who" n={n} img="/astro/k-door.webp" title={`होने वाले ${who} का नाम और झलक`}>
        <div className="flex gap-4">
          <div className="relative h-[112px] w-[92px] shrink-0 overflow-hidden rounded-xl ring-1 ring-[#d9b98a]">
            <PartnerSilhouette variant={report.gender === "male" ? "woman" : "man"} className="h-full w-full scale-110 blur-[6px]" />
            <span className="absolute inset-0 grid place-items-center">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-[rgba(44,18,25,0.85)] text-[#fbe9cf]"><Lock className="h-4 w-4" /></span>
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="ink-soft text-[12.5px]">नाम इनमें से किसी अक्षर से</p>
            <div className="mt-1.5 flex gap-1.5">
              <span className="letter-tile !aspect-auto h-10 w-10 !rounded-lg !text-[1.25rem]">{report.firstLetter?.latin}</span>
              {Array.from({ length: Math.max(0, report.letterCount - 1) }).map((_, k) => (
                <span key={k} className="letter-tile locked !aspect-auto h-10 w-10 !rounded-lg"><Lock className="h-4 w-4 text-[#9a6a2a]" /></span>
              ))}
            </div>
            <p className="ink mt-2.5 text-[13.5px] leading-relaxed">
              पहला अक्षर <b>{report.firstLetter?.latin} ({report.firstLetter?.hi})</b> आपके विवाह भाव की राशि से निकला है।
            </p>
          </div>
        </div>
        <p className="ink-soft mt-3 text-[13px] leading-relaxed">बाक़ी {Math.max(0, report.letterCount - 1)} अक्षर, {who} का रूप-स्वभाव, काम और रिश्ता किस दिशा से आएगा: पूरी रिपोर्ट में।</p>
      </AnswerCard>
    ),
    why: (n: number) => (
      <AnswerCard key="why" n={n} img="/astro/k-saturn.webp" title="देर की वजह और उपाय">
        <p className="ink text-[14.5px] leading-relaxed">
          {delays > 0 ? <>आपकी कुंडली में <b>{delays} कारण</b> मिले हैं जो शादी में देर करा सकते हैं।</> : <>आपकी कुंडली में शादी रोकने वाला कोई बड़ा कारण नहीं दिखा। सही समय पहचानना सबसे ज़रूरी है।</>}
        </p>
        <LockedList items={[delays > 0 ? "देर के कारण, एक-एक करके" : "सही समय पर क्या करें", "मंगल दोष है या नहीं", "आपकी कुंडली के हिसाब से सरल उपाय"]} />
      </AnswerCard>
    ),
  };
  return (
    <Frame
      product="shaadi"
      quiz={report.quiz}
      props={{ ...props, price: report.price }}
      banner={<ReportBanner src="/astro/milan-hero.webp" kicker="आपकी कुंडली तैयार है" title={`${firstName(report.name)} जी, ${strong ? "आपकी कुंडली में विवाह का प्रबल योग है" : "आपकी कुंडली में विवाह का योग है"}`} position="50% 60%" />}
      chips={<>{report.chart.lagna && <Chip k="लग्न" v={report.chart.lagna} />}<Chip k="राशि" v={report.chart.moonRashiHi} /><Chip k="नक्षत्र" v={report.chart.nakshatra} /></>}
      line="आपने बताया था। इसलिए आपकी कुंडली में सबसे पहले विवाह भाव (सातवाँ घर) देखा गया।"
      kundli={report.kundli && (
        <KundliCard
          kundli={report.kundli}
          highlight={7}
          title={`विवाह भाव में ${report.seventh?.rashi ?? ""} राशि`}
          text={report.seventh ? `सातवें घर (हल्का सुनहरा) में ${report.seventh.rashi} राशि है और उसके स्वामी ${report.seventh.lord} ${report.seventh.lordHouse}वें घर में हैं। शादी का समय और जीवनसाथी के संकेत यहीं से पढ़े जाते हैं।` : "सातवाँ घर (हल्का सुनहरा) विवाह भाव है। शादी का समय और जीवनसाथी के संकेत यहीं से पढ़े जाते हैं।"}
        />
      )}
      cards={ordered(cards, order)}
      price={<PriceCard price={report.price} paying={props.paying} onPay={props.onPay} items={["शादी का साल और महीने", `${who} के नाम के ${report.letterCount} संभावित अक्षर`, `${who} का स्केच, रूप और स्वभाव`, "लव मैरिज या अरेंज", "मंगल दोष की जाँच", "देर के कारण और सरल उपाय"]} />}
      how="आपकी जन्म तिथि, समय और स्थान से ग्रहों की स्थिति निकाली जाती है (लाहिड़ी अयनांश)। फिर सातवाँ भाव, उसके स्वामी, विंशोत्तरी दशा और गुरु के गोचर से शादी का समय और जीवनसाथी के संकेत देखे जाते हैं।"
    />
  );
}

// ---------------------------------------------------------------- Wapas

export function WapasQuizPaywall({ report, ...props }: PayProps & { report: WapasReport }) {
  const a = report.selfName, b = report.partnerName;
  const want = report.quiz?.want;
  const order: ("back" | "mind" | "when")[] = want === "mind" ? ["mind", "back", "when"] : want === "when" ? ["when", "back", "mind"] : ["back", "mind", "when"];
  const cards = {
    back: (n: number) => (
      <AnswerCard key="back" n={n} img="/astro/k-door.webp" title={`क्या ${b} वापस आएँगे?`}>
        <div className="relative">
          <div className="blur-lock"><LevelMeter level={2} labels={["कम", "मध्यम", "प्रबल"]} /></div>
          <div className="absolute inset-0 grid place-items-center"><LockPill text="सीधा जवाब" /></div>
        </div>
        <p className="ink mt-3 text-[14px] leading-relaxed">जवाब तैयार है। दोनों की कुंडली और आपकी अभी की दशा, दोनों को देखकर निकाला गया है।</p>
        {want === "decide" && <p className="ink-soft mt-2 text-[13px]">इंतज़ार करें या आगे बढ़ें, इसका साफ़ जवाब भी इसी हिस्से में है।</p>}
      </AnswerCard>
    ),
    mind: (n: number) => (
      <AnswerCard key="mind" n={n} img="/astro/k-moon.webp" title={`${b} के मन में क्या है`}>
        <p className="ink text-[14px] leading-relaxed">क्या वो भी आपको याद करते हैं, या आगे बढ़ चुके हैं। दोनों की चंद्र राशि और ग्रह मैत्री से देखा गया।</p>
        <BlurLines />
      </AnswerCard>
    ),
    when: (n: number) => (
      <AnswerCard key="when" n={n} img="/astro/k-venus.webp" title="बात फिर कब बनेगी">
        <div className="flex items-center justify-between gap-3">
          <p className="ink text-[14px] leading-relaxed">संपर्क के सबसे अनुकूल महीने</p>
          <LockPill text="महीने" />
        </div>
        <LockedList items={["क्या करें", "क्या बिल्कुल न करें", "रिश्ते की शांति के सरल उपाय"]} />
      </AnswerCard>
    ),
  };
  return (
    <Frame
      product="wapas"
      quiz={report.quiz}
      props={{ ...props, price: report.price }}
      banner={<ReportBanner src="/astro/wapas-hero-couple.webp" kicker="कुंडली मिलान तैयार है" title={`${a} और ${b}`} position="50% 63%" />}
      chips={<><Chip k={a} v={report.self.moonRashi} /><Chip k={b} v={report.partner.moonRashi} /></>}
      top={
        <section className="glass rise p-5 text-center">
          <p className="text-[12px] tracking-[0.12em] text-[var(--ed-accent)]">दोनों का जुड़ाव</p>
          <div className="mt-3"><ScoreRing score={report.gunTotal} size={160} /></div>
          <p className="font-display mt-3 text-[1.15rem] text-[var(--ed-text)]">{report.gunBand}</p>
          <p className="mt-2 text-[12px] leading-relaxed text-[var(--ed-muted)]">{report.basisNote}</p>
        </section>
      }
      line="आपने बताया था। इसलिए दोनों की कुंडली में सबसे पहले मन का मेल और प्रेम भाव देखा गया।"
      kundli={report.kundli && (
        <KundliCard kundli={report.kundli} highlight={7} title="आपकी कुंडली का सातवाँ घर" text="सातवाँ घर (हल्का सुनहरा) जीवनसाथी और रिश्तों का भाव है। रिश्ते का समय यहीं से और प्रेम भाव की दशा से देखा जाता है।" />
      )}
      cards={ordered(cards, order)}
      price={<PriceCard price={report.price} paying={props.paying} onPay={props.onPay} items={["क्या वो वापस आएँगे: सीधा जवाब", "उनके मन में क्या है", "दूरी की असली वजह", "बात बनने के महीने", "क्या करें, क्या न करें", "सरल उपाय"]} />}
      how="आपकी और उनकी जन्म तिथि से दोनों की चंद्र राशि और नक्षत्र निकाले जाते हैं। फिर गुण मिलान, ग्रह मैत्री और प्रेम भाव की दशा से रिश्ते की दिशा और समय देखा जाता है। उनकी जन्म तिथि न हो तो नाम के पहले अक्षर से नाम-राशि ली जाती है।"
    />
  );
}

// ---------------------------------------------------------------- Business (paisa)

export function BusinessQuizPaywall({ report, ...props }: PayProps & { report: BusinessReport }) {
  const want = report.quiz?.want;
  const order: ("field" | "when" | "why")[] = want === "when" ? ["when", "field", "why"] : want === "why" || want === "name" ? ["why", "field", "when"] : ["field", "when", "why"];
  const letters = report.letterCount ?? 0;
  const cards = {
    field: (n: number) => (
      <AnswerCard key="field" n={n} img="/astro/k-office.webp" title="आपके लिए सही काम">
        {report.topField && (
          <>
            <p className="ink-soft text-[12.5px]">सबसे अनुकूल क्षेत्र</p>
            <p className="ink mt-0.5 text-[1.05rem] font-semibold leading-snug">{report.topField.field}</p>
            <p className="ink mt-2 text-[13.5px] leading-relaxed">आपकी कुंडली में <b>{report.topField.planet}</b> सबसे प्रभावी ग्रह है, इसलिए इससे जुड़े काम आपको फलते हैं।</p>
          </>
        )}
        <LockedList items={[`${report.ideaCount ?? "कुछ"} काम, आपकी पूँजी (${report.budget}) के हिसाब से`]} />
      </AnswerCard>
    ),
    when: (n: number) => (
      <AnswerCard key="when" n={n} img="/astro/k-sun.webp" title="पैसा कब बढ़ेगा">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="ink-soft text-[13px]">काम शुरू करने और बढ़ाने का शुभ समय</p>
            <YearBlur />
          </div>
          <LockPill text="साल और महीने" />
        </div>
        <BlurLines />
      </AnswerCard>
    ),
    why: (n: number) => (
      <AnswerCard key="why" n={n} img="/astro/k-saturn.webp" title={want === "name" ? "नाम का शुभ अक्षर और उपाय" : "पैसा क्यों नहीं टिकता, और उपाय"}>
        {letters > 0 && (
          <>
            <p className="ink-soft text-[12.5px]">काम या दुकान के नाम के {letters} शुभ अक्षर</p>
            <div className="mt-1.5 flex gap-1.5">
              {Array.from({ length: letters }).map((_, k) => (
                <span key={k} className="letter-tile locked !aspect-auto h-10 w-10 !rounded-lg"><Lock className="h-4 w-4 text-[#9a6a2a]" /></span>
              ))}
            </div>
          </>
        )}
        <LockedList items={["किस ग़लती से बचना है", "साझेदारी करें या नहीं", "आपकी कुंडली के हिसाब से सरल उपाय"]} />
      </AnswerCard>
    ),
  };
  return (
    <Frame
      product="business"
      quiz={report.quiz}
      props={{ ...props, price: report.price }}
      banner={<ReportBanner src="/astro/k-office.webp" kicker="आपकी कुंडली तैयार है" title={`${report.name} जी, आपकी कुंडली में ${report.level.hi}`} position="50% 50%" />}
      chips={<>{report.chart.lagna && <Chip k="लग्न" v={report.chart.lagna} />}<Chip k="राशि" v={report.chart.moonRashiHi} /><Chip k="पूँजी" v={report.budget} /></>}
      top={
        <section className="paper rise p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#9a6a2a]">काम-धंधे का योग</p>
          <p className="ink mt-1 text-[1.25rem]" style={{ fontFamily: '"Tiro Devanagari Hindi", serif' }}>{report.level.hi}</p>
          <div className="mt-3"><LevelMeter level={report.meter} labels={["सेवा क्षेत्र", "मिश्रित", "प्रबल"]} /></div>
        </section>
      }
      line="आपने बताया था। इसलिए आपकी कुंडली में सबसे पहले कर्म भाव (दसवाँ घर) और धन के योग देखे गए।"
      kundli={report.kundli && (
        <KundliCard kundli={report.kundli} highlight={10} title="कर्म भाव (दसवाँ घर)" text="दसवाँ घर (हल्का सुनहरा) काम और कर्म का भाव है। आपके काम का क्षेत्र और पैसे के योग यहीं से, उसके स्वामी और दशा से पढ़े जाते हैं।" />
      )}
      cards={ordered(cards, order)}
      price={<PriceCard price={report.price} paying={props.paying} onPay={props.onPay} items={["आपके लिए सबसे सही काम", `${report.ideaCount ?? ""} काम आपकी पूँजी के हिसाब से`.trim(), "काम शुरू करने का शुभ समय", "नाम के शुभ अक्षर", "साझेदारी और सावधानियाँ", "सरल उपाय"]} />}
      how="आपकी जन्म तिथि, समय और स्थान से ग्रहों की स्थिति निकाली जाती है। फिर दसवाँ भाव (कर्म), उसके स्वामी, सबसे प्रभावी ग्रह और दशा से काम का क्षेत्र और सही समय देखा जाता है।"
    />
  );
}

// ---------------------------------------------------------------- Naukri

export function NaukriQuizPaywall({ report, ...props }: PayProps & { report: NaukriReport }) {
  const want = report.quiz?.want;
  const order: ("yog" | "when" | "why")[] = want === "yog" || want === "field" ? ["yog", "when", "why"] : want === "why" ? ["why", "yog", "when"] : ["when", "yog", "why"];
  const hidden = Math.max(0, report.yogCount - 1);
  const obstacles = report.obstacleCount ?? 0;
  const cards = {
    yog: (n: number) => (
      <AnswerCard key="yog" n={n} img="/astro/k-sun.webp" title="कुंडली में सरकारी योग">
        {report.yogCount > 0 ? (
          <>
            <p className="ink"><span className="font-display text-[2.4rem] leading-none">{report.yogCount}</span> <span className="text-[1.05rem]">सरकारी {report.yogCount === 1 ? "योग मिला" : "योग मिले"}</span></p>
            {report.firstYog && <p className="ink mt-2 flex items-center gap-2 text-[14px]"><Check className="h-4 w-4 shrink-0 text-[#2f7a4a]" strokeWidth={2.5} /> {report.firstYog}</p>}
            {hidden > 0 && <LockedList items={[`बाक़ी ${hidden} ${hidden === 1 ? "योग" : "योग"} और उनका मतलब`]} />}
          </>
        ) : (
          <p className="ink text-[14px] leading-relaxed">सीधा सरकारी योग नहीं दिखा। ऐसे में दशा और गोचर से मौके का सही समय सबसे ज़रूरी होता है।</p>
        )}
        {want === "field" && <LockedList items={["कौन सा विभाग और परीक्षा आपके लिए सही है"]} />}
      </AnswerCard>
    ),
    when: (n: number) => (
      <AnswerCard key="when" n={n} img="/astro/k-exam.webp" title="नौकरी कब लगेगी">
        {report.hasWindow ? (
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="ink-soft text-[13px]">सबसे मज़बूत साल</p>
              <YearBlur />
            </div>
            <LockPill text="साल और महीने" />
          </div>
        ) : (
          <p className="ink text-[14px] leading-relaxed">अगले कुछ सालों में कौन सा समय सबसे अच्छा है, पूरी रिपोर्ट में।</p>
        )}
        <p className="ink mt-3 text-[14px] leading-relaxed">यह समय आपकी दशा, दसवें भाव और गुरु के गोचर से निकाला गया है।</p>
        <BlurLines />
      </AnswerCard>
    ),
    why: (n: number) => (
      <AnswerCard key="why" n={n} img="/astro/k-saturn.webp" title="रुकावट क्यों, और उपाय">
        <p className="ink text-[14.5px] leading-relaxed">
          {obstacles > 0 ? <>आपकी कुंडली में <b>{obstacles} रुकावटें</b> मिली हैं।</> : <>आपकी कुंडली में कोई बड़ी रुकावट नहीं दिखी। सही समय पर पूरी ताक़त लगाना ज़रूरी है।</>}
        </p>
        <LockedList items={["शनि और दशा का असर", "क्या करें, क्या न करें", "आपकी कुंडली के हिसाब से सरल उपाय"]} />
      </AnswerCard>
    ),
  };
  return (
    <Frame
      product="naukri"
      quiz={report.quiz}
      props={{ ...props, price: report.price }}
      banner={<ReportBanner src="/astro/naukri-hero.webp" kicker="आपकी कुंडली तैयार है" title={`${report.name} जी, ${report.yogCount > 0 ? `आपकी कुंडली में ${report.yogCount} सरकारी ${report.yogCount === 1 ? "योग" : "योग"}` : "आपकी सरकारी नौकरी की कुंडली"}`} position="50% 40%" />}
      chips={<>{report.chart.lagna && <Chip k="लग्न" v={report.chart.lagna} />}<Chip k="राशि" v={report.chart.moonRashiHi} /><Chip k="दशा" v={report.dasha} /></>}
      line="आपने बताया था। इसलिए आपकी कुंडली में सबसे पहले दसवाँ भाव (कर्म) और सूर्य देखे गए।"
      kundli={report.kundli && (
        <KundliCard kundli={report.kundli} highlight={10} title="कर्म भाव (दसवाँ घर)" text="दसवाँ घर (हल्का सुनहरा) नौकरी और पद का भाव है। सरकारी नौकरी के योग यहीं से, सूर्य और दशा से पढ़े जाते हैं।" />
      )}
      cards={ordered(cards, order)}
      price={<PriceCard price={report.price} paying={props.paying} onPay={props.onPay} items={["सभी सरकारी योग", "नौकरी का सबसे मज़बूत साल और महीने", "आपके लिए सही विभाग और परीक्षा", "रुकावटें और शनि का असर", "क्या करें, क्या न करें", "सरल उपाय"]} />}
      how="आपकी जन्म तिथि, समय और स्थान से ग्रहों की स्थिति निकाली जाती है। फिर दसवाँ भाव, सूर्य, सरकारी योग और दशा से नौकरी के योग और समय देखे जाते हैं।"
    />
  );
}
