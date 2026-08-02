import React from 'react';
import { TranscriptionProvider } from './contexts/TranscriptionContext';
import TopStatusBar from './components/Dashboard/TopStatusBar';
import { ContactInfo } from './components/Dashboard/ContactInfo';
import DashboardGrid from './components/Dashboard/DashboardGrid';
import { TranscriptionBridge } from './components/TranscriptionBridge';

import { useDestinationZone } from './hooks/useDestinationZone';

function AppContent() {
  // Récupérer la zone de destination au niveau de l'App
  const { zone: destinationZone } = useDestinationZone();

  return (
    <TranscriptionProvider destinationZone={destinationZone || undefined}>
      <TranscriptionBridge />
      <div className="bg-transparent overflow-hidden rounded-3xl" style={{ minHeight: 'calc(100vh - 150px)' }}>
        <div className="max-w-[1800px] mx-auto px-6 py-4">
          <div className="space-y-6">
            <div className="pt-2 pb-0">
              <TopStatusBar />
            </div>
            <ContactInfo />
            <DashboardGrid />
          </div>
        </div>
        {/* Hidden audio element for Twilio call audio */}
        <audio id="call-audio" autoPlay style={{ display: 'none' }} />
      </div>
    </TranscriptionProvider>
  );
}

function App() {
  return (
    <AppContent />
  );
}

export default App;
