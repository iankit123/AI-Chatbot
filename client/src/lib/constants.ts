export const WELCOME_MESSAGE_HINDI = "Hi";
export const WELCOME_MESSAGE_ENGLISH = "Hi";

export const LANGUAGE_OPTIONS = {
  HINDI: 'hindi',
  ENGLISH: 'english'
} as const;

/** Voice tab — premium activation amount shown in UI and logged to payment_attempts */
export const VOICE_CHAT_ACTIVATION_RUPEES = 29;

export type RoleType = 'doctor' | 'kundli' | 'parenting' | 'finance' | 'career' | 'relationship' | 'krishna' | 'english';

// Role-specific suggestion prompts
export const ROLE_SUGGESTIONS: Record<RoleType, string[]> = {
  doctor: [
    "Mere sar ke left side me dard hai, kya karu?",
    "Mujhe cold aur cough ho raha hai, kuchh upay bataiye",
    "Mera BP high hai, diet me kya changes karu?",
    "Exercise karne ke baad body me pain hota hai"
  ],
  kundli: [
    "Mai 2-Dec-1992 me born hua tha, mera future bataiye",
    "Mera career kaisa rahega?",
    "Meri shadi kab hogi?",
    "Mere health ke bare me kuchh bataiye"
  ],
  parenting: [
    "Baby ko kaise sleep train karu?",
    "6 months ke baby ke liye kya food de sakte hain?",
    "Baby ko fever hai, kya karu?",
    "Baby ka weight gain nahi ho raha"
  ],
  finance: [
    "Mujhe savings kaise karni chahiye?",
    "Investment ke liye kya options hain?",
    "Credit card debt kaise manage karu?",
    "Emergency fund kitna hona chahiye?"
  ],
  career: [
    "Resume kaise improve karu?",
    "Interview me kaise prepare karu?",
    "Career change kaise karu?",
    "Salary negotiation kaise karein?"
  ],
  relationship: [],
  krishna: [
    "Mujhe life me clarity chahiye",
    "Stress me shaant kaise rahu?",
    "Gita se ek practical advice do",
    "Apne karm par focus kaise karu?"
  ],
  english: [],
};
