import { useState, useEffect } from 'react';
import { Rep, TimeSlot } from '../../../types/scheduler';
import { predictOptimalTimes } from '../../../services/schedulerAiService';
import { Clock, Zap, Target } from 'lucide-react';

interface OptimalTimeHeatmapProps {
    rep: Rep;
    slots: TimeSlot[];
    onSelectHour: (hour: number) => void;
}

export function OptimalTimeHeatmap({ rep, slots, onSelectHour }: OptimalTimeHeatmapProps) {
    const [optimalTimes, setOptimalTimes] = useState<{ hour: number; score: number }[]>([]);

    useEffect(() => {
        const predictions = predictOptimalTimes(rep, slots);
        setOptimalTimes(predictions);
    }, [rep, slots]);

    const getScoreStyles = (score: number): string => {
        if (score >= 0.8) return 'bg-blue-600 text-white shadow-lg shadow-blue-200 ring-2 ring-blue-100 scale-105';
        if (score >= 0.6) return 'bg-blue-50 text-blue-700 border-blue-100 hover:bg-blue-100';
        if (score >= 0.4) return 'bg-gray-50 text-gray-400 border-gray-100 hover:bg-gray-100';
        return 'bg-white text-gray-300 border-transparent hover:bg-gray-50 opacity-60';
    };

    const getLabel = (score: number): string => {
        if (score >= 0.8) return 'PEAK';
        if (score >= 0.6) return 'HIGH';
        if (score >= 0.4) return 'FAIR';
        return 'LOW';
    };

    return (
        <div className="bg-white rounded-3xl shadow-sm border border-gray-200 p-8">
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center">
                    <div className="p-2.5 bg-blue-50 rounded-2xl mr-4 shadow-sm">
                        <Clock className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-gray-900 tracking-tight uppercase">HEATMAP ANALYTICS</h2>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-0.5">AI-Powered Optimal Session Windows</p>
                    </div>
                </div>
                <div className="flex items-center space-x-2 px-3 py-1 bg-blue-600 text-white text-[10px] font-black rounded-full shadow-lg shadow-blue-100">
                    <Zap className="w-3 h-3" />
                    <span>PREDICTIVE ENGINE ACTIVE</span>
                </div>
            </div>

            <div className="grid grid-cols-4 md:grid-cols-6 gap-3">
                {optimalTimes.map(({ hour, score }) => (
                    <button
                        key={hour}
                        onClick={() => onSelectHour(hour)}
                        className={`group relative p-4 rounded-2xl border flex flex-col items-center justify-center transition-all duration-300 ${getScoreStyles(score)}`}
                    >
                        <span className="text-sm font-black tracking-tight">{hour === 0 ? '12' : hour > 12 ? hour - 12 : hour}:00</span>
                        <span className="text-[10px] font-black mt-1 uppercase tracking-tighter opacity-80 group-hover:opacity-100">{getLabel(score)}</span>

                        {score >= 0.8 && (
                            <div className="absolute -top-1 -right-1">
                                <span className="flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                                </span>
                            </div>
                        )}
                    </button>
                ))}
            </div>

            <div className="mt-8 pt-8 border-t border-gray-50 flex items-center justify-center space-x-8">
                {[
                    { color: 'bg-blue-600', label: 'OPTIMAL' },
                    { color: 'bg-blue-100', label: 'ELEVATED' },
                    { color: 'bg-gray-100', label: 'STABLE' },
                    { color: 'bg-white border-gray-100', label: 'MINIMAL' }
                ].map((item) => (
                    <div key={item.label} className="flex items-center">
                        <div className={`w-3 h-3 rounded-full mr-2 shadow-sm ${item.color}`}></div>
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{item.label}</span>
                    </div>
                ))}
            </div>

            <div className="mt-6 flex flex-col items-center">
                <div className="flex items-center text-[9px] font-bold text-gray-400 italic">
                    <Target className="w-3 h-3 mr-1.5 text-blue-400" />
                    Select a peak window to auto-populate scheduling recommendations
                </div>
            </div>
        </div>
    );
}
