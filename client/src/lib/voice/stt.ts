export interface STTResult {
  text: string;
  speaker?: string;
  confidence: number;
  timestamp: number;
}

export interface STTService {
  startTranscription(): Promise<void>;
  stopTranscription(): void;
  onTranscript(callback: (result: STTResult) => void): void;
  onInterimResult(callback: (text: string) => void): void;
}

type BrowserRecognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onresult:
    | ((event: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void)
    | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

declare global {
  interface Window {
    SpeechRecognition?: new () => BrowserRecognition;
    webkitSpeechRecognition?: new () => BrowserRecognition;
  }
}

export class WebSpeechSTTService implements STTService {
  private recognition: BrowserRecognition;
  private transcriptCallback?: (result: STTResult) => void;
  private interimCallback?: (text: string) => void;
  private isListening = false;
  private isStopping = false;

  constructor(lang: string) {
    const RecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!RecognitionCtor) {
      throw new Error("Speech recognition is not supported in this browser.");
    }
    this.recognition = new RecognitionCtor();
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = lang;
    this.recognition.maxAlternatives = 1;
    this.bindHandlers();
  }

  private bindHandlers() {
    this.recognition.onstart = () => {
      this.isListening = true;
      this.isStopping = false;
    };

    this.recognition.onresult = (event) => {
      let finalTranscript = "";
      let interimTranscript = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const transcript = event.results[i][0]?.transcript ?? "";
        if (event.results[i].isFinal) finalTranscript += transcript;
        else interimTranscript += transcript;
      }
      const finalText = finalTranscript.trim();
      if (finalText && this.transcriptCallback) {
        this.transcriptCallback({
          text: finalText,
          speaker: "user",
          confidence: 0.8,
          timestamp: Date.now(),
        });
      }
      const interimText = interimTranscript.trim();
      if (interimText && this.interimCallback) {
        this.interimCallback(interimText);
      }
    };

    this.recognition.onerror = () => {
      if (this.isStopping) return;
      this.safeRestart();
    };

    this.recognition.onend = () => {
      this.isListening = false;
      if (this.isStopping) return;
      this.safeRestart();
    };
  }

  private safeRestart() {
    window.setTimeout(() => {
      if (this.isStopping || this.isListening) return;
      try {
        this.recognition.start();
      } catch {
        /* ignore transient restart race */
      }
    }, 120);
  }

  async startTranscription(): Promise<void> {
    this.isStopping = false;
    try {
      this.recognition.stop();
    } catch {
      /* no-op */
    }
    this.recognition.start();
  }

  stopTranscription(): void {
    this.isStopping = true;
    this.isListening = false;
    try {
      this.recognition.stop();
      this.recognition.abort();
    } catch {
      /* no-op */
    }
  }

  onTranscript(callback: (result: STTResult) => void): void {
    this.transcriptCallback = callback;
  }

  onInterimResult(callback: (text: string) => void): void {
    this.interimCallback = callback;
  }
}
