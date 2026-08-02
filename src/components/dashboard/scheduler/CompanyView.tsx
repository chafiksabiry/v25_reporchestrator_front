import React, { useMemo } from 'react';
import { format } from 'date-fns';
import { TimeSlot, Gig, Rep } from '../../../types/scheduler';
import { Building, Clock, Users, ChevronRight, Layout } from 'lucide-react';

interface CompanyViewProps {
    company: string;
    slots: TimeSlot[];
    gigs: Gig[];
    reps: Rep[];
    selectedDate: Date;
}

export function CompanyView({ company, slots, gigs, reps, selectedDate }: CompanyViewProps) {
    const relevantSlots = useMemo(() => {
        return slots.filter(slot => {
            const gig = gigs.find(p => p.id === slot.gigId);
            return gig?.company === company &&
                slot.date === format(selectedDate, 'yyyy-MM-dd') &&
                slot.status === 'reserved';
        });
    }, [slots, gigs, company, selectedDate]);

    const repHours = useMemo(() => {
        const hours: Record<string, number> = {};

        relevantSlots.forEach(slot => {
            if (!hours[slot.repId]) {
                hours[slot.repId] = 0;
            }
            hours[slot.repId] += slot.duration;
        });

        return hours;
    }, [relevantSlots]);

    const totalHours = Object.values(repHours).reduce((sum, hours) => sum + hours, 0);

    return (
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-8 border-b border-gray-50 flex items-center justify-between bg-gradient-to-r from-gray-50 to-white">
                <div className="flex items-center">
                    <div className="p-3 bg-blue-600 rounded-2xl mr-4 shadow-xl shadow-blue-100">
                        <Building className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-gray-900 tracking-tight uppercase">{company}</h2>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-0.5">Partner Operations Dashboard</p>
                    </div>
                </div>
                <div className="flex items-center space-x-6">
                    <div className="text-right">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Daily Hours</p>
                        <p className="text-3xl font-black text-blue-600 leading-none mt-1">{totalHours}<span className="text-sm ml-1">HRS</span></p>
                    </div>
                </div>
            </div>

            <div className="p-8">
                <div className="flex items-center justify-between mb-8">
                    <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest flex items-center">
                        <Clock className="w-4 h-4 mr-2 text-blue-600" />
                        Live Schedule • {format(selectedDate, 'MMMM d')}
                    </h3>
                    <div className="px-3 py-1 bg-green-50 text-green-700 text-[10px] font-black rounded-full border border-green-100">
                        {relevantSlots.length} ACTIVE SESSIONS
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-6">
                    {Object.entries(repHours).map(([repId, hours]) => {
                        const rep = reps.find(r => r.id === repId);
                        if (!rep) return null;

                        const repSlots = relevantSlots.filter(slot => slot.repId === repId);

                        return (
                            <div key={repId} className="group bg-gray-50 rounded-3xl p-6 border border-transparent hover:border-blue-100 hover:bg-white hover:shadow-xl hover:shadow-blue-50/50 transition-all duration-300">
                                <div className="flex items-center justify-between mb-6">
                                    <div className="flex items-center">
                                        <div className="relative">
                                            <div className="w-14 h-14 rounded-2xl bg-white shadow-sm flex items-center justify-center overflow-hidden border border-gray-100 group-hover:scale-105 transition-transform duration-300">
                                                {rep.avatar ? (
                                                    <img src={rep.avatar} alt={rep.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    <Users className="w-6 h-6 text-gray-200" />
                                                )}
                                            </div>
                                            <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-4 border-gray-50 group-hover:border-white transition-colors" />
                                        </div>
                                        <div className="ml-5">
                                            <h4 className="text-lg font-black text-gray-900 group-hover:text-blue-600 transition-colors uppercase tracking-tight">{rep.name}</h4>
                                            <div className="flex flex-wrap gap-2 mt-1">
                                                {rep.specialties.slice(0, 2).map((s, i) => (
                                                    <span key={i} className="text-[10px] font-bold text-gray-400 bg-white px-2 py-0.5 rounded-lg border border-gray-100 uppercase tracking-tighter">{s}</span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-2xl font-black text-gray-900">{hours}<span className="text-xs ml-1 font-bold text-gray-400">H</span></div>
                                        <div className="text-[10px] font-black text-blue-600 uppercase tracking-widest mt-1 bg-blue-50 px-2 py-0.5 rounded-lg">{repSlots.length} SLOTS</div>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    {repSlots.map(slot => {
                                        const gig = gigs.find(p => p.id === slot.gigId);

                                        return (
                                            <div
                                                key={slot.id}
                                                className="flex items-center justify-between p-4 bg-white rounded-2xl border border-gray-100 group-hover:border-blue-50 transition-all shadow-sm group/slot hover:shadow-md"
                                            >
                                                <div className="flex items-center">
                                                    <div className="w-1 h-8 rounded-full mr-4" style={{ backgroundColor: gig?.color || '#3b82f6' }} />
                                                    <div>
                                                        <div className="text-xs font-black text-gray-900 uppercase tracking-tight">{gig?.name}</div>
                                                        <div className="text-[10px] font-bold text-gray-400 mt-0.5 flex items-center">
                                                            <Clock className="w-3 h-3 mr-1" />
                                                            {slot.startTime} - {slot.endTime}
                                                        </div>
                                                    </div>
                                                </div>
                                                {slot.notes && (
                                                    <div className="hidden md:flex items-center px-4 py-1.5 bg-gray-50 rounded-xl text-[10px] font-medium text-gray-500 italic border border-transparent group-hover/slot:border-gray-100 transition-all">
                                                        "{slot.notes}"
                                                    </div>
                                                )}
                                                <ChevronRight className="w-4 h-4 text-gray-200 group-hover/slot:text-blue-300 transition-colors" />
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}

                    {Object.keys(repHours).length === 0 && (
                        <div className="flex flex-col items-center justify-center py-20 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
                            <Users className="w-12 h-12 text-gray-200 mb-4" />
                            <p className="text-sm font-black text-gray-400 uppercase tracking-widest">No REPs Active in this Window</p>
                        </div>
                    )}
                </div>
            </div>

            <div className="px-8 py-8 bg-gray-50/50 border-t border-gray-100">
                <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-6 flex items-center">
                    <Layout className="w-4 h-4 mr-2" />
                    Associated Gigs
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {gigs.slice(0, 3).map(gig => (
                        <div
                            key={gig.id}
                            className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 hover:shadow-lg transition-all relative overflow-hidden group"
                        >
                            <div className="absolute top-0 right-0 w-16 h-1 bg-gradient-to-l from-blue-600 to-indigo-600 scale-x-0 group-hover:scale-x-100 transition-transform origin-right duration-300" />
                            <h4 className="text-sm font-black text-gray-900 group-hover:text-blue-600 transition-colors uppercase tracking-tight">{gig.name}</h4>
                            <p className="text-[10px] font-medium text-gray-500 mt-2 line-clamp-2 leading-relaxed">{gig.description}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
