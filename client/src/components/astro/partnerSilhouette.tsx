/**
 * Placeholder portrait shown blurred behind the lock. Drawn with photo-like colours (skin, hair,
 * outfit, soft background lights) so that under blur it reads as a real picture of a woman or a man.
 */
export function PartnerSilhouette({ className = "", variant = "woman" }: { className?: string; variant?: "woman" | "man" }) {
  const woman = variant === "woman";
  return (
    <svg viewBox="0 0 200 240" className={className} preserveAspectRatio="xMidYMid slice" aria-hidden>
      <defs>
        <radialGradient id={`ps-bg-${variant}`} cx="0.5" cy="0.35" r="0.9">
          <stop offset="0" stopColor={woman ? "#f7dcc0" : "#e6dccb"} />
          <stop offset="0.6" stopColor={woman ? "#d9a98a" : "#b9ab95"} />
          <stop offset="1" stopColor={woman ? "#8c5a55" : "#6f6558"} />
        </radialGradient>
        <linearGradient id={`ps-skin-${variant}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={woman ? "#f0c8a4" : "#d9a57c"} />
          <stop offset="1" stopColor={woman ? "#d79f78" : "#b98058"} />
        </linearGradient>
        <linearGradient id="ps-hair" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#3a2218" />
          <stop offset="1" stopColor="#120a08" />
        </linearGradient>
        <linearGradient id={`ps-dress-${variant}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={woman ? "#c2264f" : "#f1e6cf"} />
          <stop offset="1" stopColor={woman ? "#7d1436" : "#cdbb97"} />
        </linearGradient>
      </defs>
      <rect width="200" height="240" fill={`url(#ps-bg-${variant})`} />
      {/* soft background lights */}
      <circle cx="30" cy="46" r="20" fill="#fff3d6" opacity="0.55" />
      <circle cx="172" cy="70" r="15" fill="#ffe2b0" opacity="0.5" />
      <circle cx="160" cy="24" r="9" fill="#fff" opacity="0.45" />
      {woman ? (
        <>
          {/* long open hair falling behind the shoulders */}
          <path d="M100 26c-40 0-58 28-58 66 0 36-8 70-22 104 20 10 44 8 58-4h44c14 12 38 14 58 4-14-34-22-68-22-104 0-38-18-66-58-66z" fill="url(#ps-hair)" />
          {/* neck and shoulders */}
          <path d="M86 132h28v30H86z" fill={`url(#ps-skin-${variant})`} />
          <path d="M18 240c2-46 34-74 82-74s80 28 82 74z" fill={`url(#ps-dress-${variant})`} />
          <path d="M76 168c8 12 40 12 48 0l-6-8H82z" fill={`url(#ps-skin-${variant})`} />
          {/* dupatta with gold border over one shoulder */}
          <path d="M112 170c30 4 58 26 66 70h-34c-4-30-16-52-32-70z" fill="#e9638a" opacity="0.9" />
          <path d="M112 170c16 18 28 40 32 70" stroke="#f3cf7a" strokeWidth="5" fill="none" />
          {/* face */}
          <ellipse cx="100" cy="94" rx="33" ry="42" fill={`url(#ps-skin-${variant})`} />
          {/* centre-parted hair framing the face */}
          <path d="M100 44c-26 0-42 18-42 48 0 10 1 20 4 30 2-30 14-52 38-62 24 10 36 32 38 62 3-10 4-20 4-30 0-30-16-48-42-48z" fill="url(#ps-hair)" />
          {/* eyes, brows, lips, bindi, earrings, necklace */}
          <ellipse cx="86" cy="94" rx="6" ry="3" fill="#2a1712" />
          <ellipse cx="114" cy="94" rx="6" ry="3" fill="#2a1712" />
          <path d="M77 86q9-5 17 0M106 86q9-5 17 0" stroke="#2a1712" strokeWidth="2" fill="none" />
          <path d="M90 116q10 7 20 0q-10 3-20 0z" fill="#b8324f" />
          <circle cx="100" cy="78" r="2.4" fill="#c2183f" />
          <circle cx="66" cy="108" r="4" fill="#f3cf7a" />
          <circle cx="134" cy="108" r="4" fill="#f3cf7a" />
          <path d="M82 160q18 14 36 0" stroke="#f3cf7a" strokeWidth="3" fill="none" />
        </>
      ) : (
        <>
          <path d="M86 132h28v30H86z" fill={`url(#ps-skin-${variant})`} />
          <path d="M14 240c2-48 36-76 86-76s84 28 86 76z" fill={`url(#ps-dress-${variant})`} />
          <path d="M84 164l16 22 16-22z" fill={`url(#ps-skin-${variant})`} />
          <path d="M100 186v54" stroke="#a8946a" strokeWidth="3" />
          <ellipse cx="100" cy="94" rx="34" ry="42" fill={`url(#ps-skin-${variant})`} />
          {/* short hair and a light beard shadow */}
          <path d="M64 92c-4-34 12-54 36-54s42 18 37 54c-4-16-10-26-18-30-14 6-34 6-44 0-6 6-9 16-11 30z" fill="url(#ps-hair)" />
          <path d="M70 108c4 20 16 30 30 30s26-10 30-30c-6 12-16 18-30 18s-24-6-30-18z" fill="#3a2218" opacity="0.35" />
          <ellipse cx="86" cy="94" rx="5.5" ry="2.8" fill="#2a1712" />
          <ellipse cx="114" cy="94" rx="5.5" ry="2.8" fill="#2a1712" />
          <path d="M76 85q10-5 19 0M105 85q9-5 19 0" stroke="#2a1712" strokeWidth="3" fill="none" />
          <path d="M90 117q10 5 20 0" stroke="#8a4a3a" strokeWidth="3" fill="none" />
        </>
      )}
    </svg>
  );
}
