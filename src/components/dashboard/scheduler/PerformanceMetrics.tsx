import React, { useState, useEffect } from 'react';
import { Rep, TimeSlot, PerformanceMetric } from '../../../types/scheduler';
import { calculatePerformanceMetrics } from '../../../services/schedulerAiService';
import { TrendingUp, BarChart2, Star, Activity, Briefcase } from 'lucide-react';
import { Bar } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip as ChartTooltip,
    Legend
} from 'chart.js';

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    ChartTooltip,
    Legend
);

interface PerformanceMetricsProps {
    rep: Rep;
    slots: TimeSlot[];
}

export function PerformanceMetrics({ rep, slots }: PerformanceMetricsProps) {
    const [metrics, setMetrics] = useState<PerformanceMetric[]>([]);

    useEffect(() => {
        const newMetrics = calculatePerformanceMetrics(rep, slots);
        setMetrics(newMetrics);
    }, [rep, slots]);

    const chartData = {
        labels: ['SATISFACTION', 'EFFICIENCY', 'QUALITY'],
        datasets: [
            {
                label: 'PERFORMANCE SCORE',
                data: [
                    metrics.find(m => m.metric === 'satisfaction')?.value || 0,
                    metrics.find(m => m.metric === 'efficiency')?.value || 0,
                    metrics.find(m => m.metric === 'quality')?.value || 0,
                ],
                backgroundColor: [
                    'rgba(59, 130, 246, 0.8)',
                    'rgba(16, 185, 129, 0.8)',
                    'rgba(139, 92, 246, 0.8)',
                ],
                borderRadius: 12,
                barThickness: 40,
            },
        ],
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
            y: {
                beginAtZero: true,
                max: 100,
                grid: {
                    display: false,
                },
                ticks: {
                    font: {
                        family: 'Inter',
                        weight: 'bold',
                        size: 10,
                    },
                    color: '#94a3b8',
                }
            },
            x: {
                grid: {
                    display: false,
                },
                ticks: {
                    font: {
                        family: 'Inter',
                        weight: '900',
                        size: 9,
                    },
                    color: '#1e293b',
                    padding: 10,
                }
            }
        },
        plugins: {
            legend: {
                display: false,
            },
            tooltip: {
                backgroundColor: '#1E293B',
                titleFont: { size: 12, weight: 'bold' },
                bodyFont: { size: 10 },
                padding: 12,
                cornerRadius: 12,
                displayColors: false,
            }
        },
    };

    const getIcon = (metric: string) => {
        switch (metric) {
            case 'satisfaction': return <Star className="w-3.5 h-3.5 text-blue-500" />;
            case 'efficiency': return <Activity className="w-3.5 h-3.5 text-emerald-500" />;
            case 'quality': return <BarChart2 className="w-3.5 h-3.5 text-purple-500" />;
            default: return <Briefcase className="w-3.5 h-3.5 text-gray-400" />;
        }
    };

    return (
        <div className="bg-white rounded-3xl shadow-sm border border-gray-200 p-8 flex flex-col h-full">
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center">
                    <div className="p-2.5 bg-emerald-50 rounded-2xl mr-4 shadow-sm text-emerald-600">
                        <TrendingUp className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-gray-900 tracking-tight uppercase">PERFORMANCE METRICS</h2>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-0.5">Real-time Capability Assessment</p>
                    </div>
                </div>
            </div>

            <div className="flex-1 min-h-[220px] mb-8 relative">
                <div className="absolute inset-0 bg-gradient-to-t from-gray-50/50 to-transparent rounded-2xl -m-2 opacity-50" />
                <Bar data={chartData} options={chartOptions as any} />
            </div>

            <div className="grid grid-cols-3 gap-3">
                {metrics.map(metric => (
                    <div key={metric.metric} className="group p-4 bg-gray-50 rounded-2xl border border-transparent hover:border-blue-100 hover:bg-white transition-all duration-300">
                        <div className="flex items-center space-x-2 mb-2">
                            {getIcon(metric.metric)}
                            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest group-hover:text-gray-900 transition-colors">{metric.metric}</span>
                        </div>
                        <div className="text-2xl font-black text-gray-900 group-hover:text-blue-600 transition-colors">{Math.round(metric.value)}<span className="text-xs ml-0.5 font-bold">%</span></div>
                    </div>
                ))}
            </div>
        </div>
    );
}
