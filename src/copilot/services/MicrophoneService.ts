export class MicrophoneService {
  private outboundWs: WebSocket | null = null;
  private audioContext: AudioContext | null = null;
  private node: AudioWorkletNode | null = null;
  private stream: MediaStream | null = null;
  private rawAudioBuffer: Float32Array[] = [];
  private recordingStartTime: number = 0;
  private recordingInterval: number | null = null;
  private recorderScriptNode: ScriptProcessorNode | null = null;
  private recordingCounter: number = 0;

  constructor(outboundWs: WebSocket) {
    this.outboundWs = outboundWs;
  }

  // Static method to test microphone permissions before starting capture
  static async testMicrophonePermissions(): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('🧪 Testing microphone permissions...');
      
      // Check if we're in a secure context
      if (!window.isSecureContext && location.protocol !== 'https:' && location.hostname !== 'localhost') {
        return {
          success: false,
          error: 'Microphone access requires HTTPS or localhost. Please use HTTPS or test on localhost.'
        };
      }

      // Check permissions API
      if (navigator.permissions) {
        const permissionStatus = await navigator.permissions.query({ name: 'microphone' as PermissionName });
        console.log('🎤 Permission status:', permissionStatus.state);
        
        if (permissionStatus.state === 'denied') {
          return {
            success: false,
            error: 'Microphone permission denied. Please allow microphone access in your browser settings.'
          };
        }
      }

      // Test actual microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      
      // Clean up test stream
      stream.getTracks().forEach(track => track.stop());
      
      console.log('✅ Microphone permissions test passed');
      return { success: true };
      
    } catch (error: any) {
      console.error('❌ Microphone permissions test failed:', error);
      
      let errorMessage = 'Unknown microphone error';
      if (error.name === 'NotAllowedError') {
        errorMessage = 'Microphone permission denied. Please click "Allow" when prompted.';
      } else if (error.name === 'NotFoundError') {
        errorMessage = 'No microphone found. Please connect a microphone.';
      } else if (error.name === 'NotReadableError') {
        errorMessage = 'Microphone is being used by another application.';
      } else if (error.name === 'OverconstrainedError') {
        errorMessage = 'Microphone constraints cannot be satisfied.';
      }
      
      return { success: false, error: errorMessage };
    }
  }

  async startCapture() {
    try {
      // 1) Ensure outbound WebSocket provided and open
      if (!this.outboundWs) throw new Error('Outbound WebSocket instance not provided');
      if (this.outboundWs.readyState !== WebSocket.OPEN) {
        await new Promise<void>((resolve, reject) => {
          const onOpen = () => { this.outboundWs?.removeEventListener('open', onOpen as any); resolve(); };
          const onError = () => { this.outboundWs?.removeEventListener('error', onError as any); reject(new Error('Outbound WebSocket error')); };
          this.outboundWs?.addEventListener('open', onOpen as any);
          this.outboundWs?.addEventListener('error', onError as any);
        });
      }

      // 2) Check microphone permissions first
      console.log('🎤 Checking microphone permissions...');
      const permissionStatus = await navigator.permissions.query({ name: 'microphone' as PermissionName });
      console.log('🎤 Microphone permission status:', permissionStatus.state);
      
      if (permissionStatus.state === 'denied') {
        throw new Error('Microphone permission denied. Please allow microphone access in your browser settings.');
      }

      // 3) Capture microphone with better error handling
      console.log('🎤 Requesting microphone access...');
      try {
        this.stream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            sampleRate: 48000 // Explicit sample rate
          } 
        });
        console.log('✅ Microphone access granted');
      } catch (mediaError: any) {
        console.error('❌ Microphone access error:', mediaError);
        if (mediaError.name === 'NotAllowedError') {
          throw new Error('Microphone permission denied. Please click "Allow" when prompted or check your browser settings.');
        } else if (mediaError.name === 'NotFoundError') {
          throw new Error('No microphone found. Please connect a microphone and try again.');
        } else if (mediaError.name === 'NotReadableError') {
          throw new Error('Microphone is being used by another application. Please close other applications and try again.');
        } else {
          throw new Error(`Microphone error: ${mediaError.message}`);
        }
      }

      // 4) Create AudioContext
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const source = this.audioContext.createMediaStreamSource(this.stream);

      // 5) Create script processor for raw audio recording (before worklet)
      const bufferSize = 4096;
      this.recorderScriptNode = this.audioContext.createScriptProcessor(bufferSize, 1, 1);
      
      // Flag to track if we're recording
      let isRecording = true;
      
      this.recorderScriptNode.onaudioprocess = (e) => {
        if (!isRecording) return;
        
        const inputData = e.inputBuffer.getChannelData(0);
        // Make a copy of the audio data
        this.rawAudioBuffer.push(new Float32Array(inputData));
        
        console.log(`🎙️ Recording chunk ${this.rawAudioBuffer.length}: ${inputData.length} samples`);
        
        // Check if we have 3 seconds of audio (assuming 48000 Hz sample rate)
        const samplesFor3Seconds = this.audioContext!.sampleRate * 3;
        const totalSamples = this.rawAudioBuffer.length * bufferSize;
        
        console.log(`📊 Buffer: ${totalSamples} / ${samplesFor3Seconds} samples`);
        
        if (totalSamples >= samplesFor3Seconds) {
          console.log(`✨ Triggering 3-second save with ${this.rawAudioBuffer.length} chunks`);
          this.saveAudioAsMP3();
        }
      };
      
      // 6) Load and create worklet for RTP encoding FIRST (before connecting)
      const workletUrl = new URL('../worklets/mic-processor.worklet.js', import.meta.url);
      await this.audioContext.audioWorklet.addModule(workletUrl);
      this.node = new AudioWorkletNode(this.audioContext, 'mic-processor', { numberOfInputs: 1, numberOfOutputs: 0 });
      
      // 7) Connect audio chain in parallel:
      //    CRITICAL: Both nodes must be connected to receive audio
      //    - Worklet: source → worklet (encodes RTP)
      //    - Recorder: source → recorder → destination (records audio)
      source.connect(this.node);
      source.connect(this.recorderScriptNode);
      this.recorderScriptNode.connect(this.audioContext.destination);
      
      // Store recording start time
      this.recordingStartTime = Date.now();

      // 4) Receive RTP packets from worklet and send over WS (RTP PCMU with headers)
      let chunkCount = 0;
      this.node.port.onmessage = (ev: MessageEvent) => {
        const rtpPacket: Uint8Array = ev.data;
        if (!rtpPacket || !(rtpPacket instanceof Uint8Array)) return;
        
        chunkCount++;
        // Log premier chunk et ensuite tous les 50 chunks
        if (chunkCount === 1 || chunkCount % 50 === 0) {
          console.log(`📦 RTP packet #${chunkCount}: ${rtpPacket.length} bytes (12 header + ${rtpPacket.length - 12} payload)`);
        }
        
        // Encode RTP packet to base64 (includes RTP header + PCMU payload)
        const base64 = this.uint8ToBase64(rtpPacket);
        
        if (this.outboundWs && this.outboundWs.readyState === WebSocket.OPEN) {
          this.outboundWs.send(JSON.stringify({ event: 'media', media: { payload: base64 } }));
          
          // Log premier envoi et ensuite tous les 50 envois
          if (chunkCount === 1 || chunkCount % 50 === 0) {
            console.log(`✅ Sent RTP packet #${chunkCount} via outbound WebSocket (RTP: ${rtpPacket.length} bytes, base64: ${base64.length} chars)`);
          }
        } else {
          console.error(`❌ Outbound WebSocket not ready for RTP packet #${chunkCount}, state: ${this.outboundWs?.readyState}`);
        }
      };

      console.log('🎧 Microphone capture started');
    } catch (err) {
      console.error('❌ Error starting microphone stream:', err);
      await this.stopCapture();
      throw err;
    }
  }

  private saveAudioAsMP3() {
    if (this.rawAudioBuffer.length === 0) return;

    try {
      console.log(`💾 Preparing to save audio file (3 seconds, ${this.rawAudioBuffer.length} chunks)`);
      
      // Flatten the buffer to a single Float32Array
      const totalSamples = this.rawAudioBuffer.reduce((sum, arr) => sum + arr.length, 0);
      const audioData = new Float32Array(totalSamples);
      let offset = 0;
      for (const chunk of this.rawAudioBuffer) {
        audioData.set(chunk, offset);
        offset += chunk.length;
      }

      // Convert to WAV and download
      const wavBlob = this.float32ToWav(audioData, this.audioContext!.sampleRate);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
      const time = new Date().toTimeString().replace(/[:.]/g, '-').split(' ')[0];
      const filename = `outbound-call-${timestamp}-${time}-part${this.recordingCounter}.wav`;
      
      const url = URL.createObjectURL(wavBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      console.log(`✅ Saved audio file: ${filename} (${audioData.length} samples, ${this.audioContext!.sampleRate}Hz)`);

      // Clear buffer for next 3 seconds and increment counter
      this.rawAudioBuffer = [];
      this.recordingCounter++;
    } catch (error) {
      console.error('❌ Error saving audio file:', error);
    }
  }

  private float32ToWav(pcmData: Float32Array, sampleRate: number): Blob {
    // Convert Float32 [-1, 1] to Int16 [-32768, 32767]
    const length = pcmData.length;
    const buffer = new ArrayBuffer(44 + length * 2);
    const view = new DataView(buffer);

    // WAV header helper function
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    // Write WAV header
    writeString(0, 'RIFF');
    view.setUint32(4, 36 + length * 2, true); // File size - 8
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true); // Subchunk1Size
    view.setUint16(20, 1, true); // AudioFormat (1 = PCM)
    view.setUint16(22, 1, true); // NumChannels
    view.setUint32(24, sampleRate, true); // SampleRate
    view.setUint32(28, sampleRate * 2, true); // ByteRate
    view.setUint16(32, 2, true); // BlockAlign
    view.setUint16(34, 16, true); // BitsPerSample
    writeString(36, 'data');
    view.setUint32(40, length * 2, true); // Subchunk2Size

    // Write PCM data with Float32 to Int16 conversion
    for (let i = 0; i < length; i++) {
      let s = Math.max(-1, Math.min(1, pcmData[i]));
      const sample = s < 0 ? s * 0x8000 : s * 0x7FFF;
      view.setInt16(44 + i * 2, sample, true);
    }

    return new Blob([buffer], { type: 'audio/wav' });
  }

  async stopCapture() {
    console.log('⏹️ Stopping microphone stream');
    
    // Save any remaining audio buffer before stopping
    if (this.rawAudioBuffer.length > 0) {
      console.log('💾 Saving final audio buffer...');
      this.saveAudioAsMP3();
    }
    
    // Clear interval if set
    if (this.recordingInterval) {
      clearInterval(this.recordingInterval);
      this.recordingInterval = null;
    }
    
    try { this.recorderScriptNode?.disconnect(); } catch (_) {}
    try { this.node?.disconnect(); } catch (_) {}
    try { this.stream?.getTracks().forEach(t => t.stop()); } catch (_) {}
    try { await this.audioContext?.close(); } catch (_) {}
    // We do NOT close the outbound WebSocket here; it's managed by the caller

    this.node = null;
    this.recorderScriptNode = null;
    this.stream = null;
    this.audioContext = null;
    this.rawAudioBuffer = [];
    this.recordingCounter = 0;
    // keep outboundWs reference (still owned by caller)
  }

  // Uint8Array -> base64
  private uint8ToBase64(u8: Uint8Array): string {
    let binary = '';
    const chunkSize = 0x8000;
    for (let i = 0; i < u8.length; i += chunkSize) {
      const chunk = u8.subarray(i, i + chunkSize);
      binary += String.fromCharCode.apply(null, chunk as unknown as number[]);
    }
    return btoa(binary);
  }
}

