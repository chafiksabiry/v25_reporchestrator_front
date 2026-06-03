import { useState, useEffect } from 'react';
import { AIRecommendation, Gig, Rep, TimeSlot } from '../../../types/scheduler';
import { getGigRecommendations } from '../../../services/schedulerAiService';
import { Sparkles, Brain, ArrowRight, Target } from 'lucide-react';

interface AIRecommendationsProps {
    rep: Rep;
    gigs: Gig[];
    slots: TimeSlot[];
    onSelectGig: (gigId: string) => void;
}

export function AIRecommendations({ rep, gigs, slots, onSelectGig }: AIRecommendationsProps) {
    const [recommendations, setRecommendations] = useState<AIRecommendation[]>([]);
    const [loading, setLoading] = useState<boolean>(true);

    useEffect(() => {
        setLoading(true);

        const timer = setTimeout(() => {
            const newRecommendations = getGigRecommendations(rep, gigs, slots);
            setRecommendations(newRecommendations);
            setLoading(false);
        }, 800);

        return () => clearTimeout(timer);
    }, [rep, gigs, slots]);

    if (loading) {
        return (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-4">
                <div className="flex items-center space-x-3 mb-2">
                    <div className="w-6 h-6 bg-purple-100 rounded-full animate-pulse" />
                    <div className="h-5 bg-gray-100 rounded-full w-40 animate-pulse" />
                </div>
                {[1, 2].map(i => (
                    <div key={i} className="h-28 bg-gray-50 rounded-2xl animate-pulse" />
                ))}
            </div>
        );
    }

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center">
                    <div className="p-2 bg-purple-50 rounded-xl mr-3">
                        <Brain className="w-5 h-5 text-purple-600" />
                    </div>
                    <h2 className="text-lg font-black text-gray-900 tracking-tight">AI PREDICTIONS</h2>
                </div>
                <Sparkles className="w-5 h-5 text-amber-400 animate-pulse" />
            </div>

            {recommendations.length > 0 ? (
                <div className="space-y-4">
                    {recommendations.slice(0, 3).map(recommendation => {
                        const gig = gigs.find(p => p.id === recommendation.gigId);
                        if (!gig) return null;

                        return (
                            <div
                                key={recommendation.gigId}
                                className="group p-4 bg-gray-50 rounded-2xl border border-transparent hover:border-purple-200 hover:bg-white hover:shadow-xl hover:shadow-purple-50 transition-all duration-300 cursor-pointer relative overflow-hidden"
                                onClick={() => onSelectGig(recommendation.gigId)}
                            >
                                <div
                                    className="absolute left-0 top-0 bottom-0 w-1 bg-purple-500 scale-y-0 group-hover:scale-y-100 transition-transform duration-300"
                                />

                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center">
                                        <div
                                            className="w-2.5 h-2.5 rounded-full mr-2 shadow-sm"
                                            style={{ backgroundColor: gig.color }}
                                        ></div>
                                        <h3 className="text-sm font-black text-gray-900 group-hover:text-purple-700 transition-colors uppercase tracking-tight">{gig.name}</h3>
                                    </div>
                                    <div className="flex items-center">
                                        <div className="text-[10px] font-black px-2.5 py-1 rounded-full bg-purple-600 text-white shadow-lg shadow-purple-100 flex items-center">
                                            {Math.round(recommendation.confidence * 100)}% MATCH
                                        </div>
                                    </div>
                                </div>

                                <p className="text-xs font-medium text-gray-500 line-clamp-2 leading-relaxed mb-4 group-hover:text-gray-700 transition-colors">
                                    {recommendation.reason}
                                </p>

                                <div className="flex items-center justify-between">
                                    <div className="flex -space-x-1">
                                        {gig.skills.slice(0, 2).map((skill, idx) => (
                                            <div
                                                key={idx}
                                                className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md border ${rep.specialties.some(s => s.toLowerCase().includes(skill.toLowerCase()))
                                                        ? 'bg-green-50 text-green-700 border-green-100'
                                                        : 'bg-white text-gray-400 border-gray-100'
                                                    }`}
                                            >
                                                {skill}
                                            </div>
                                        ))}
                                    </div>
                                    <div className="flex items-center text-purple-600 text-xs font-black opacity-0 group-hover:opacity-100 transition-opacity translate-x-4 group-hover:translate-x-0 transform duration-300">
                                        RESERVE <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center py-10 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                    <Target className="w-8 h-8 text-gray-300 mb-3" />
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest text-center px-6">
                        Gathering data for smarter project matches...
                    </p>
                </div>
            )}
        </div>
    );
}
