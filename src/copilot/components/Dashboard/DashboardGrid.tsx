import React from 'react';
import SmartWarningSystem from './SmartWarningSystem';

const DashboardGrid: React.FC = () => {
  return (
    <div className="w-full pb-4 space-y-6">
      {/* AI Overlays & Real-time Analysis.
          NOTE: the `RealTimeCoaching` ("Vertex AI Voice — live coaching &
          analysis") panel was removed at the rep's request — it was
          stuck on "GATHERING CONTEXT…" and added noise above the
          cockpit. Keep `SmartWarningSystem` for actionable alerts. */}
      <div className="space-y-6">
        <SmartWarningSystem />
      </div>
    </div>
  );
};

export default DashboardGrid;
