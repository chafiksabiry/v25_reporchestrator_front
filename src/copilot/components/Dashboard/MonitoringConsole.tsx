import React, { useState, useEffect } from 'react';

interface SystemMetric {
  id: string;
  name: string;
  value: number;
  unit: string;
  status: 'normal' | 'warning' | 'critical';
  trend: 'up' | 'down' | 'stable';
  timestamp: string;
}

interface CallMetric {
  id: string;
  callId: string;
  participant: string;
  audioLevel: number;
  connectionQuality: 'excellent' | 'good' | 'poor' | 'disconnected';
  latency: number;
  timestamp: string;
}

interface MonitoringConsoleProps {
  systemMetrics?: SystemMetric[];
  callMetrics?: CallMetric[];
  onMetricClick?: (metricId: string) => void;
  onCallMetricClick?: (callId: string) => void;
}

export const MonitoringConsole: React.FC<MonitoringConsoleProps> = ({
  systemMetrics = [],
  callMetrics = [],
  onMetricClick,
  onCallMetricClick
}) => {
  const [activeTab, setActiveTab] = useState<'system' | 'calls'>('system');
  const [autoRefresh, setAutoRefresh] = useState(true);

  const getStatusColor = (status: SystemMetric['status']) => {
    switch (status) {
      case 'normal': return 'text-green-600';
      case 'warning': return 'text-yellow-600';
      case 'critical': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusBgColor = (status: SystemMetric['status']) => {
    switch (status) {
      case 'normal': return 'bg-green-100';
      case 'warning': return 'bg-yellow-100';
      case 'critical': return 'bg-red-100';
      default: return 'bg-gray-100';
    }
  };

  const getConnectionQualityColor = (quality: CallMetric['connectionQuality']) => {
    switch (quality) {
      case 'excellent': return 'text-green-600';
      case 'good': return 'text-harx-600';
      case 'poor': return 'text-yellow-600';
      case 'disconnected': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getTrendIcon = (trend: SystemMetric['trend']) => {
    switch (trend) {
      case 'up': return '↗';
      case 'down': return '↘';
      case 'stable': return '→';
      default: return '→';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center space-x-4">
          <h2 className="text-lg font-semibold">Monitoring Console</h2>
          <div className="flex space-x-1">
            <button
              onClick={() => setActiveTab('system')}
              className={`px-3 py-1 rounded text-sm ${
                activeTab === 'system'
                  ? 'bg-harx-500 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              System
            </button>
            <button
              onClick={() => setActiveTab('calls')}
              className={`px-3 py-1 rounded text-sm ${
                activeTab === 'calls'
                  ? 'bg-harx-500 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Calls
            </button>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <label className="flex items-center space-x-2 text-sm">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded"
            />
            <span>Auto-refresh</span>
          </label>
        </div>
      </div>

      <div className="p-4">
        {activeTab === 'system' ? (
          <div className="space-y-3">
            {systemMetrics.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                No system metrics available
              </div>
            ) : (
              systemMetrics.map((metric) => (
                <div
                  key={metric.id}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    metric.status === 'critical' ? 'border-red-200 bg-red-50' :
                    metric.status === 'warning' ? 'border-yellow-200 bg-yellow-50' :
                    'border-gray-200 bg-gray-50 hover:bg-gray-100'
                  }`}
                  onClick={() => onMetricClick?.(metric.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`w-3 h-3 rounded-full ${getStatusBgColor(metric.status)}`}></div>
                      <div>
                        <h3 className="font-medium text-sm">{metric.name}</h3>
                        <p className="text-xs text-gray-500">
                          {new Date(metric.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`font-semibold ${getStatusColor(metric.status)}`}>
                        {metric.value} {metric.unit}
                      </span>
                      <span className="text-sm text-gray-500">
                        {getTrendIcon(metric.trend)}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {callMetrics.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                No active calls to monitor
              </div>
            ) : (
              callMetrics.map((metric) => (
                <div
                  key={metric.id}
                  className="p-3 rounded-lg border border-gray-200 bg-gray-50 hover:bg-gray-100 cursor-pointer transition-colors"
                  onClick={() => onCallMetricClick?.(metric.callId)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-sm">Call {metric.callId}</h3>
                      <p className="text-xs text-gray-500">{metric.participant}</p>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-center">
                        <div className="text-xs text-gray-500">Audio Level</div>
                        <div className="text-sm font-medium">
                          {Math.round(metric.audioLevel * 100)}%
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-xs text-gray-500">Quality</div>
                        <div className={`text-sm font-medium ${getConnectionQualityColor(metric.connectionQuality)}`}>
                          {metric.connectionQuality}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-xs text-gray-500">Latency</div>
                        <div className="text-sm font-medium">{metric.latency}ms</div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

