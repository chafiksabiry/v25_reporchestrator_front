import { useAgent } from '../../contexts/AgentContext';
import { Shield, AlertTriangle, CheckCircle, X, Clock } from 'lucide-react';

export function ComplianceMonitor() {
  const { state } = useAgent();

  // Use real warnings and recommendations from state
  const alerts = state.smartWarnings.map(w => ({
    id: w.id,
    type: w.type as any,
    severity: w.severity as any,
    message: w.message,
    suggestion: w.suggestedActions.join(', '),
    timestamp: w.detectedAt
  }));

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'border-red-500 bg-red-500/10 text-red-300';
      case 'error': return 'border-red-400 bg-red-400/10 text-red-300';
      case 'warning': return 'border-yellow-500 bg-yellow-500/10 text-yellow-300';
      default: return 'border-harx-500 bg-harx-500/10 text-harx-300';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
      case 'error':
        return <AlertTriangle className="w-4 h-4 text-red-400" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-yellow-400" />;
      default:
        return <Shield className="w-4 h-4 text-harx-400" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'missing_disclosure': return 'Missing Disclosure';
      case 'sensitive_term': return 'Sensitive Language';
      case 'gdpr_violation': return 'GDPR Issue';
      case 'script_deviation': return 'Script Deviation';
      default: return 'Compliance Issue';
    }
  };

  const formatTimeAgo = (timestamp: Date) => {
    const diff = Date.now() - timestamp.getTime();
    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);

    if (minutes > 0) {
      return `${minutes}m ago`;
    }
    return `${seconds}s ago`;
  };

  return (
    <div className="glass-card rounded-2xl p-6 relative group overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-harx-500/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-emerald-500/10 rounded-xl">
            <Shield className="w-5 h-5 text-emerald-400" />
          </div>
          <h3 className="text-lg font-black text-white tracking-tight uppercase">Compliance Monitor</h3>
        </div>
        <div className="flex items-center space-x-2">
          {state.callState.isActive ? (
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-xs text-green-400">Monitoring</span>
            </div>
          ) : (
            <span className="text-xs text-slate-400">Inactive</span>
          )}
          {alerts.length > 0 && (
            <span className="bg-red-600 text-white text-xs px-2 py-1 rounded-full">
              {alerts.length}
            </span>
          )}
        </div>
      </div>

      <div className="space-y-3 max-h-64 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-700">
        {!state.callState.isActive ? (
          <div className="text-center text-slate-400 py-6">
            <Shield className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">Compliance monitoring inactive</p>
            <p className="text-xs mt-1">Start a call to begin monitoring</p>
          </div>
        ) : alerts.length === 0 ? (
          <div className="text-center text-slate-400 py-6">
            <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-400 opacity-50" />
            <p className="text-sm text-green-400">All clear</p>
            <p className="text-xs mt-1">No compliance issues detected</p>
          </div>
        ) : (
          alerts.map((alert) => (
            <div
              key={alert.id}
              className={`border-l-4 rounded-xl p-4 bg-white/5 border-white/5 hover:bg-white/10 transition-all duration-300 ${getSeverityColor(alert.severity).split(' ')[0]}`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-2">
                  {getSeverityIcon(alert.severity)}
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-white">{getTypeLabel(alert.type)}</h4>
                  <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-white/10 text-white border border-white/10">
                    {alert.severity.toUpperCase()}
                  </span>
                </div>
                <button className="text-slate-400 hover:text-white transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-sm mb-3 leading-relaxed">
                {alert.message}
              </p>

              <div className="bg-slate-700/50 rounded-lg p-3 mb-3">
                <h5 className="text-xs font-medium text-emerald-400 mb-1">Suggested Action:</h5>
                <p className="text-xs text-slate-200 leading-relaxed">
                  {alert.suggestion}
                </p>
              </div>

              <div className="flex justify-between items-center text-xs text-slate-400">
                <div className="flex items-center space-x-1">
                  <Clock className="w-3 h-3" />
                  <span>{formatTimeAgo(alert.timestamp)}</span>
                </div>
                <span className="capitalize">{alert.type.replace('_', ' ')}</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Compliance Status Summary */}
      {state.callState.isActive && (
        <div className="mt-6 pt-6 border-t border-white/5">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="bg-white/5 rounded-2xl p-3 border border-white/5">
              <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Disclosures</div>
              <div className="text-sm font-black text-yellow-400">2/4</div>
            </div>
            <div className="bg-white/5 rounded-2xl p-3 border border-white/5">
              <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Script</div>
              <div className="text-sm font-black text-green-400">85%</div>
            </div>
            <div className="bg-white/5 rounded-2xl p-3 border border-white/5">
              <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Risk</div>
              <div className="text-sm font-black text-orange-400">Med</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
