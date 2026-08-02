/**
 * AudioLoopbackTest - Test local pour vérifier la qualité audio
 * 
 * Ce service capture l'audio du micro, l'encode en PCMU (comme pour l'envoi),
 * puis le décode et le rejoue (comme pour la réception).
 * 
 * Cela permet de vérifier que le pipeline audio fonctionne correctement
 * sans avoir besoin d'un vrai appel.
 */

export class AudioLoopbackTest {
  private audioContext: AudioContext | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private stream: MediaStream | null = null;
  
  // Pour la lecture
  private playbackContext: AudioContext | null = null;
  private playbackGainNode: GainNode | null = null;
  private playbackTime = 0;
  private chunkQueue: Float32Array[] = [];
  private isPlaying = false;
  
  private isRunning = false;

  async start() {
    if (this.isRunning) {
      console.warn('⚠️ Loopback test already running');
      return;
    }

    console.log('🔄 Starting audio loopback test...');
    this.isRunning = true;

    try {
      // 1. Capture du microphone
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log('🎤 Microphone captured');

      // 2. Créer AudioContext pour la capture (fréquence native du navigateur)
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      console.log('🎧 Capture AudioContext created at', this.audioContext.sampleRate, 'Hz');

      // 3. Créer AudioContext pour la lecture (8kHz pour simuler Telnyx)
      this.playbackContext = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 8000
      });
      this.playbackGainNode = this.playbackContext.createGain();
      this.playbackGainNode.gain.value = 0.95;
      this.playbackGainNode.connect(this.playbackContext.destination);
      this.playbackTime = this.playbackContext.currentTime;
      console.log('🔊 Playback AudioContext created at', this.playbackContext.sampleRate, 'Hz');

      // 4. Charger le worklet pour l'encodage
      const source = this.audioContext.createMediaStreamSource(this.stream);
      const workletUrl = new URL('../worklets/mic-processor.worklet.js', import.meta.url);
      await this.audioContext.audioWorklet.addModule(workletUrl);
      
      this.workletNode = new AudioWorkletNode(this.audioContext, 'mic-processor', {
        numberOfInputs: 1,
        numberOfOutputs: 0
      });
      
      source.connect(this.workletNode);
      console.log('🔧 Worklet loaded and connected');

      // 5. Recevoir les chunks PCMU encodés et les décoder
      this.workletNode.port.onmessage = (ev: MessageEvent) => {
        const pcmu: Uint8Array = ev.data;
        if (!pcmu || !(pcmu instanceof Uint8Array)) return;

        console.log('📦 Received PCMU chunk:', pcmu.length, 'bytes');

        // Décoder PCMU -> Float32 (comme dans AudioStreamManager)
        const float32 = this.decodePCMU(pcmu);
        
        // Ajouter à la queue pour lecture
        this.enqueueChunk(float32);
      };

      console.log('✅ Loopback test started - You should hear yourself with a slight delay');
      console.log('📊 Pipeline: Microphone → Downsample (8kHz) → Encode (PCMU) → Decode (PCMU) → Speakers');
      
    } catch (err) {
      console.error('❌ Error starting loopback test:', err);
      await this.stop();
      throw err;
    }
  }

  async stop() {
    console.log('⏹️ Stopping audio loopback test...');
    this.isRunning = false;

    // Arrêter la capture
    try { this.workletNode?.disconnect(); } catch (_) {}
    try { this.stream?.getTracks().forEach(t => t.stop()); } catch (_) {}
    try { await this.audioContext?.close(); } catch (_) {}

    // Arrêter la lecture
    this.chunkQueue = [];
    this.isPlaying = false;
    try { await this.playbackContext?.close(); } catch (_) {}

    this.workletNode = null;
    this.stream = null;
    this.audioContext = null;
    this.playbackContext = null;
    this.playbackGainNode = null;

    console.log('✅ Loopback test stopped');
  }

  // Décoder PCMU -> Float32 (même algorithme que AudioStreamManager)
  private decodePCMU(pcmuData: Uint8Array): Float32Array {
    const out = new Float32Array(pcmuData.length);
    for (let i = 0; i < pcmuData.length; i++) {
      const s16 = this.decodeMuLawByte(pcmuData[i]);
      out[i] = s16 / 32768; // normaliser à [-1, 1]
    }
    return out;
  }

  // Décodage µ-law (ITU-T G.711) - même que AudioStreamManager
  private decodeMuLawByte(muLawByte: number): number {
    let mu = ~muLawByte & 0xff;
    const sign = (mu & 0x80) ? -1 : 1;
    const exponent = (mu >> 4) & 0x07;
    const mantissa = mu & 0x0f;
    let magnitude = ((mantissa << 3) + 0x84) << exponent;
    const sample = sign * (magnitude - 0x84);
    return sample < -32768 ? -32768 : sample > 32767 ? 32767 : sample;
  }

  // Ajouter un chunk à la queue
  private enqueueChunk(float32: Float32Array) {
    this.chunkQueue.push(float32);

    // Démarrer la lecture si on a assez de chunks
    if (!this.isPlaying && this.chunkQueue.length >= 3) {
      this.startPlayback();
    }
  }

  // Démarrer la lecture
  private startPlayback() {
    if (!this.playbackContext || !this.playbackGainNode) return;
    if (this.isPlaying) return;

    this.isPlaying = true;
    console.log('▶️ Starting playback...');

    // Assurer que playbackTime est dans le futur
    if (this.playbackTime < this.playbackContext.currentTime) {
      this.playbackTime = this.playbackContext.currentTime + 0.05;
    }

    const processQueue = () => {
      if (!this.playbackContext || !this.isRunning) {
        this.isPlaying = false;
        return;
      }

      if (this.chunkQueue.length === 0) {
        this.isPlaying = false;
        return;
      }

      const chunk = this.chunkQueue.shift()!;
      this.scheduleChunk(chunk);

      setTimeout(processQueue, 0);
    };

    processQueue();
  }

  // Planifier la lecture d'un chunk
  private scheduleChunk(float32: Float32Array) {
    if (!this.playbackContext || !this.playbackGainNode) return;

    // Créer un AudioBuffer
    const buffer = this.playbackContext.createBuffer(1, float32.length, 8000);
    buffer.getChannelData(0).set(float32);

    const src = this.playbackContext.createBufferSource();
    src.buffer = buffer;
    src.connect(this.playbackGainNode);

    // Assurer que playbackTime est dans le futur
    const now = this.playbackContext.currentTime;
    if (this.playbackTime < now + 0.02) {
      this.playbackTime = now + 0.02;
    }

    try {
      src.start(this.playbackTime);
    } catch (err) {
      try {
        src.start();
        console.warn('⚠️ start failed with playbackTime, started immediately');
      } catch (e) {
        console.error('❌ Failed to start audio source', e);
      }
    }

    // Mettre à jour playbackTime
    const duration = buffer.length / 8000;
    this.playbackTime += duration;

    src.onended = () => {
      try { src.disconnect(); } catch (_) {}
    };
  }

  isTestRunning(): boolean {
    return this.isRunning;
  }

  // Méthode pour obtenir des statistiques
  getStats() {
    return {
      isRunning: this.isRunning,
      queueLength: this.chunkQueue.length,
      captureSampleRate: this.audioContext?.sampleRate || 0,
      playbackSampleRate: this.playbackContext?.sampleRate || 0,
      playbackTime: this.playbackTime,
      currentTime: this.playbackContext?.currentTime || 0,
      latency: this.chunkQueue.length * 20 // approximation en ms
    };
  }
}


