import { useState, useEffect } from 'react';
import { TimeSlot, WorkloadPrediction } from '../../../types/scheduler';
import { predictWorkload } from '../../../services/schedulerAiService';
import { LineChart, Calendar, TrendingUp, Info } from 'lucide-react';
import { Line } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
} from 'chart.js';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
);

interface WorkloadPredictionProps {
    slots: TimeSlot[];
}

export function WorkloadPredictionComponent({ slots }: WorkloadPredictionProps) {
    const [predictions, setPredictions] = useState<WorkloadPrediction[]>([]);

    useEffect(() => {
        const newPredictions = predictWorkload(slots);
        setPredictions(newPredictions);
    }, [slots]);

    const chartData = {
        labels: predictions.map(p => {
            const date = new Date(p.date);
            return `${date.getDate()}/${date.getMonth() + 1}`;
        }),
        datasets: [
            {
                label: 'FORECASTED HOURS',
                data: predictions.map(p => p.predictedHours),
                borderColor: '#8b5cf6',
                backgroundColor: 'rgba(139, 92, 246, 0.1)',
                fill: true,
                tension: 0.4,
                pointRadius: 4,
                pointBackgroundColor: '#fff',
                pointBorderWidth: 2,
            },
        ],
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: false,
            },
            tooltip: {
                backgroundColor: '#1E293B',
                titleFont: { size: 10, weight: 'bold' },
                bodyFont: { size: 12, weight: 'black' },
                padding: 12,
                cornerRadius: 12,
                displayColors: false,
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                grid: {
                    color: '#f1f5f9',
                },
                ticks: {
                    font: {
                        family: 'Inter',
                        weight: 'bold',
                        size: 9,
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
                        weight: 'black',
                        size: 9,
                    },
                    color: '#475569',
                }
            }
        }
    };

    return (
        <div className="bg-white rounded-3xl shadow-sm border border-gray-200 p-8">
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center">
                    <div className="p-2.5 bg-purple-50 rounded-2xl mr-4 shadow-sm text-purple-600">
                        <LineChart className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-gray-900 tracking-tight uppercase">CAPACITY FORECAST</h2>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-0.5">7-Day Workload Prediction Engine</p>
                    </div>
                </div>
            </div>

            <div className="h-64 mb-8">
                <Line data={chartData} options={chartOptions as any} />
            </div>

            <div className="group bg-gradient-to-r from-purple-600 to-indigo-600 p-6 rounded-3xl shadow-xl shadow-purple-100 flex items-start transition-all hover:scale-[1.02] duration-300">
                <div className="p-2 bg-white/20 rounded-xl mr-4 backdrop-blur-sm">
                    <TrendingUp className="w-5 h-5 text-white" />
                </div>
                <div>
                    <h4 className="text-[10px] font-black text-white/70 uppercase tracking-widest mb-1">HARX AI INSIGHT</h4>
                    <p className="text-sm font-bold text-white leading-relaxed">
                        Predicted volume surge on upcoming Tuesday. Distribution optimization recommended to maintain high quality scores across all active gigs.
                    </p>
                    <div className="mt-4 flex items-center text-[10px] font-black text-white/50 uppercase tracking-tighter">
                        <Info className="w-3 h-3 mr-1.5" />
                        Confidence Level: 84% based on 30-day lookback
                    </div>
                </div>
            </div>
        </div>
    );
}
