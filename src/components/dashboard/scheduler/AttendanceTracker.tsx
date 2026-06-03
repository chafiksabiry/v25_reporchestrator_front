import React, { useState } from 'react';
import { TimeSlot, Rep } from '../../../types/scheduler';
import { format } from 'date-fns';
import { CheckCircle, XCircle, Clock, AlertTriangle, Users, FileText, ChevronRight } from 'lucide-react';

interface AttendanceTrackerProps {
    slots: TimeSlot[];
    reps: Rep[];
    selectedDate: Date;
    onAttendanceUpdate: (slotId: string, attended: boolean, notes?: string) => void;
}

export function AttendanceTracker({ slots, reps, selectedDate, onAttendanceUpdate }: AttendanceTrackerProps) {
    const [expandedSlot, setExpandedSlot] = useState<string | null>(null);
    const [attendanceNotes, setAttendanceNotes] = useState<string>('');

    const dateSlots = slots.filter(
        slot =>
            slot.date === format(selectedDate, 'yyyy-MM-dd') &&
            slot.status === 'reserved'
    );

    const handleAttendanceToggle = (slot: TimeSlot, attended: boolean) => {
        onAttendanceUpdate(slot.id, attended, attendanceNotes);
        setExpandedSlot(null);
        setAttendanceNotes('');
    };

    const getRep = (repId: string): Rep | undefined => {
        return reps.find(r => r.id === repId);
    };

    if (dateSlots.length === 0) {
        return (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center">
                <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <Clock className="w-8 h-8 text-blue-400" />
                </div>
                <h2 className="text-xl font-black text-gray-900 mb-2 uppercase tracking-tight">ATTENDANCE</h2>
                <p className="text-sm font-bold text-gray-400 max-w-xs mx-auto">
                    No active sessions found for this date. Attendance can only be tracked for reserved slots.
                </p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center">
                    <div className="p-2 bg-blue-50 rounded-xl mr-3">
                        <Users className="w-5 h-5 text-blue-600" />
                    </div>
                    <h2 className="text-lg font-black text-gray-900 tracking-tight uppercase">DAILY ATTENDANCE</h2>
                </div>
                <div className="px-3 py-1 bg-blue-600 text-white text-[10px] font-black rounded-full shadow-lg shadow-blue-100">
                    {dateSlots.length} ACTIVE SLOTS
                </div>
            </div>

            <div className="divide-y divide-gray-50 max-h-[500px] overflow-y-auto no-scrollbar">
                {dateSlots.map(slot => {
                    const isExpanded = expandedSlot === slot.id;
                    const rep = getRep(slot.repId);

                    return (
                        <div key={slot.id} className="transition-all duration-300">
                            <div
                                className={`p-5 flex items-center justify-between cursor-pointer transition-colors ${isExpanded ? 'bg-blue-50/30' : 'hover:bg-gray-50/50'
                                    }`}
                                onClick={() => setExpandedSlot(isExpanded ? null : slot.id)}
                            >
                                <div className="flex items-center space-x-4">
                                    <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center overflow-hidden border border-gray-200">
                                        {rep?.avatar ? (
                                            <img src={rep.avatar} alt={rep.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <Users className="w-5 h-5 text-gray-400" />
                                        )}
                                    </div>
                                    <div>
                                        <div className="text-sm font-black text-gray-900 group-hover:text-blue-600 transition-colors">{rep?.name || 'Unknown REP'}</div>
                                        <div className="flex items-center text-[10px] font-bold text-gray-400 mt-0.5">
                                            <Clock className="w-3 h-3 mr-1" />
                                            {format(new Date(`${slot.date}T${slot.startTime}`), 'h:mm a')} - {format(new Date(`${slot.date}T${slot.endTime}`), 'h:mm a')}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center space-x-3">
                                    {slot.attended === true && (
                                        <div className="px-3 py-1 bg-emerald-100 text-emerald-700 text-[9px] font-black rounded-full flex items-center border border-emerald-200">
                                            <CheckCircle className="w-3 h-3 mr-1.5" />
                                            PRESENT
                                        </div>
                                    )}
                                    {slot.attended === false && (
                                        <div className="px-3 py-1 bg-rose-100 text-rose-700 text-[9px] font-black rounded-full flex items-center border border-rose-200">
                                            <XCircle className="w-3 h-3 mr-1.5" />
                                            MISSED
                                        </div>
                                    )}
                                    {slot.attended === undefined && (
                                        <div className="px-3 py-1 bg-gray-100 text-gray-500 text-[9px] font-black rounded-full flex items-center border border-gray-200">
                                            <AlertTriangle className="w-3 h-3 mr-1.5" />
                                            PENDING
                                        </div>
                                    )}
                                    <ChevronRight className={`w-4 h-4 text-gray-300 transition-transform duration-300 ${isExpanded ? 'rotate-90' : ''}`} />
                                </div>
                            </div>

                            {isExpanded && (
                                <div className="px-5 pb-5 pt-1 space-y-4">
                                    <div className="relative group/note">
                                        <label htmlFor="attendanceNotes" className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 pl-1">
                                            Review / Justification
                                        </label>
                                        <div className="relative">
                                            <FileText className="absolute top-3 left-4 w-4 h-4 text-gray-300 group-hover/note:text-blue-400 transition-colors" />
                                            <textarea
                                                id="attendanceNotes"
                                                value={attendanceNotes}
                                                onChange={(e) => setAttendanceNotes(e.target.value)}
                                                className="w-full bg-gray-50 border-gray-200 rounded-2xl text-xs font-medium text-gray-700 focus:ring-blue-500 focus:border-blue-500 py-3 pl-10 pr-4 min-h-[80px] resize-none"
                                                placeholder="Add context for this attendance status..."
                                            />
                                        </div>
                                    </div>

                                    <div className="flex space-x-3">
                                        <button
                                            onClick={() => handleAttendanceToggle(slot, true)}
                                            className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black uppercase tracking-widest rounded-xl flex items-center justify-center shadow-lg shadow-emerald-100 transition-all active:scale-95"
                                        >
                                            <CheckCircle className="w-4 h-4 mr-2" />
                                            Mark Present
                                        </button>
                                        <button
                                            onClick={() => handleAttendanceToggle(slot, false)}
                                            className="flex-1 py-3 px-4 bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-black uppercase tracking-widest rounded-xl flex items-center justify-center shadow-lg shadow-rose-100 transition-all active:scale-95"
                                        >
                                            <XCircle className="w-4 h-4 mr-2" />
                                            Mark Missed
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
