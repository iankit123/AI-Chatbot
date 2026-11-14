import * as DialogPrimitive from "@radix-ui/react-dialog";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { StoredKundliBirthDetails } from "@/lib/kundliBirthStorage";
import { formatKundliDob, formatKundliTob } from "@/lib/kundliBirthFormat";
import { useChat } from "@/context/ChatContext";
import { cn } from "@/lib/utils";
import { parseBirthDate, parseBirthTime } from "@shared/kundliBirth";

export type KundliBirthFormPayload = StoredKundliBirthDetails;

type Props = {
  open: boolean;
  onSubmit: (data: KundliBirthFormPayload) => void;
  onCancel: () => void;
  initialValues?: StoredKundliBirthDetails | null;
};

type StepId = "name" | "gender" | "date" | "time" | "place";
const STEP_ORDER: StepId[] = ["name", "gender", "date", "time", "place"];

const COPY = {
  hindi: {
    title: "कुंडली के लिए जन्म की जानकारी",
    subtitle: "जिसकी कुंडली देखनी है, उसकी जानकारी भरें",
    name: "नाम",
    namePh: "जैसे: सीमा",
    gender: "महिला या पुरुष?",
    female: "महिला",
    male: "पुरुष",
    other: "अन्य",
    date: "जन्म की तारीख",
    day: "दिन",
    month: "महीना",
    year: "साल",
    dateHelp: "अंकों में लिखें, जैसे 6 / 12 / 1994",
    dateBad: "यह तारीख सही नहीं लग रही। दोबारा देखें।",
    time: "जन्म का समय",
    hour: "घंटा",
    minute: "मिनट",
    am: "सुबह (AM)",
    pm: "दोपहर / शाम / रात (PM)",
    timeHelp: "जैसे 2 : 51, फिर नीचे सुबह या शाम चुनें",
    timeBad: "समय सही नहीं लग रहा। घंटा 1 से 12 और मिनट 0 से 59 के बीच लिखें।",
    timeUnknown: "जन्म का समय पता नहीं",
    timeUnknownNote: "कोई बात नहीं। समय के बिना भी कुंडली बनेगी, बस लग्न नहीं निकलेगा।",
    place: "जन्म की जगह (शहर या गाँव)",
    placePh: "जैसे: जयपुर",
    placeHelp: "गाँव हो तो साथ में ज़िला भी लिखें",
    next: "अब यह भरें",
    cancel: "वापस",
    submit: "कुंडली बनाएँ",
    missing: {
      name: "पहले नाम लिखें",
      gender: "महिला या पुरुष चुनें",
      date: "जन्म की तारीख भरें",
      time: "जन्म का समय भरें, या “समय पता नहीं” चुनें",
      place: "जन्म की जगह लिखें",
    },
  },
  english: {
    title: "Birth details for Kundli",
    subtitle: "Fill in the details of the person whose kundli you want",
    name: "Name",
    namePh: "e.g. Seema",
    gender: "Female or male?",
    female: "Female",
    male: "Male",
    other: "Other",
    date: "Date of birth",
    day: "Day",
    month: "Month",
    year: "Year",
    dateHelp: "In numbers, e.g. 6 / 12 / 1994",
    dateBad: "This date does not look right. Please check it.",
    time: "Time of birth",
    hour: "Hour",
    minute: "Minute",
    am: "Morning (AM)",
    pm: "Afternoon / evening / night (PM)",
    timeHelp: "e.g. 2 : 51, then choose AM or PM below",
    timeBad: "This time does not look right. Hour 1-12, minute 0-59.",
    timeUnknown: "I don't know the birth time",
    timeUnknownNote: "That's fine. The kundli is still made, only the lagna cannot be found.",
    place: "Place of birth (city or village)",
    placePh: "e.g. Jaipur",
    placeHelp: "For a village, add the district too",
    next: "Fill this next",
    cancel: "Back",
    submit: "Make my Kundli",
    missing: {
      name: "Enter the name first",
      gender: "Choose female or male",
      date: "Fill in the date of birth",
      time: "Fill in the birth time, or choose “I don't know”",
      place: "Enter the place of birth",
    },
  },
} as const;

