import { CAREER_SYSTEM_PROMPT } from "./career";
import { DOCTOR_SYSTEM_PROMPT } from "./doctor";
import { FINANCE_SYSTEM_PROMPT } from "./finance";
import { ENGLISH_SYSTEM_PROMPT } from "./english";
import { KRISHNA_SYSTEM_PROMPT } from "./krishna";
import { KUNDLI_SYSTEM_PROMPT } from "./kundli";
import { PARENTING_SYSTEM_PROMPT } from "./parenting";
import { RELATIONSHIP_SYSTEM_PROMPT } from "./relationship";

export type RolePromptId = "doctor" | "kundli" | "parenting" | "finance" | "career" | "krishna" | "english";

export const ROLE_SYSTEM_PROMPTS: Record<RolePromptId, string> = {
  doctor: DOCTOR_SYSTEM_PROMPT,
  kundli: KUNDLI_SYSTEM_PROMPT,
  parenting: PARENTING_SYSTEM_PROMPT,
  finance: FINANCE_SYSTEM_PROMPT,
  career: CAREER_SYSTEM_PROMPT,
  krishna: KRISHNA_SYSTEM_PROMPT,
  english: ENGLISH_SYSTEM_PROMPT,
};

export { RELATIONSHIP_SYSTEM_PROMPT };
export { COMPANION_PERSONALITY_PROMPTS } from "./companions";
export {
  ENGLISH_UI_LANGUAGE_APPENDIX_ENGLISH,
  ENGLISH_UI_LANGUAGE_APPENDIX_HINDI,
} from "./english";
