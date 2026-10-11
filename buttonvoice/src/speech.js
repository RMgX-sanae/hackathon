export function createSpeech(onStatus) {
  const synthesis = window.speechSynthesis;
  let voices = [];
  let sequence = 0;
  let current = null;
  let timeout;

  function loadVoices() {
    voices = synthesis?.getVoices().filter(voice => voice.localService && /^zh(?:-|_)/i.test(voice.lang)) || [];
    onStatus(voices.length ? '本地中文语音可用' : '本地中文音色不可用，文字对比仍可使用。');
  }
  function cancel() {
    sequence++;
    clearTimeout(timeout);
    if (current) current.onend = current.onerror = current.onstart = null;
    current = null;
    synthesis?.cancel();
  }
  function speak(text) {
    cancel();
    loadVoices();
    if (!synthesis || !window.SpeechSynthesisUtterance || !voices.length) return false;
    const token = sequence;
    const utterance = new SpeechSynthesisUtterance(text);
    current = utterance;
    utterance.voice = voices.find(voice => /^zh[-_]CN$/i.test(voice.lang)) || voices[0];
    utterance.lang = utterance.voice.lang;
    utterance.rate = 0.9;
    utterance.onstart = () => {
      if (token !== sequence) return;
      clearTimeout(timeout);
      onStatus(`正在播放：${text}`);
    };
    utterance.onend = () => {
      if (token !== sequence) return;
      clearTimeout(timeout);
      current = null;
      onStatus('播放结束。可再次试听。');
    };
    utterance.onerror = () => {
      if (token !== sequence) return;
      cancel();
      onStatus('本地语音暂不可用，请查看文字对比。');
    };
    timeout = setTimeout(() => {
      if (token !== sequence) return;
      cancel();
      onStatus('语音未能启动，文字对比与修复功能仍可使用。');
    }, 3500);
    try { synthesis.speak(utterance); }
    catch {
      cancel();
      onStatus('浏览器暂不支持语音播放，请阅读文字对比。');
      return false;
    }
    return true;
  }
  synthesis?.addEventListener('voiceschanged', loadVoices);
  loadVoices();
  function dispose() { cancel(); synthesis?.removeEventListener('voiceschanged', loadVoices); }
  return { speak, cancel, refresh: loadVoices, dispose };
}