const digitsOnly = (value: string, maxLength: number) => value.replace(/\D/g, "").slice(0, maxLength);

const inputClass =
  "h-12 w-full rounded-xl border border-neutral-300 bg-white px-3 text-base text-neutral-900 outline-none placeholder:text-neutral-400 focus:border-violet-600 focus:ring-2 focus:ring-violet-200";

const choiceClass = (selected: boolean) =>
  cn(
    "min-h-12 flex-1 rounded-xl border px-3 py-2 text-base font-medium transition-colors",
    selected
      ? "border-violet-600 bg-violet-600 text-white"
      : "border-neutral-300 bg-white text-neutral-800 active:bg-neutral-100",
  );

/** One numbered question. The first unanswered one is highlighted so it is clear what to fill next. */
function Step({
  number,
  label,
  done,
  active,
  nextLabel,
  children,
}: {
  number: number;
  label: string;
  done: boolean;
  active: boolean;
  nextLabel: string;
  children: ReactNode;
}) {
  return (
    <section
      className={cn(
        "rounded-2xl border p-3 transition-colors",
        active ? "border-violet-500 bg-violet-50 ring-2 ring-violet-200" : "border-neutral-200 bg-white",
      )}
    >
      <div className="mb-2 flex items-center gap-2">
        <span
          className={cn(
            "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
            done
              ? "bg-emerald-600 text-white"
              : active
                ? "bg-violet-600 text-white"
                : "bg-neutral-200 text-neutral-600",
          )}
          aria-hidden
        >
          {done ? "✓" : number}
        </span>
        <span className="text-[15px] font-semibold text-neutral-900">{label}</span>
        {active && (
          <span className="ml-auto rounded-full bg-violet-600 px-2 py-0.5 text-[11px] font-medium text-white">
            {nextLabel}
          </span>
        )}
      </div>
      {children}
    </section>
  );
}

