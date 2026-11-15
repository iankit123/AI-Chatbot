import { useRef, useState } from "react";
import { CITY_HINTS, DateSelect, Segmented, TimeSelect } from "@/components/astro/ui";
import { loadSelf, type Gender, type PartnerDetails, type SelfDetails } from "@/lib/astroApi";

/** State for the person's own birth details, pre-filled from the last report they made. */
export function useSelfForm() {
  const saved = useRef(loadSelf()).current;
  const [name, setName] = useState(saved.name ?? "");
  const [gender, setGender] = useState<Gender | "">(saved.gender ?? "");
  const [dob, setDob] = useState(saved.dob ?? "");
  const [tob, setTob] = useState<string | null>(saved.tob ?? null);
  const [place, setPlace] = useState(saved.place ?? "");
  const error = (): string | null => {
    if (name.trim().length < 2) return "Kripya apna naam likhein.";
    if (!gender) return "Kripya apna ling chunein.";
    if (!dob) return "Kripya apni janm tithi (din, mahina, saal) chunein.";
    if (place.trim().length < 2) return "Kripya apna janm sthan likhein.";
    return null;
  };
  const value = (): SelfDetails => ({ name: name.trim(), gender: gender as Gender, dob, tob, place: place.trim() });
  return { name, setName, gender, setGender, dob, setDob, tob, setTob, place, setPlace, error, value };
}
export type SelfForm = ReturnType<typeof useSelfForm>;

export function SelfFields({ form, id }: { form: SelfForm; id: string }) {
  return (
    <div className="space-y-4">
      <div>
        <label className="label" htmlFor={`${id}-name`}>Aapka naam</label>
        <input id={`${id}-name`} className="field" autoComplete="given-name" placeholder="Jaise: Rahul" value={form.name} onChange={(e) => form.setName(e.target.value)} maxLength={60} />
      </div>
      <div>
        <span className="label">Aap</span>
        <Segmented value={form.gender} onChange={form.setGender} options={[{ value: "male", label: "Purush" }, { value: "female", label: "Mahila" }]} />
      </div>
      <div>
        <label className="label" htmlFor={`${id}-dob-day`}>Janm tithi</label>
        <DateSelect idPrefix={`${id}-dob`} value={form.dob} onChange={form.setDob} />
      </div>
      <div>
        <span className="label">Janm samay</span>
        <TimeSelect value={form.tob} onChange={form.setTob} unknownLabel="Janm samay pata nahi" />
      </div>
      <div>
        <label className="label" htmlFor={`${id}-place`}>Janm sthan</label>
        <input id={`${id}-place`} className="field" list="astro-cities" placeholder="Jaise: Lucknow" value={form.place} onChange={(e) => form.setPlace(e.target.value)} maxLength={80} />
        <datalist id="astro-cities">{CITY_HINTS.map((c) => <option key={c} value={c} />)}</datalist>
      </div>
    </div>
  );
}

export function usePartnerForm() {
  const [name, setName] = useState("");
  const [knows, setKnows] = useState<"yes" | "no">("yes");
  const [dob, setDob] = useState("");
  const [tob, setTob] = useState<string | null>(null);
  const [place, setPlace] = useState("");
  const error = (): string | null => {
    if (name.trim().length < 2) return "Kripya unka naam likhein.";
    if (knows === "yes" && !dob) return "Unki janm tithi chunein, ya 'Pata nahi' chunein.";
    return null;
  };
  const value = (): PartnerDetails => {
    const k = knows === "yes";
    return { name: name.trim(), dob: k ? dob : null, tob: k ? tob : null, place: k && place.trim() ? place.trim() : null };
  };
  return { name, setName, knows, setKnows, dob, setDob, tob, setTob, place, setPlace, error, value };
}
export type PartnerForm = ReturnType<typeof usePartnerForm>;

export function PartnerFields({ form, id }: { form: PartnerForm; id: string }) {
  return (
    <div className="space-y-4">
      <div>
        <label className="label" htmlFor={`${id}-pname`}>Unka naam</label>
        <input id={`${id}-pname`} className="field" placeholder="Jaise: Priya" value={form.name} onChange={(e) => form.setName(e.target.value)} maxLength={60} />
      </div>
      <div>
        <span className="label">Unki janm tithi pata hai?</span>
        <Segmented value={form.knows} onChange={form.setKnows} options={[{ value: "yes", label: "Haan, pata hai" }, { value: "no", label: "Pata nahi" }]} />
      </div>
      {form.knows === "yes" ? (
        <>
          <div>
            <label className="label" htmlFor={`${id}-pdob-day`}>Unki janm tithi</label>
            <DateSelect idPrefix={`${id}-pdob`} value={form.dob} onChange={form.setDob} />
          </div>
          <div>
            <span className="label">Unka janm samay <span className="font-normal">(vaikalpik)</span></span>
            <TimeSelect value={form.tob} onChange={form.setTob} unknownLabel="Samay pata nahi" />
          </div>
          <div>
            <label className="label" htmlFor={`${id}-pplace`}>Unka janm sthan <span className="font-normal">(vaikalpik)</span></label>
            <input id={`${id}-pplace`} className="field" list="astro-cities" placeholder="Jaise: Jaipur" value={form.place} onChange={(e) => form.setPlace(e.target.value)} maxLength={80} />
          </div>
        </>
      ) : (
        <p className="ink-soft rounded-xl bg-[#fffaf0] px-3.5 py-3 text-[13px] leading-relaxed ring-1 ring-[#e6d6b6]">
          Koi baat nahi. Unke naam ke pehle akshar se naam-rashi nikalkar dekha jaayega.
        </p>
      )}
    </div>
  );
}
