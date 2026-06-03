import React from 'react';
import { CallPhasesDisplay } from './CallPhasesDisplay';

interface TranscriptionDemoProps {
  isCallActive: boolean;
  phoneNumber?: string;
  mediaStream?: MediaStream | null;
}

export const TranscriptionDemo: React.FC<TranscriptionDemoProps> = ({
  isCallActive,
  phoneNumber,
  mediaStream
}) => {
  // Sample call phases for demonstration
  const samplePhases = [
    {
      id: 'greeting',
      name: 'Greeting & Introduction',
      status: 'completed' as const,
      startTime: new Date(Date.now() - 30000).toISOString(),
      endTime: new Date(Date.now() - 25000).toISOString()
    },
    {
      id: 'qualification',
      name: 'Lead Qualification',
      status: 'in-progress' as const,
      startTime: new Date(Date.now() - 25000).toISOString()
    },
    {
      id: 'presentation',
      name: 'Solution Presentation',
      status: 'pending' as const
    },
    {
      id: 'objections',
      name: 'Handle Objections',
      status: 'pending' as const
    },
    {
      id: 'closing',
      name: 'Close & Next Steps',
      status: 'pending' as const
    }
  ];

  return (
    <div className="w-full max-w-4xl mx-auto">
      <CallPhasesDisplay
        phases={samplePhases}
        currentPhase="qualification"
        isCallActive={isCallActive}
        phoneNumber={phoneNumber}
        mediaStream={mediaStream}
        onPhaseClick={(phaseId) => {
          console.log('Phase clicked:', phaseId);
        }}
      />
    </div>
  );
}; 
