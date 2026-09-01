/**
 * Follow-up questions keep a guidance chat going.
 *
 * The model appends one short, answerable question after its reply, separated by
 * FOLLOW_UP_MARKER. We split it off here so the client can show it as its own
 * chat bubble a moment later, the way a real person sends a second message.
 */

export const FOLLOW_UP_MARKER = "[[FOLLOWUP]]";

/** Roles whose replies get a follow-up question bubble. */
const FOLLOW_UP_ROLES = new Set(["krishna"]);

export function roleSupportsFollowUpQuestion(companionId?: string | null): boolean {
  return !!companionId && FOLLOW_UP_ROLES.has(companionId);
}

/**
 * Matches the marker the model was asked for, plus the shapes it drifts into:
 * `[FOLLOWUP]`, `**[[Follow-up]]**`, `Follow up question:`.
 */
const MARKER_PATTERN =
  /(?:^|\n)[ \t]*[*_`>]*[ \t]*(?:\[{1,2}[ \t]*follow[ _-]?up(?:[ \t]+question)?[ \t]*\]{1,2}|follow[ _-]?up(?:[ \t]+question)?[ \t]*:)[ \t]*[*_`]*[ \t]*:?[ \t]*/i;

/** Same shapes, for scrubbing every leftover occurrence. */
const MARKER_PATTERN_GLOBAL = new RegExp(MARKER_PATTERN.source, "gi");

const MAX_FOLLOW_UP_LENGTH = 240;
const MIN_FOLLOW_UP_LENGTH = 5;

export interface SplitReply {
  /** The main reply, with any follow-up marker removed. */
  content: string;
  /** The question to send as a separate message, or null when there is none. */
  followUpQuestion: string | null;
}

interface SplitOptions {
  /**
   * When the model forgets the marker, still peel a trailing question off the
   * reply so the user gets something to answer. Only for roles that opt in.
   */
  allowTrailingQuestionFallback?: boolean;
}

/** Strip stray emphasis/quote wrappers the model puts around the question. */
function cleanQuestion(line: string): string {
  return line
    .replace(/^[\s*_`"'“”‘’-]+/, "")
    .replace(/[\s*_`"'“”‘’]+$/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isUsableQuestion(question: string, content: string): boolean {
  if (question.length < MIN_FOLLOW_UP_LENGTH || question.length > MAX_FOLLOW_UP_LENGTH) {
    return false;
  }
  // A question identical to the reply would just duplicate the bubble.
  return question.toLowerCase() !== content.trim().toLowerCase();
}

/** Peel the last sentence off when it is a question and something precedes it. */
function trailingQuestion(content: string): SplitReply | null {
  const trimmed = content.trim();
  if (!trimmed.endsWith("?")) return null;

  const body = trimmed.slice(0, -1);
  const boundary = Math.max(
    body.lastIndexOf("."),
    body.lastIndexOf("!"),
    body.lastIndexOf("?"),
    body.lastIndexOf("।"), // danda
    body.lastIndexOf("\n"),
  );
  if (boundary <= 0) return null;

  const head = trimmed.slice(0, boundary + 1).trim();
  const question = cleanQuestion(trimmed.slice(boundary + 1));
  if (!head || !isUsableQuestion(question, head)) return null;

  return { content: head, followUpQuestion: question };
}

/**
 * Split a raw model reply into the main message and an optional follow-up
 * question. The marker is always stripped, even for roles that did not ask for
 * a follow-up, so it can never leak into a chat bubble.
 */
export function splitFollowUpQuestion(raw: string, options: SplitOptions = {}): SplitReply {
  const text = (raw ?? "").trim();
  if (!text) return { content: text, followUpQuestion: null };

  const match = MARKER_PATTERN.exec(text);
  if (match) {
    const content = text.slice(0, match.index).trim();
    const rest = text.slice(match.index + match[0].length);
    // The question may sit on the marker line or on the line below it.
    const firstLine = rest.split("\n").map((line) => line.trim()).find(Boolean) ?? "";
    const question = cleanQuestion(firstLine);

    if (content && isUsableQuestion(question, content)) {
      return { content, followUpQuestion: question };
    }
    // Unusable tail (empty, a paragraph rather than a question, or no main reply
    // before it): drop the marker but keep the words the model wrote.
    const merged = [content, cleanQuestion(rest.replace(MARKER_PATTERN_GLOBAL, " "))]
      .filter(Boolean)
      .join("\n\n")
      .trim();
    return {
      content: merged || text.replace(MARKER_PATTERN_GLOBAL, " ").trim(),
      followUpQuestion: null,
    };
  }

  if (options.allowTrailingQuestionFallback) {
    const fallback = trailingQuestion(text);
    if (fallback) return fallback;
  }

  return { content: text, followUpQuestion: null };
}
