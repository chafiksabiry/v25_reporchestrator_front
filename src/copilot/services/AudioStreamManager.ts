export class AudioStreamManager {
  private ws: WebSocket | null = null;
  private audioContext: AudioContext | null = null;
  private gainNode: GainNode | null = null;

  private isConnected: boolean = false;
  private onErrorCallback: ((error: Error) => void) | null = null;

  // Jitter buffer / queue (Float32Array chunks)
  private chunkQueue: Float32Array[] = [];
  private readonly START_THRESHOLD = 3; // combien de chunks accumuler avant de démarrer
  private readonly MAX_QUEUE = 60; // maximum chunks à stocker (drop oldest si >)
  private readonly SAMPLE_RATE = 8000; // Telnyx envoie en 8kHz
  private playbackTime = 0; // temps (AudioContext.currentTime) planifié pour le prochain chunk

  // sécurité
  private isPlaying = false;
  private isStopping = false;

  constructor(onError?: (error: Error) => void) {
    this.onErrorCallback = onError || null;
  }

  // --- Connexion WebSocket ---
  async connect(streamUrl: string) {
    try {
      console.log('🎤 Connecting to audio stream:', streamUrl);
      // create ws
      this.ws = new WebSocket(streamUrl);
      this.ws.binaryType = 'arraybuffer'; // on s'attend à des ArrayBuffers si envoyés bruts

      this.ws.onopen = () => {
        console.log('🎤 WebSocket connected for audio streaming');
        this.isConnected = true;
      };

      this.ws.onmessage = async (event) => {
        try {
          // Telnyx envoie généralement du JSON contenant base64 payload
          // mais parfois on peut recevoir directement ArrayBuffer. Gérer les deux cas.
          if (typeof event.data === 'string') {
            const message = JSON.parse(event.data);
            this.handleMessage(message);
          } else {
            // si c'est déjà un buffer binaire (rare), on le joue directement en supposant PCMU bytes
            const ab = event.data as ArrayBuffer;
            const u8 = new Uint8Array(ab);
            const float32 = this.convertFromPCMU(u8);
            this.enqueueChunk(float32);
          }
        } catch (err) {
          console.error('❌ Error processing ws message:', err);
          this.onErrorCallback?.(err as Error);
        }
      };

      this.ws.onclose = () => {
        console.log('🎤 Audio WebSocket closed');
        this.isConnected = false;
      };

      this.ws.onerror = (err) => {
        console.error('🎤 Audio WebSocket error', err);
        this.isConnected = false;
        this.onErrorCallback?.(new Error('Audio WebSocket error'));
      };
    } catch (error) {
      console.error('❌ Error setting up audio stream:', error);
      this.onErrorCallback?.(error as Error);
      throw error;
    }
  }

  // --- Gérer messages JSON typiques de Telnyx ---
  private handleMessage(message: any) {
    if (!message || typeof message !== 'object') return;

    const ev = message.event;
    switch (ev) {
      case 'connected':
        console.log('🎧 Connected to audio stream with config:', message.config);
        break;
      case 'start':
        console.log('▶️ Stream started:', message.stream_id);
        break;
      case 'media':
        // message.media.payload est base64
        if (message.media && message.media.payload) {
          // Certains providers envoient `payload` base64; d'autres envoient hex/array — ici on gère base64
          const base64 = message.media.payload;
          const u8 = this.base64ToUint8Array(base64);
          const float32 = this.convertFromPCMU(u8);
          this.enqueueChunk(float32);
        }
        break;
      case 'stop':
        console.log('⏹️ Stream stopped:', message.stream_id);
        this.stopAndClear();
        break;
      case 'error':
        console.error('🎤 Stream error:', message);
        this.onErrorCallback?.(new Error(message.payload?.detail || 'Stream error'));
        break;
      default:
        // ignore or treat other events
        break;
    }
  }

  // --- Utilitaires base64 -> Uint8Array ---
  private base64ToUint8Array(base64: string): Uint8Array {
    // atob pour convertir base64 en binaire string; ensuite map to bytes
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) bytes[i] = binaryString.charCodeAt(i);
    return bytes;
  }

  // --- µ-law (G.711) décodage correct ---
  // Retourne Int16 amplitude (-32768..32767)
  private decodeMuLawByte(muLawByte: number): number {
    // Standard ITU-T G.711 µ-law decoding
    let mu = ~muLawByte & 0xff;
    const sign = (mu & 0x80) ? -1 : 1;
    const exponent = (mu >> 4) & 0x07;
    const mantissa = mu & 0x0f;
    let magnitude = ((mantissa << 3) + 0x84) << (exponent);
    // magnitude is biased; adjust as standard describes
    const sample = sign * (magnitude - 0x84);
    // clamp to Int16
    return sample < -32768 ? -32768 : sample > 32767 ? 32767 : sample;
  }

  // Convertit Uint8Array PCMU -> Float32Array (valeurs dans [-1, 1])
  private convertFromPCMU(pcmuData: Uint8Array): Float32Array {
    const out = new Float32Array(pcmuData.length);
    for (let i = 0; i < pcmuData.length; i++) {
      const s16 = this.decodeMuLawByte(pcmuData[i]);
      out[i] = s16 / 32768; // normaliser
    }
    return out;
  }

  // --- Queue / Jitter buffer management ---
  private enqueueChunk(float32: Float32Array) {
    // Safety: drop if stopping
    if (this.isStopping) return;

    this.chunkQueue.push(float32);

    // Drop oldest if overflow
    if (this.chunkQueue.length > this.MAX_QUEUE) {
      this.chunkQueue.shift();
      console.warn('⚠️ chunkQueue overflow — dropping oldest chunk');
    }

    // If we have enough to start, start processing
    if (!this.isPlaying && this.chunkQueue.length >= this.START_THRESHOLD) {
      this.ensureAudioContext();
      this.startProcessingQueue();
    }
  }

  // --- Assurer creation et état AudioContext et nodes ---
  private ensureAudioContext() {
    if (!this.audioContext || this.audioContext.state === 'closed') {
      // Si le navigateur exige une interaction utilisateur pour démarrer audio,
      // l'appelant devra appeler resumeAudio() après un click.
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: this.SAMPLE_RATE
      });
      this.gainNode = this.audioContext.createGain();
      // Ajuster le gain si nécessaire (prévenir saturation)
      this.gainNode.gain.value = 0.95;
      this.gainNode.connect(this.audioContext.destination);
      this.playbackTime = this.audioContext.currentTime;
      console.log('🔊 AudioContext initialisé (sampleRate:', this.SAMPLE_RATE, ')');
    }
  }

  // Méthode publique pour reprendre l'AudioContext après interaction utilisateur
  async resumeAudio() {
    try {
      if (!this.audioContext) this.ensureAudioContext();
      if (this.audioContext && this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
        console.log('▶️ AudioContext resumed by user gesture');
      }
    } catch (err) {
      console.warn('Failed to resume AudioContext:', err);
    }
  }

  // --- Scheduling & playback (lecture en flux planifiée) ---
  private startProcessingQueue() {
    if (!this.audioContext) this.ensureAudioContext();
    if (!this.audioContext) return;
    if (this.isPlaying) return;

    this.isPlaying = true;
    // Si playbackTime < currentTime on la remet un peu en avant
    if (this.playbackTime < this.audioContext.currentTime) {
      this.playbackTime = this.audioContext.currentTime + 0.05; // 50ms headroom
    }

    // Processer la queue en "batch" non-blocant : on schedule tant qu'il y a des chunks
    const process = () => {
      if (!this.audioContext) return;
      if (this.chunkQueue.length === 0) {
        // pas de données -> on arrête la boucle de scheduling ; on remet isPlaying à false
        this.isPlaying = false;
        return;
      }

      // prendre un chunk et le schedule immédiatement à playbackTime
      const chunk = this.chunkQueue.shift()!;
      this.scheduleChunk(chunk);

      // Boucle non bloquante : on utilise setTimeout pour relancer rapidement
      // Le délai peut être très court car scheduling est asynchrone et non-blocking
      setTimeout(process, 0);
    };

    process();
  }

  private scheduleChunk(float32: Float32Array) {
    if (!this.audioContext || !this.gainNode) return;

    // Créer un AudioBuffer avec la longueur exacte
    const buffer = this.audioContext.createBuffer(1, float32.length, this.SAMPLE_RATE);
    buffer.getChannelData(0).set(float32);

    const src = this.audioContext.createBufferSource();
    src.buffer = buffer;
    src.connect(this.gainNode);

    // Assurer playbackTime minimal devant currentTime pour éviter start in past
    const now = this.audioContext.currentTime;
    if (this.playbackTime < now + 0.02) { // 20ms de marge
      this.playbackTime = now + 0.02;
    }

    try {
      src.start(this.playbackTime);
    } catch (err) {
      // si start échoue (start in the past), jouer immédiatement
      try {
        src.start();
        console.warn('⚠️ start failed with playbackTime, started immediately');
      } catch (e) {
        console.error('❌ Failed to start audio source', e);
      }
    }

    // Mettre à jour playbackTime : durée du buffer = N / sampleRate (en secondes)
    const duration = buffer.length / this.SAMPLE_RATE;
    this.playbackTime += duration;

    // Clean up node après lecture (optionnel)
    src.onended = () => {
      try { src.disconnect(); } catch (_) {}
    };
  }

  // --- Stop & clear (appelé à la fin ou sur stop event) ---
  private stopAndClear() {
    this.isStopping = true;
    // vider queue
    this.chunkQueue = [];
    this.isPlaying = false;
    this.playbackTime = 0;

    // close audioContext but keep reference nullified after close
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close().catch((e) => {
        console.warn('Error closing AudioContext', e);
      }).finally(() => {
        this.audioContext = null;
        this.gainNode = null;
      });
    } else {
      this.audioContext = null;
      this.gainNode = null;
    }

    // allow reconnect later
    this.isStopping = false;
  }

  // --- Disconnect complet (appelé manuellement) ---
  disconnect() {
    console.log('🎤 Disconnecting audio stream');

    if (this.ws) {
      try { this.ws.close(); } catch (_) {}
      this.ws = null;
    }

    this.stopAndClear();

    this.isConnected = false;
  }

  isStreamConnected(): boolean {
    return this.isConnected;
  }

}

