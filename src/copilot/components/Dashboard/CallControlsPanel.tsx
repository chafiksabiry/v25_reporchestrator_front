import React, { useState } from 'react';
import { CallControls } from './CallControls';

const CallControlsPanel: React.FC = () => {
  // Mock data - replace with actual data from your app state
  const [phoneNumber, setPhoneNumber] = useState("+212637446431"); // Replace with actual phone number
  const agentId = "agent123"; // Replace with actual agent ID

  const handleCallStatusChange = (status: string) => {
    console.log("Call status changed:", status);
  };

  const handleCallSidChange = (callSid: string) => {
    console.log("Call SID changed:", callSid);
  };

  return (
    <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">Test Phone Number:</label>
        <input
          type="text"
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-harx-500 focus:border-harx-500 sm:text-sm"
          placeholder="+212637446431"
        />
      </div>
      <CallControls
        phoneNumber={phoneNumber}
        agentId={agentId}
        onCallStatusChange={handleCallStatusChange}
        onCallSidChange={handleCallSidChange}
      />
    </div>
  );
};

export default CallControlsPanel; 
