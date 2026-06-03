import React, { useState } from 'react';
import { useDestinationZone } from '../../hooks/useDestinationZone';
import { useTranscriptionIntegration } from '../../hooks/useTranscriptionIntegration';

interface TranscriptionWithDestinationZoneProps {
  gigId?: string;
  phoneNumber?: string;
  stream?: MediaStream;
}

export const TranscriptionWithDestinationZone: React.FC<TranscriptionWithDestinationZoneProps> = ({
  gigId,
  phoneNumber,
  stream
}) => {
  const [isTranscriptionActive, setIsTranscriptionActive] = useState(false);
  
  // Récupérer la zone de destination du gig
  const { zone: destinationZone, loading: zoneLoading, error: zoneError } = useDestinationZone(gigId);
  
  // Utiliser la transcription avec la zone de destination
  const {
    isActive,
    transcripts,
    currentInterimText,
    error: transcriptionError,
    startTranscription,
    stopTranscription,
    clearTranscripts
  } = useTranscriptionIntegration(destinationZone || undefined);

  const handleStartTranscription = async () => {
    if (!stream || !phoneNumber) {
      console.error('Stream or phone number not available');
      return;
    }

    try {
      await startTranscription(stream, phoneNumber);
      setIsTranscriptionActive(true);
    } catch (error) {
      console.error('Failed to start transcription:', error);
    }
  };

  const handleStopTranscription = async () => {
    try {
      await stopTranscription();
      setIsTranscriptionActive(false);
    } catch (error) {
      console.error('Failed to stop transcription:', error);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold mb-4">Transcription avec Zone de Destination</h3>
      
      {/* Affichage de la zone de destination */}
      <div className="mb-4 p-3 bg-gray-50 rounded">
        <h4 className="font-medium text-gray-700 mb-2">Zone de Destination</h4>
        {zoneLoading && <p className="text-harx-600">Chargement de la zone...</p>}
        {zoneError && <p className="text-red-600">Erreur: {zoneError}</p>}
        {destinationZone && (
          <div className="flex items-center gap-2">
            <span className="text-green-600 font-medium">🌍 {destinationZone}</span>
            <span className="text-sm text-gray-500">
              (Langue: {destinationZone === 'FR' ? 'Français' : 
                        destinationZone === 'DE' ? 'Allemand' :
                        destinationZone === 'ES' ? 'Espagnol' :
                        destinationZone === 'MA' ? 'Arabe' :
                        destinationZone === 'GB' ? 'Anglais' : 'Détectée automatiquement'})
            </span>
          </div>
        )}
      </div>

      {/* Contrôles de transcription */}
      <div className="mb-4 flex gap-2">
        <button
          onClick={handleStartTranscription}
          disabled={!stream || !phoneNumber || isActive}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          Démarrer Transcription
        </button>
        <button
          onClick={handleStopTranscription}
          disabled={!isActive}
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          Arrêter Transcription
        </button>
        <button
          onClick={clearTranscripts}
          className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
        >
          Effacer
        </button>
      </div>

      {/* Statut de la transcription */}
      <div className="mb-4">
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${isActive ? 'bg-green-500' : 'bg-gray-400'}`}></div>
          <span className="text-sm">
            {isActive ? 'Transcription active' : 'Transcription inactive'}
          </span>
        </div>
        {transcriptionError && (
          <p className="text-red-600 text-sm mt-1">Erreur: {transcriptionError}</p>
        )}
      </div>

      {/* Transcription en cours */}
      {currentInterimText && (
        <div className="mb-4 p-3 bg-harx-50 rounded">
          <h4 className="font-medium text-harx-700 mb-2">Transcription en cours...</h4>
          <p className="text-harx-800 italic">{currentInterimText}</p>
        </div>
      )}

      {/* Historique des transcriptions */}
      {transcripts.length > 0 && (
        <div>
          <h4 className="font-medium text-gray-700 mb-2">Historique des transcriptions</h4>
          <div className="max-h-60 overflow-y-auto space-y-2">
            {transcripts.map((transcript, index) => (
              <div key={index} className="p-2 bg-gray-50 rounded text-sm">
                <div className="flex justify-between items-start mb-1">
                  <span className="text-gray-500 text-xs">
                    {new Date(transcript.timestamp).toLocaleTimeString()}
                  </span>
                  {transcript.confidence && (
                    <span className="text-xs text-gray-500">
                      Confiance: {Math.round(transcript.confidence * 100)}%
                    </span>
                  )}
                </div>
                <p className="text-gray-800">{transcript.text}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Informations de debug */}
      <div className="mt-4 p-3 bg-gray-100 rounded text-xs">
        <h4 className="font-medium mb-2">Informations de debug</h4>
        <p>Gig ID: {gigId || 'Non défini'}</p>
        <p>Numéro de téléphone: {phoneNumber || 'Non défini'}</p>
        <p>Stream disponible: {stream ? 'Oui' : 'Non'}</p>
        <p>Zone de destination: {destinationZone || 'Non définie'}</p>
      </div>
    </div>
  );
}; 
