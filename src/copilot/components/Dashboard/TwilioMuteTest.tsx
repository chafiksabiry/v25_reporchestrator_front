import React from 'react';
import { Phone, PhoneOff, Mic, MicOff, Volume2, VolumeX } from 'lucide-react';
import { useTwilioMute } from '../../hooks/useTwilioMute';
import { useAgent } from '../../contexts/AgentContext';

/**
 * Composant de test pour vérifier que le mute Twilio fonctionne correctement
 * Ce composant utilise call.mute() du SDK Twilio pour vraiment affecter l'enregistrement
 */
export function TwilioMuteTest() {
  const { state } = useAgent();
  const {
    toggleMicMute,
    setMicMute,
    isMicMuted,
    isConnected,
    canMute,
    connection
  } = useTwilioMute();

  const handleMuteTest = () => {
    if (canMute) {
      const newState = toggleMicMute();
      console.log(`📋 Test: Microphone ${newState ? 'MUTED' : 'UNMUTED'} via Twilio SDK`);
    } else {
      console.warn('⚠️ No Twilio connection available for mute test');
    }
  };

  const handleExplicitMute = () => {
    setMicMute(true);
  };

  const handleExplicitUnmute = () => {
    setMicMute(false);
  };

  const getConnectionStatus = () => {
    if (!connection) return 'No Twilio connection';
    
    try {
      // Check if connection has mute methods
      const hasMuteMethod = typeof connection.mute === 'function';
      const hasIsMutedMethod = typeof connection.isMuted === 'function';
      
      return `Connection available - Mute methods: ${hasMuteMethod ? '✅' : '❌'} IsMuted: ${hasIsMutedMethod ? '✅' : '❌'}`;
    } catch (error) {
      return 'Connection error';
    }
  };

  const checkTwilioMuteStatus = () => {
    if (!connection) return 'N/A';
    
    try {
      if (typeof connection.isMuted === 'function') {
        return connection.isMuted() ? 'MUTED' : 'UNMUTED';
      }
      return 'Method not available';
    } catch (error) {
      return 'Error checking status';
    }
  };

  return (
    <div className="bg-[#232f47] rounded-xl p-6 max-w-lg mx-auto">
      <div className="text-center mb-6">
        <h2 className="text-xl font-bold text-white mb-2 flex items-center justify-center">
          <Mic className="w-5 h-5 mr-2" />
          Twilio Mute Test - call.mute() SDK
        </h2>
        <p className="text-slate-400 text-sm">
          Teste la vraie fonctionnalité de mute qui affecte l'enregistrement Twilio
        </p>
      </div>

      {/* Status détaillé */}
      <div className="mb-6 space-y-3">
        <div className="p-3 bg-[#1a2332] rounded-lg">
          <div className="text-white font-medium mb-2">État de la Connexion</div>
          <div className="text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-400">Twilio Connected:</span>
              <span className={isConnected ? 'text-green-400' : 'text-red-400'}>
                {isConnected ? '✅ OUI' : '❌ NON'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Can Mute:</span>
              <span className={canMute ? 'text-green-400' : 'text-red-400'}>
                {canMute ? '✅ OUI' : '❌ NON'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Call Active:</span>
              <span className={state.callState.isActive ? 'text-green-400' : 'text-slate-400'}>
                {state.callState.isActive ? '✅ OUI' : '⏸️ NON'}
              </span>
            </div>
          </div>
        </div>

        <div className="p-3 bg-[#1a2332] rounded-lg">
          <div className="text-white font-medium mb-2">État du Mute</div>
          <div className="text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-400">Context State:</span>
              <span className={isMicMuted ? 'text-red-400' : 'text-green-400'}>
                {isMicMuted ? '🔇 MUTED' : '🎤 ACTIVE'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Twilio SDK Status:</span>
              <span className="text-harx-400 font-mono text-xs">
                {checkTwilioMuteStatus()}
              </span>
            </div>
          </div>
        </div>

        <div className="p-3 bg-[#1a2332] rounded-lg">
          <div className="text-white font-medium mb-2">Connection Details</div>
          <div className="text-xs text-slate-400 font-mono">
            {getConnectionStatus()}
          </div>
        </div>
      </div>

      {/* Contrôles de test */}
      <div className="space-y-3">
        <div className="text-white font-medium mb-2">Contrôles de Test</div>
        
        {/* Bouton principal toggle */}
        <button
          onClick={handleMuteTest}
          disabled={!canMute}
          className={`w-full flex items-center justify-center space-x-3 px-4 py-3 rounded-lg font-medium transition-all duration-200 ${
            !canMute
              ? 'bg-gray-600 cursor-not-allowed text-gray-400'
              : isMicMuted
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-green-600 hover:bg-green-700 text-white'
          }`}
        >
          {isMicMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          <div className="text-left">
            <div className="font-medium">
              {!canMute ? 'No Connection' : isMicMuted ? 'Click to UNMUTE' : 'Click to MUTE'}
            </div>
            <div className="text-xs opacity-75">
              {!canMute ? 'Start a call first' : 'Uses call.mute() SDK method'}
            </div>
          </div>
        </button>

        {/* Boutons explicites */}
        {canMute && (
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleExplicitMute}
              className="flex items-center justify-center space-x-2 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm"
            >
              <MicOff className="w-4 h-4" />
              <span>Force MUTE</span>
            </button>
            
            <button
              onClick={handleExplicitUnmute}
              className="flex items-center justify-center space-x-2 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm"
            >
              <Mic className="w-4 h-4" />
              <span>Force UNMUTE</span>
            </button>
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="mt-6 p-3 bg-harx-900/20 border border-harx-600/30 rounded-lg">
        <div className="text-harx-400 text-xs">
          <div className="font-medium mb-1">Test Instructions:</div>
          <ol className="space-y-1 list-decimal list-inside">
            <li>Start a call using ContactInfo or CallControls</li>
            <li>Once connected, test the mute buttons above</li>
            <li>Verify "Twilio SDK Status" changes correctly</li>
            <li>Check server-side recording excludes muted audio</li>
          </ol>
          <div className="mt-2 text-amber-300">
            ⚡ When muted, the Twilio recording should NOT include your voice
          </div>
        </div>
      </div>

      {/* Debug info */}
      {connection && (
        <div className="mt-4 p-2 bg-slate-800/50 rounded text-xs text-slate-400">
          <div className="font-mono">
            Connection Methods: {Object.getOwnPropertyNames(connection).filter(m => m.includes('mute')).join(', ') || 'None'}
          </div>
        </div>
      )}
    </div>
  );
}
