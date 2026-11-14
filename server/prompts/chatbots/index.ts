import { CAREER_SYSTEM_PROMPT } from "./career";
import { DOCTOR_SYSTEM_PROMPT } from "./doctor";
import { FINANCE_SYSTEM_PROMPT } from "./finance";
import { ENGLISH_SYSTEM_PROMPT } from "./english";
import { KRISHNA_SYSTEM_PROMPT } from "./krishna";
import { KUNDLI_SYSTEM_PROMPT } from "./kundli";
import { PARENTING_SYSTEM_PROMPT } from "./parenting";
import { RELATIONSHIP_ADVICE_SYSTEM_PROMPT } from "./relationshipAdvice";
import {
  buildRelationshipSystemPrompt as buildRelationshipCorePrompt,
  type RelationshipPromptNames,
} from "./relationship";
import { SELF_HARM_PROMPT_RULE } from "@shared/crisisSupport";

import { SIMPLE_ANSWER_STYLE } from "./answerStyle";

/** Every prompt ends with the self-harm safety rule. */
const withSafetyRule = (prompt: string) => `${prompt}\n\n${SELF_HARM_PROMPT_RULE}`;

/** Advice chats: role prompt, then the shared short-and-simple answer style, then safety. */
const adviceChat = (prompt: string) => withSafetyRule(`${prompt}\n${SIMPLE_ANSWER_STYLE}`);

export type RolePromptId =
  | "doctor"
  | "kundli"
  | "parenting"
  | "finance"
  | "career"
  | "krishna"
  | "english"
  | "relationship-advice";

export const ROLE_SYSTEM_PROMPTS: Record<RolePromptId, string> = {
  doctor: adviceChat(DOCTOR_SYSTEM_PROMPT),
  kundli: adviceChat(KUNDLI_SYSTEM_PROMPT),
  parenting: adviceChat(PARENTING_SYSTEM_PROMPT),
  finance: adviceChat(FINANCE_SYSTEM_PROMPT),
  career: adviceChat(CAREER_SYSTEM_PROMPT),
  krishna: adviceChat(KRISHNA_SYSTEM_PROMPT),
  english: withSafetyRule(ENGLISH_SYSTEM_PROMPT),
  "relationship-advice": adviceChat(RELATIONSHIP_ADVICE_SYSTEM_PROMPT),
};

export function buildRelationshipSystemPrompt(names: RelationshipPromptNames = {}): string {
  return withSafetyRule(buildRelationshipCorePrompt(names));
}

export {
  RELATIONSHIP_SYSTEM_PROMPT,
  RELATIONSHIP_HINDI_STYLE_APPENDIX,
  type RelationshipPromptNames,
} from "./relationship";
export { adviceReplyReminder, detectReplyLanguage, replyLanguageInstruction } from "./answerStyle";
export { COMPANION_PERSONALITY_PROMPTS, companionDisplayName } from "./companions";
export {
  ENGLISH_UI_LANGUAGE_APPENDIX_ENGLISH,
  ENGLISH_UI_LANGUAGE_APPENDIX_HINDI,
} from "./english";
