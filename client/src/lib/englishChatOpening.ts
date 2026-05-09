/** Opening assistant HTML for Learn English chat — Hindi-led drills + evaluate learner replies. */
export function getEnglishChatOpeningHtml(language: "hindi" | "english"): string {
  if (language === "english") {
    return `
<p>Let&apos;s learn how to chat in English today.</p>
<p><strong>First cue</strong> (think in Hindi: &quot;Mera naam Rajesh hai.&quot;) — how would you say that in English? Type your sentence below; I&apos;ll tell you if it&apos;s correct and what to improve.</p>
<p><strong>Next</strong> we&apos;ll practise questions like asking someone&apos;s name (&quot;Aapka naam kya hai?&quot; → English).</p>
`.trim();
  }

  return `
<p>चलिए आज हम सीखते हैं <strong>अंग्रेज़ी में चैट करना</strong>।</p>
<p><strong>पहला कदम:</strong> हिंदी में हम कहते हैं — <strong>«मेरा नाम राजेश है।»</strong></p>
<p><strong>आप बताइए:</strong> इस वाक्य को अंग्रेज़ी में <strong>कैसे बोलेंगे</strong>? नीचे लिखें — मैं देख लूँगी कि सही है या थोड़ी सुधार चाहिए।</p>
<p>फिर सीखेंगे: अगर आपको किसी से पूछना हो <strong>«आपका नाम क्या है?»</strong>, तो अंग्रेज़ी में कैसे पूछेंगे — ऐसी ही छोटी-छोटी प्रैक्टिस करते रहेंगे।</p>
`.trim();
}