export function KundliBirthDetailsDialog({ open, onSubmit, onCancel, initialValues }: Props) {
  const { currentLanguage } = useChat();
  const copy = COPY[currentLanguage];

  const [name, setName] = useState("");
  const [gender, setGender] = useState("");
  const [day, setDay] = useState("");
  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");
  const [hour, setHour] = useState("");
  const [minute, setMinute] = useState("");
  const [period, setPeriod] = useState<"" | "AM" | "PM">("");
  const [timeUnknown, setTimeUnknown] = useState(false);
  const [place, setPlace] = useState("");
  const [showMissing, setShowMissing] = useState(false);

  const monthRef = useRef<HTMLInputElement>(null);
  const yearRef = useRef<HTMLInputElement>(null);
  const hourRef = useRef<HTMLInputElement>(null);
  const minuteRef = useRef<HTMLInputElement>(null);
  const dayRef = useRef<HTMLInputElement>(null);
  const placeRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const stepRefs = useRef<Partial<Record<StepId, HTMLDivElement | null>>>({});

  // Fill the form with saved details each time it opens (used by "change details").
  useEffect(() => {
    if (!open) return;
    setShowMissing(false);
    setName(initialValues?.name ?? "");
    setGender(initialValues?.gender ?? "");
    setPlace(initialValues?.cityOfBirth ?? "");

    const date = initialValues ? parseBirthDate(initialValues.dateOfBirth) : null;
    setDay(date ? String(date.day) : "");
    setMonth(date ? String(date.month) : "");
    setYear(date ? String(date.year) : "");

    const time = initialValues ? parseBirthTime(initialValues.timeOfBirth) : null;
    setHour(time ? String(time.hour % 12 || 12) : "");
    setMinute(time ? String(time.minute).padStart(2, "0") : "");
    setPeriod(time ? (time.hour >= 12 ? "PM" : "AM") : "");
    setTimeUnknown(!!initialValues && !time);
    // Only when the form opens: typing must not be overwritten by a re-render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // --- Work out the values and which step still needs an answer ---
  const isoDate =
    day && month && year.length === 4
      ? `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`
      : "";
  const parsedDate = isoDate ? parseBirthDate(isoDate) : null;
  const dateValid =
    !!parsedDate &&
    parsedDate.year >= 1900 &&
    new Date(parsedDate.year, parsedDate.month - 1, parsedDate.day) <= new Date();
  const dateEntered = !!day && !!month && year.length === 4;

  const hourNumber = hour === "" ? NaN : Number(hour);
  const minuteNumber = minute === "" ? 0 : Number(minute);
  // 13-23 can only mean afternoon/evening, so AM/PM is not needed for it.
  const is24Hour = hourNumber > 12 && hourNumber <= 23;
  const hourValid = hourNumber >= 0 && hourNumber <= 23;
  const timeEntered = hour !== "" && (is24Hour || hourNumber === 0 || period !== "");
  const timeValid = timeEntered && hourValid && minuteNumber <= 59;
  let time24 = "";
  if (timeValid) {
    const hour24 =
      is24Hour || hourNumber === 0
        ? hourNumber
        : (hourNumber % 12) + (period === "PM" ? 12 : 0);
    time24 = `${String(hour24).padStart(2, "0")}:${String(minuteNumber).padStart(2, "0")}`;
  }

  const done: Record<StepId, boolean> = {
    name: name.trim().length > 0,
    gender: gender !== "",
    date: dateValid,
    time: timeUnknown || timeValid,
    place: place.trim().length > 0,
  };
  const activeStep = STEP_ORDER.find((step) => !done[step]) ?? null;

  const focusStep = (step: StepId) => {
    const target = { name: nameRef, gender: null, date: dayRef, time: hourRef, place: placeRef }[step];
    stepRefs.current[step]?.scrollIntoView({ behavior: "smooth", block: "center" });
    target?.current?.focus({ preventScroll: true });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (activeStep) {
      setShowMissing(true);
      focusStep(activeStep);
      return;
    }
    onSubmit({
      name: name.trim(),
      gender,
      dateOfBirth: isoDate,
      timeOfBirth: timeUnknown ? "" : time24,
      cityOfBirth: place.trim(),
    });
  };

  const numberInput = "h-12 w-full rounded-xl border border-neutral-300 bg-white text-center text-lg text-neutral-900 outline-none placeholder:text-neutral-300 focus:border-violet-600 focus:ring-2 focus:ring-violet-200";

  return (
    <DialogPrimitive.Root open={open} modal>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[60] bg-black/70" />
        <DialogPrimitive.Content
          onPointerDownOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
          onOpenAutoFocus={(e) => {
            // Open on the first unanswered question, not always on the name box.
            e.preventDefault();
            if (!done.name) nameRef.current?.focus();
          }}
          className={cn(
            // Phone: a full-screen sheet sized to the visible area, so the button stays
            // above the keyboard. Wider screens: a centred card.
            "fixed inset-x-0 z-[61] flex flex-col bg-neutral-50",
            "top-[var(--app-top,0px)] h-[var(--app-height,100dvh)]",
            "sm:inset-x-auto sm:left-1/2 sm:top-1/2 sm:h-auto sm:max-h-[90dvh] sm:w-full sm:max-w-md sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl sm:shadow-xl",
          )}
        >
          <div className="shrink-0 bg-violet-700 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] text-white sm:rounded-t-2xl">
            <DialogPrimitive.Title className="text-lg font-semibold leading-snug">
              {copy.title}
            </DialogPrimitive.Title>
            <DialogPrimitive.Description className="mt-0.5 text-sm text-violet-100">
              {copy.subtitle}
            </DialogPrimitive.Description>
          </div>

          <form className="flex min-h-0 flex-1 flex-col" onSubmit={handleSubmit} noValidate>
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-3 py-3">
              <div ref={(el) => { stepRefs.current.name = el; }}>
                <Step number={1} label={copy.name} done={done.name} active={activeStep === "name"} nextLabel={copy.next}>
                  <input
                    ref={nameRef}
                    className={inputClass}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={copy.namePh}
                    autoComplete="off"
                    maxLength={120}
                    enterKeyHint="next"
                    aria-label={copy.name}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        e.currentTarget.blur();
                      }
                    }}
                  />
                </Step>
              </div>

              <div ref={(el) => { stepRefs.current.gender = el; }}>
                <Step number={2} label={copy.gender} done={done.gender} active={activeStep === "gender"} nextLabel={copy.next}>
                  <div className="flex gap-2" role="radiogroup" aria-label={copy.gender}>
                    {(
                      [
                        ["female", copy.female],
                        ["male", copy.male],
                        ["other", copy.other],
                      ] as const
                    ).map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        role="radio"
                        aria-checked={gender === value}
                        className={choiceClass(gender === value)}
                        onClick={() => {
                          setGender(value);
                          if (!dateEntered) dayRef.current?.focus();
                        }}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </Step>
              </div>

              <div ref={(el) => { stepRefs.current.date = el; }}>
                <Step number={3} label={copy.date} done={done.date} active={activeStep === "date"} nextLabel={copy.next}>
                  <div className="flex items-end gap-2">
                    <label className="flex-1">
                      <span className="mb-1 block text-xs text-neutral-600">{copy.day}</span>
                      <input
                        ref={dayRef}
                        className={numberInput}
                        inputMode="numeric"
                        placeholder="6"
                        value={day}
                        onChange={(e) => {
                          const value = digitsOnly(e.target.value, 2);
                          setDay(value);
                          // Two digits, or a first digit that cannot start a longer day (4-9).
                          if (value.length === 2 || Number(value) > 3) monthRef.current?.focus();
                        }}
                      />
                    </label>
                    <span className="pb-3 text-lg text-neutral-400">/</span>
                    <label className="flex-1">
                      <span className="mb-1 block text-xs text-neutral-600">{copy.month}</span>
                      <input
                        ref={monthRef}
                        className={numberInput}
                        inputMode="numeric"
                        placeholder="12"
                        value={month}
                        onChange={(e) => {
                          const value = digitsOnly(e.target.value, 2);
                          setMonth(value);
                          if (value.length === 2 || Number(value) > 1) yearRef.current?.focus();
                        }}
                      />
                    </label>
                    <span className="pb-3 text-lg text-neutral-400">/</span>
                    <label className="flex-[1.5]">
                      <span className="mb-1 block text-xs text-neutral-600">{copy.year}</span>
                      <input
                        ref={yearRef}
                        className={numberInput}
                        inputMode="numeric"
                        placeholder="1994"
                        value={year}
                        onChange={(e) => {
                          const value = digitsOnly(e.target.value, 4);
                          setYear(value);
                          if (value.length === 4 && !timeUnknown && hour === "") hourRef.current?.focus();
                        }}
                      />
                    </label>
                  </div>
                  {dateValid ? (
                    <p className="mt-2 text-sm font-medium text-emerald-700">✓ {formatKundliDob(isoDate, currentLanguage)}</p>
                  ) : dateEntered ? (
                    <p className="mt-2 text-sm text-red-600" role="alert">{copy.dateBad}</p>
                  ) : (
                    <p className="mt-2 text-xs text-neutral-500">{copy.dateHelp}</p>
                  )}
                </Step>
              </div>

              <div ref={(el) => { stepRefs.current.time = el; }}>
                <Step number={4} label={copy.time} done={done.time} active={activeStep === "time"} nextLabel={copy.next}>
                  {!timeUnknown && (
                    <>
                      <div className="flex items-end gap-2">
                        <label className="flex-1">
                          <span className="mb-1 block text-xs text-neutral-600">{copy.hour}</span>
                          <input
                            ref={hourRef}
                            className={numberInput}
                            inputMode="numeric"
                            placeholder="2"
                            value={hour}
                            onChange={(e) => {
                              const value = digitsOnly(e.target.value, 2);
                              setHour(value);
                              if (value.length === 2 || Number(value) > 2) minuteRef.current?.focus();
                            }}
                          />
                        </label>
                        <span className="pb-3 text-lg text-neutral-400">:</span>
                        <label className="flex-1">
                          <span className="mb-1 block text-xs text-neutral-600">{copy.minute}</span>
                          <input
                            ref={minuteRef}
                            className={numberInput}
                            inputMode="numeric"
                            placeholder="51"
                            value={minute}
                            onChange={(e) => setMinute(digitsOnly(e.target.value, 2))}
                          />
                        </label>
                      </div>
                      {!is24Hour && (
                        <div className="mt-2 flex gap-2" role="radiogroup" aria-label="AM / PM">
                          {(
                            [
                              ["AM", copy.am],
                              ["PM", copy.pm],
                            ] as const
                          ).map(([value, label]) => (
                            <button
                              key={value}
                              type="button"
                              role="radio"
                              aria-checked={period === value}
                              className={cn(choiceClass(period === value), "text-sm")}
                              onClick={() => {
                                setPeriod(value);
                                if (!place.trim() && hour !== "") placeRef.current?.focus();
                              }}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                      )}
                      {timeValid ? (
                        <p className="mt-2 text-sm font-medium text-emerald-700">✓ {formatKundliTob(time24, currentLanguage)}</p>
                      ) : timeEntered ? (
                        <p className="mt-2 text-sm text-red-600" role="alert">{copy.timeBad}</p>
                      ) : (
                        <p className="mt-2 text-xs text-neutral-500">{copy.timeHelp}</p>
                      )}
                    </>
                  )}
                  <label className="mt-3 flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-neutral-200 bg-white px-3 py-2">
                    <input
                      type="checkbox"
                      className="h-5 w-5 accent-violet-600"
                      checked={timeUnknown}
                      onChange={(e) => setTimeUnknown(e.target.checked)}
                    />
                    <span className="text-[15px] text-neutral-800">{copy.timeUnknown}</span>
                  </label>
                  {timeUnknown && <p className="mt-2 text-xs text-neutral-600">{copy.timeUnknownNote}</p>}
                </Step>
              </div>

              <div ref={(el) => { stepRefs.current.place = el; }}>
                <Step number={5} label={copy.place} done={done.place} active={activeStep === "place"} nextLabel={copy.next}>
                  <input
                    ref={placeRef}
                    className={inputClass}
                    value={place}
                    onChange={(e) => setPlace(e.target.value)}
                    placeholder={copy.placePh}
                    autoComplete="off"
                    maxLength={200}
                    enterKeyHint="done"
                    aria-label={copy.place}
                  />
                  <p className="mt-2 text-xs text-neutral-500">{copy.placeHelp}</p>
                </Step>
              </div>
            </div>

            <div className="shrink-0 border-t border-neutral-200 bg-white px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 sm:rounded-b-2xl">
              {showMissing && activeStep && (
                <p className="mb-2 text-center text-sm font-medium text-red-600" role="alert">
                  {copy.missing[activeStep]}
                </p>
              )}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onCancel}
                  className="h-12 rounded-xl border border-neutral-300 bg-white px-4 text-base font-medium text-neutral-700 active:bg-neutral-100"
                >
                  {copy.cancel}
                </button>
                <button
                  type="submit"
                  className={cn(
                    "h-12 flex-1 rounded-xl text-base font-semibold text-white transition-colors",
                    activeStep ? "bg-violet-300" : "bg-violet-600 active:bg-violet-700",
                  )}
                >
                  {copy.submit}
                </button>
              </div>
            </div>
          </form>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
