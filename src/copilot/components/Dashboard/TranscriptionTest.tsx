import React, { useState } from 'react';
import { useDestinationZone } from '../../hooks/useDestinationZone';
import { useTranscriptionIntegration } from '../../hooks/useTranscriptionIntegration';

export const TranscriptionTest: React.FC = () => {
  const [testGigId] = useState('686e8ddcf74ddc5ba5d4b493'); // GigId de test
  const [testPhoneNumber, setTestPhoneNumber] = useState('+212637446431'); // Numéro français

  // Récupérer la zone de destination
  const { zone: destinationZone, loading: zoneLoading, error: zoneError, gigId } = useDestinationZone(testGigId);

  // Utiliser la transcription avec la zone
  useTranscriptionIntegration(destinationZone || undefined);

  const handleTestTranscription = async () => {
    try {
      // Simuler un stream audio (en réalité, vous auriez besoin d'un vrai stream)
      console.log('🧪 Testing transcription with destination zone:', destinationZone);
      console.log('🧪 Gig ID used:', gigId);
      console.log('🧪 Phone number:', testPhoneNumber);

      // Note: Ceci est juste pour tester la logique, pas pour démarrer une vraie transcription
      // car nous n'avons pas de vrai stream audio
    } catch (error) {
      console.error('Test failed:', error);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold mb-4">Test de Transcription avec Zone de Destination</h3>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">Modifier le Numéro de Test:</label>
        <input
          type="text"
          value={testPhoneNumber}
          onChange={(e) => setTestPhoneNumber(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-harx-500 focus:border-harx-500 sm:text-sm"
        />
      </div>

      {/* Informations de debug */}
      <div className="mb-4 p-3 bg-harx-50 rounded">
        <h4 className="font-medium text-harx-700 mb-2">Informations de Debug</h4>
        <div className="space-y-1 text-sm">
          <p><strong>Gig ID:</strong> {gigId || 'Non défini'}</p>
          <p><strong>Zone de destination:</strong> {destinationZone || 'Non définie'}</p>
          <p><strong>Numéro de téléphone:</strong> {testPhoneNumber}</p>
          <p><strong>Environnement:</strong> {import.meta.env.DEV ? 'Développement' : 'Production'}</p>
        </div>
      </div>

      {/* Statut de la zone */}
      <div className="mb-4 p-3 bg-gray-50 rounded">
        <h4 className="font-medium text-gray-700 mb-2">Statut de la Zone</h4>
        {zoneLoading && <p className="text-harx-600">⏳ Chargement de la zone...</p>}
        {zoneError && <p className="text-red-600">❌ Erreur: {zoneError}</p>}
        {destinationZone && (
          <div className="flex items-center gap-2">
            <span className="text-green-600 font-medium">✅ Zone: {destinationZone}</span>
            <span className="text-sm text-gray-500">
              (Langue attendue: {destinationZone === 'FR' ? 'Français (fr-FR)' :
                destinationZone === 'DE' ? 'Allemand (de-DE)' :
                  destinationZone === 'ES' ? 'Espagnol (es-ES)' :
                    destinationZone === 'MA' ? 'Arabe (ar-MA)' :
                      destinationZone === 'GB' ? 'Anglais (en-GB)' : 'Détectée automatiquement'})
            </span>
          </div>
        )}
      </div>

      {/* Test de la logique */}
      <div className="mb-4">
        <button
          onClick={handleTestTranscription}
          className="px-4 py-2 bg-harx-600 text-white rounded hover:bg-harx-700"
        >
          🧪 Tester la Logique de Détection
        </button>
      </div>

      {/* Instructions */}
      <div className="mt-4 p-3 bg-yellow-50 rounded">
        <h4 className="font-medium text-yellow-700 mb-2">Instructions de Test</h4>
        <ol className="text-sm text-yellow-800 space-y-1">
          <li>1. Vérifiez que la zone de destination est bien récupérée</li>
          <li>2. Cliquez sur "Tester la Logique" pour voir les logs</li>
          <li>3. Vérifiez dans la console que la langue est détectée par zone</li>
          <li>4. Les logs doivent montrer "🌍 Using destination zone for language detection"</li>
        </ol>
      </div>

      {/* Logs simulés */}
      <div className="mt-4 p-3 bg-gray-100 rounded">
        <h4 className="font-medium text-gray-700 mb-2">Logs Attendus</h4>
        <div className="text-xs font-mono bg-black text-green-400 p-2 rounded">
          <div>🌍 Destination zone set: {destinationZone || 'undefined'}</div>
          <div>🌍 Using destination zone for language detection: {destinationZone || 'undefined'}</div>
          <div>🌍 Language for zone {destinationZone || 'undefined'}: {destinationZone === 'FR' ? 'fr-FR' : 'unknown'}</div>
        </div>
      </div>
    </div>
  );
}; 
