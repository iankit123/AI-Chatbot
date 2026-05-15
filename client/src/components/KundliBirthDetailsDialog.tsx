import * as DialogPrimitive from "@radix-ui/react-dialog";
import { useEffect, useState } from "react";
import type { StoredKundliBirthDetails } from "@/lib/kundliBirthStorage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useChat } from "@/context/ChatContext";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export type KundliBirthFormPayload = {
  name: string;
  gender: string;
  dateOfBirth: string;
  timeOfBirth: string;
  cityOfBirth: string;
};

type Props = {
  open: boolean;
  onSubmit: (data: KundliBirthFormPayload) => void;
  onCancel: () => void;
  initialValues?: StoredKundliBirthDetails | null;
};

const nativeSelectClass =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

export function KundliBirthDetailsDialog({
  open,
  onSubmit,
  onCancel,
  initialValues,
}: Props) {
  const { currentLanguage } = useChat();
  const { toast } = useToast();
  const [gender, setGender] = useState(initialValues?.gender ?? "");
  const [name, setName] = useState(initialValues?.name ?? "");
  const [dateOfBirth, setDateOfBirth] = useState(initialValues?.dateOfBirth ?? "");
  const [timeOfBirth, setTimeOfBirth] = useState(initialValues?.timeOfBirth ?? "");
  const [cityOfBirth, setCityOfBirth] = useState(initialValues?.cityOfBirth ?? "");

  useEffect(() => {
    if (!open || !initialValues) return;
    setGender(initialValues.gender);
    setName(initialValues.name);
    setDateOfBirth(initialValues.dateOfBirth);
    setTimeOfBirth(initialValues.timeOfBirth);
    setCityOfBirth(initialValues.cityOfBirth);
  }, [open, initialValues]);

  const handleForm = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const name = String(fd.get("name") ?? "").trim();
    const dateOfBirth = String(fd.get("dateOfBirth") ?? "");
    const timeOfBirth = String(fd.get("timeOfBirth") ?? "");
    const cityOfBirth = String(fd.get("cityOfBirth") ?? "").trim();

    if (!gender) {
      toast({
        variant: "destructive",
        title: currentLanguage === "hindi" ? "लिंग चुनें" : "Select gender",
        description:
          currentLanguage === "hindi"
            ? "कृपया ड्रॉपडाउन से लिंग चुनें।"
            : "Please choose an option from the gender dropdown.",
      });
      return;
    }

    if (!name || !dateOfBirth || !timeOfBirth || !cityOfBirth) {
      toast({
        variant: "destructive",
        title: currentLanguage === "hindi" ? "सभी फ़ील्ड भरें" : "Fill all fields",
        description:
          currentLanguage === "hindi"
            ? "कृपया नाम, जन्म तिथि, समय और स्थान भरें।"
            : "Please complete name, date of birth, time, and place.",
      });
      return;
    }

    onSubmit({ name, gender, dateOfBirth, timeOfBirth, cityOfBirth });
  };

  const copy =
    currentLanguage === "hindi"
      ? {
          title: "कुंडली के लिए विवरण",
          subtitle: "सटीक जानकारी भरें",
          name: "नाम",
          gender: "लिंग",
          male: "पुरुष",
          female: "महिला",
          other: "अन्य",
          dob: "जन्म तिथि",
          tob: "जन्म समय",
          pob: "जन्म स्थान (शहर)",
          cancel: "रद्द करें",
          submit: "चैट शुरू करें",
          genderPh: "चुनें",
        }
      : {
          title: "Details for Kundli",
          subtitle: "Enter your birth details",
          name: "Name",
          gender: "Gender",
          male: "Male",
          female: "Female",
          other: "Other",
          dob: "Date of birth",
          tob: "Time of birth",
          pob: "City / place of birth",
          cancel: "Cancel",
          submit: "Start chat",
          genderPh: "Select",
        };

  return (
    <DialogPrimitive.Root open={open} modal>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[60] bg-black/70 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          onPointerDownOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
          className={cn(
            "fixed left-[50%] top-[50%] z-[61] w-[calc(100vw-1.5rem)] max-w-md translate-x-[-50%] translate-y-[-50%]",
            "rounded-2xl border border-neutral-200 bg-white p-4 shadow-xl duration-200 sm:p-5",
            "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 max-h-[90vh] overflow-y-auto",
          )}
        >
          <div className="mb-3 text-center">
            <DialogPrimitive.Title className="text-base font-semibold leading-snug text-neutral-900">
              {copy.title}
            </DialogPrimitive.Title>
            <DialogPrimitive.Description className="mt-0.5 text-xs text-neutral-600">
              {copy.subtitle}
            </DialogPrimitive.Description>
          </div>

          <form className="space-y-3" onSubmit={handleForm}>
            <div className="space-y-1.5">
              <Label htmlFor="kundli-name">{copy.name}</Label>
              <Input
                id="kundli-name"
                name="name"
                autoComplete="name"
                required
                maxLength={120}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="kundli-gender">{copy.gender}</Label>
              <select
                id="kundli-gender"
                name="gender"
                value={gender}
                onChange={(ev) => setGender(ev.target.value)}
                className={nativeSelectClass}
                aria-label={copy.gender}
              >
                <option value="">{copy.genderPh}</option>
                <option value="male">{copy.male}</option>
                <option value="female">{copy.female}</option>
                <option value="other">{copy.other}</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="kundli-dob">{copy.dob}</Label>
              <Input
                id="kundli-dob"
                name="dateOfBirth"
                type="date"
                required
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="kundli-tob">{copy.tob}</Label>
              <Input
                id="kundli-tob"
                name="timeOfBirth"
                type="time"
                required
                step={60}
                value={timeOfBirth}
                onChange={(e) => setTimeOfBirth(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="kundli-pob">{copy.pob}</Label>
              <Input
                id="kundli-pob"
                name="cityOfBirth"
                autoComplete="address-level2"
                required
                maxLength={200}
                value={cityOfBirth}
                onChange={(e) => setCityOfBirth(e.target.value)}
                placeholder={currentLanguage === "hindi" ? "जैसे: जयपुर, राजस्थान" : "e.g. Jaipur, Rajasthan"}
              />
            </div>

            <div className="flex gap-2 pt-1">
              <Button type="button" variant="outline" className="flex-1" onClick={onCancel}>
                {copy.cancel}
              </Button>
              <Button type="submit" className="flex-1 bg-violet-600 hover:bg-violet-700">
                {copy.submit}
              </Button>
            </div>
          </form>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
