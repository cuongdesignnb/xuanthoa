/** Đọc văn bản tiếng Nhật bằng Web Speech API (nếu trình duyệt hỗ trợ). */
export function speakJa(text: string, rate = 0.9) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  const synth = window.speechSynthesis;
  synth.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "ja-JP";
  u.rate = rate;
  const voice = synth.getVoices().find((v) => v.lang.toLowerCase().startsWith("ja"));
  if (voice) u.voice = voice;
  synth.speak(u);
}
