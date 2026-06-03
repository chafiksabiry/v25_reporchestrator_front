import React, { useState, useEffect } from 'react';
import { Volume2, VolumeX, Mic, MicOff, Activity, AlertCircle } from 'lucide-react';
import { useAgent } from '../../contexts/AgentContext';
import { useTwilioMute } from '../../hooks/useTwilioMute';

/**
 * Composant de diagnostic audio pour débugger les problèmes de son
 */
export function AudioDiagnostic() {
  const { state } = useAgent();
  const { isConnected, connection } = useTwilioMute();
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [audioPermission, setAudioPermission] = useState<PermissionState | null>(null);

  // Vérifier les permissions audio
  useEffect(() => {
    const checkAudioPermission = async () => {
      try {
        if (navigator.permissions) {
          const permission = await navigator.permissions.query({ name: 'microphone' as any });
          setAudioPermission(permission.state);
          
          permission.onchange = () => {
            setAudioPermission(permission.state);
          };
        }
      } catch (error) {
        console.log('Permission API not available');
      }
    };

    checkAudioPermission();
  }, []);

  // Charger les périphériques audio
  useEffect(() => {
    const loadDevices = async () => {
      try {
        if (navigator.mediaDevices) {
          const devices = await navigator.mediaDevices.enumerateDevices();
          const audioInputs = devices.filter(device => device.kind === 'audioinput');
          const audioOutputs = devices.filter(device => device.kind === 'audiooutput');
          setAudioDevices([...audioInputs, ...audioOutputs]);
        }
      } catch (error) {
        console.error('Failed to enumerate devices:', error);
      }
    };

    loadDevices();
  }, []);

  const testAudioPlayback = () => {
    // Créer un son de test
    const audioContext = new AudioContext();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.setValueAtTime(440, audioContext.currentTime); // A4 note
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.5);
    
    console.log('🔊 Playing test audio tone');
  };

  const getConnectionDetails = () => {
    if (!connection) return 'No connection';
    
    try {
      const details = {
        status: connection.status?.() || 'unknown',
        isMuted: connection.isMuted?.() || false,
        hasAudio: !!connection.getRemoteStream,
        direction: connection.direction || 'unknown'
      };
      
      return JSON.stringify(details, null, 2);
    } catch (error) {
      return 'Error reading connection details';
    }
  };

  const checkTwilioAudioElements = () => {
    const audioElements = document.querySelectorAll('audio');
    console.log(`🎵 Found ${audioElements.length} audio elements:`);
    
    audioElements.forEach((audio, index) => {
      console.log(`Audio ${index}:`, {
        id: audio.id,
        src: audio.src,
        muted: audio.muted,
        volume: audio.volume,
        paused: audio.paused,
        hasSource: !!audio.srcObject
      });
    });
  };

  return (
    <div className="bg-[#232f47] rounded-xl p-6 max-w-2xl mx-auto">
      <div className="text-center mb-6">
        <h2 className="text-xl font-bold text-white mb-2 flex items-center justify-center">
          <Activity className="w-5 h-5 mr-2" />
          Diagnostic Audio Twilio
        </h2>
        <p className="text-slate-400 text-sm">
          Diagnostic des problèmes audio et sons d'appel
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* État de l'appel */}
        <div className="p-4 bg-[#1a2332] rounded-lg">
          <h3 className="text-white font-medium mb-3">État de l'Appel</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-400">Call Active:</span>
              <span className={state.callState.isActive ? 'text-green-400' : 'text-slate-400'}>
                {state.callState.isActive ? '✅' : '❌'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Twilio Connected:</span>
              <span className={isConnected ? 'text-green-400' : 'text-slate-400'}>
                {isConnected ? '✅' : '❌'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Media Stream:</span>
              <span className={state.mediaStream ? 'text-green-400' : 'text-slate-400'}>
                {state.mediaStream ? '✅' : '❌'}
              </span>
            </div>
          </div>
        </div>

        {/* Permissions */}
        <div className="p-4 bg-[#1a2332] rounded-lg">
          <h3 className="text-white font-medium mb-3">Permissions</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-400">Microphone:</span>
              <span className={
                audioPermission === 'granted' ? 'text-green-400' : 
                audioPermission === 'denied' ? 'text-red-400' : 'text-yellow-400'
              }>
                {audioPermission || 'unknown'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Audio Devices:</span>
              <span className="text-harx-400">{audioDevices.length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Détails de connexion Twilio */}
      {connection && (
        <div className="mb-6 p-4 bg-[#1a2332] rounded-lg">
          <h3 className="text-white font-medium mb-3">Détails Twilio</h3>
          <pre className="text-xs text-slate-400 bg-slate-800 p-3 rounded overflow-x-auto">
            {getConnectionDetails()}
          </pre>
        </div>
      )}

      {/* Actions de test */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
        <button
          onClick={testAudioPlayback}
          className="flex items-center justify-center space-x-2 px-4 py-3 bg-harx-600 hover:bg-harx-700 text-white rounded-lg"
        >
          <Volume2 className="w-4 h-4" />
          <span>Test Son</span>
        </button>

        <button
          onClick={checkTwilioAudioElements}
          className="flex items-center justify-center space-x-2 px-4 py-3 bg-harx-alt-600 hover:bg-harx-alt-700 text-white rounded-lg"
        >
          <Activity className="w-4 h-4" />
          <span>Check Audio</span>
        </button>

        <button
          onClick={() => navigator.mediaDevices.getUserMedia({ audio: true }).then(() => console.log('✅ Audio access granted')).catch(console.error)}
          className="flex items-center justify-center space-x-2 px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg"
        >
          <Mic className="w-4 h-4" />
          <span>Test Micro</span>
        </button>
      </div>

      {/* Problèmes connus */}
      <div className="p-4 bg-amber-900/20 border border-amber-600/30 rounded-lg">
        <div className="flex items-start space-x-2">
          <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <div className="text-amber-400 font-medium mb-2">Problèmes Audio Connus</div>
            <div className="text-amber-300 text-sm space-y-1">
              <div>• <strong>Son de lancement manquant:</strong> Vérifiez que l'événement 'ringing' est bien écouté</div>
              <div>• <strong>Audio coupé:</strong> Les navigateurs bloquent l'autoplay - interaction utilisateur nécessaire</div>
              <div>• <strong>Twilio mute:</strong> Utilisez call.mute() pour affecter l'enregistrement</div>
            </div>
          </div>
        </div>
      </div>

      {/* Instructions de debug */}
      <div className="mt-4 p-3 bg-slate-800/50 rounded text-xs text-slate-400">
        <div className="font-medium mb-1">Debug Steps:</div>
        <ol className="list-decimal list-inside space-y-1">
          <li>Ouvrez la console pour voir les logs audio</li>
          <li>Testez le son avec le bouton "Test Son"</li>
          <li>Vérifiez les éléments audio avec "Check Audio"</li>
          <li>Lancez un appel et observez les événements</li>
        </ol>
      </div>
    </div>
  );
}
