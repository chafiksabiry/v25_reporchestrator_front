import React, { useState } from 'react';
import { format } from 'date-fns';
import { TimeSlot, Gig } from '../../../types/scheduler';
import { X, Clock, Check, Calendar, Building } from 'lucide-react';

interface TimeSlotGridProps {
    date: Date;
    slots: TimeSlot[];
    gigs: Gig[];
    onSlotUpdate: (slot: TimeSlot) => void;
    onSlotCancel: (slotId: string) => void;
    onSlotSelect?: (slot: TimeSlot) => void;
    selectedGigId: string;
    onGigFilterChange: (gigId: string) => void;
    draftSlots?: Partial<TimeSlot>[];
    onTimeSelect?: (time: string) => void;
    draftSlotNotes?: Record<string, string>;
    onDraftNotesChange?: (time: string, value: string) => void;
    allowAddSlots?: boolean;
}

export function TimeSlotGrid({
    date,
    slots,
    gigs,
    onSlotUpdate,
    onSlotCancel,
    onSlotSelect,
    selectedGigId,
    draftSlots = [],
    onTimeSelect,
    draftSlotNotes,
    onDraftNotesChange,
    allowAddSlots = true,
}: TimeSlotGridProps) {
    const timeSlots = Array.from({ length: 24 }, (_, i) => `${i.toString().padStart(2, '0')}:00`);
    const daySlots = slots.filter((slot) => slot.date === format(date, 'yyyy-MM-dd'));
    const [showCancelled] = useState<boolean>(false);
    const [localDraftSlotNotes, setLocalDraftSlotNotes] = useState<Record<string, string>>({});

    const filteredSlots = daySlots.filter(slot => slot.gigId === selectedGigId);

    const displaySlots = showCancelled
        ? filteredSlots
        : filteredSlots.filter(slot => slot.status !== 'cancelled');

    const isPreviewed = (time: string) => {
        return draftSlots.some(s => s.date === format(date, 'yyyy-MM-dd') && s.startTime === time);
    };

    const getDraftSlotForTime = (time: string): Partial<TimeSlot> | undefined => {
        return draftSlots.find(s => s.date === format(date, 'yyyy-MM-dd') && s.startTime === time);
    };

    const isHourAvailable = (hour: string) => {
        const gig = gigs.find(p => p.id === selectedGigId);
        if (!gig || !gig.availability?.schedule) return true;

        const dayName = format(date, 'EEEE');
        const daySchedule = gig.availability.schedule.find(
            s => s.day.toLowerCase() === dayName.toLowerCase()
        );

        if (!daySchedule) return false;

        const slotHour = parseInt(hour.split(':')[0]);
        const startHour = parseInt(daySchedule.hours.start.split(':')[0]);
        const endHour = parseInt(daySchedule.hours.end.split(':')[0]);

        return slotHour >= startHour && slotHour < endHour;
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">

            <div className="divide-y divide-gray-50">
                {timeSlots
                    .filter(time => displaySlots.some(s => s.startTime === time) || isPreviewed(time))
                    .map((time) => {
                        const slot = displaySlots.find((s) => s.startTime === time);
                        const available = isHourAvailable(time);

                        return (
                            <div
                                key={time}
                                id={`time-slot-${parseInt(time)}`}
                                className={`flex items-start p-5 transition-all duration-200 border-b border-gray-50 last:border-0 ${slot?.status === 'reserved' ? 'bg-blue-50/40' : slot?.status === 'available' ? 'bg-emerald-50/20' : isPreviewed(time) ? 'bg-blue-50/60 ring-2 ring-blue-600/10 ring-inset' : 'hover:bg-gray-50/30'
                                    }`}
                                onClick={() => slot && onSlotSelect && onSlotSelect(slot)}
                            >
                                <div className="w-20 pt-1">
                                    <span className={`text-sm font-black ${slot ? 'text-blue-900' : isPreviewed(time) ? 'text-blue-600' : 'text-gray-400'}`}>
                                        {time}
                                    </span>
                                </div>

                                <div className="flex-1">
                                    {slot ? (
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1 space-y-3">
                                                <div className="flex items-center space-x-4">
                                                    <div className="relative flex-1 max-w-sm">
                                                        <select
                                                            value={slot.gigId || ''}
                                                            onChange={(e) =>
                                                                onSlotUpdate({ ...slot, gigId: e.target.value || undefined })
                                                            }
                                                            className="w-full bg-white border border-blue-200 rounded-xl text-sm font-bold text-gray-800 focus:ring-2 focus:ring-blue-400 py-2 pl-4 pr-10 appearance-none shadow-sm"
                                                            disabled={slot.status === 'cancelled'}
                                                        >
                                                            <option value="">Select a gig...</option>
                                                            {gigs.map((g) => (
                                                                <option key={g.id} value={g.id}>
                                                                    {g.name}
                                                                </option>
                                                            ))}
                                                        </select>
                                                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-blue-600 rounded-r-lg" />
                                                    </div>

                                                    <div className="flex items-center bg-white border border-blue-100 rounded-xl px-3 py-2 shadow-sm">
                                                        <Clock className="w-4 h-4 text-gray-400 mr-2" />
                                                        <select
                                                            value={slot.duration}
                                                            onChange={(e) =>
                                                                onSlotUpdate({ ...slot, duration: parseInt(e.target.value) })
                                                            }
                                                            className="bg-transparent border-none text-sm font-bold text-gray-700 focus:ring-0 p-0 appearance-none pr-6"
                                                            disabled={slot.status === 'cancelled'}
                                                        >
                                                            {[1, 2, 3, 4].map((hours) => (
                                                                <option key={hours} value={hours}>
                                                                    {hours} hour{hours > 1 ? 's' : ''}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </div>

                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            const isReserving = slot.status !== 'reserved';
                                                            onSlotUpdate({
                                                                ...slot,
                                                                status: isReserving ? 'reserved' : 'available',
                                                                notes: isReserving ? (slot.notes ?? '') : slot.notes
                                                            });
                                                        }}
                                                        disabled={slot.status === 'cancelled' || (slot.status === 'available' && slot.reservedCount !== undefined && slot.capacity !== undefined && slot.reservedCount >= slot.capacity)}
                                                        className={`px-4 py-2 text-xs font-black rounded-xl flex items-center border shadow-sm transition-all ${slot.status === 'reserved'
                                                            ? 'bg-blue-100/50 text-blue-600 border-blue-200 hover:bg-blue-100'
                                                            : slot.status === 'available'
                                                                ? 'bg-emerald-100/50 text-emerald-600 border-emerald-200 hover:bg-emerald-100'
                                                                : 'bg-gray-100 text-gray-500 border-gray-200'
                                                            }`}
                                                    >
                                                        {slot.status === 'reserved' ? (
                                                            <>
                                                                <Check className="w-3.5 h-3.5 mr-1.5" />
                                                                Reserved
                                                            </>
                                                        ) : slot.status === 'available' ? (
                                                            <>
                                                                <Calendar className="w-3.5 h-3.5 mr-1.5" />
                                                                {slot.capacity && slot.capacity > 1 ? (
                                                                    <span>
                                                                        Reserve ({slot.capacity - (slot.reservedCount || 0)} left)
                                                                    </span>
                                                                ) : (
                                                                    "Reserve"
                                                                )}
                                                            </>
                                                        ) : (
                                                            "Full"
                                                        )}
                                                    </button>
                                                </div>

                                                {slot.companyNotes && (
                                                    <div className="space-y-2 pl-1">
                                                        <div className="flex items-center gap-2">
                                                            <div className="p-1 bg-gray-100 rounded">
                                                                <Building className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                                            </div>
                                                            <div className="bg-gray-100 border border-gray-200 rounded-lg px-3 py-1.5 text-xs font-medium text-gray-500 flex-1 italic">
                                                                {slot.companyNotes}
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onSlotCancel(slot.id);
                                                }}
                                                className="ml-6 p-2 text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                                disabled={slot.status === 'cancelled'}
                                            >
                                                <X className="w-5 h-5" />
                                            </button>
                                        </div>
                                    ) : isPreviewed(time) ? (
                                        (() => {
                                            const draftSlot = getDraftSlotForTime(time);
                                            const draftGigId = draftSlot?.gigId || selectedGigId;
                                            const draftGig = gigs.find(g => g.id === draftGigId);
                                            return (
                                                <div className="flex items-start justify-between">
                                                    <div className="flex-1 space-y-3">
                                                        <div className="flex items-center space-x-4">
                                                            <div className="relative flex-1 max-w-sm">
                                                                <div className="w-full bg-white border border-blue-200 rounded-xl text-sm font-bold text-gray-800 py-2 pl-4 pr-10 shadow-sm">
                                                                    {draftGig ? draftGig.name : 'Select a gig'}
                                                                </div>
                                                                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-blue-600 rounded-r-lg" />
                                                            </div>
                                                            <div className="flex items-center bg-white border border-blue-100 rounded-xl px-3 py-2 shadow-sm">
                                                                <Clock className="w-4 h-4 text-gray-400 mr-2" />
                                                                <span className="text-sm font-bold text-gray-700">
                                                                    {draftSlot?.duration ?? 1} hour{(draftSlot?.duration ?? 1) > 1 ? 's' : ''}
                                                                </span>
                                                            </div>
                                                            <button
                                                                className="px-4 py-2 text-xs font-black rounded-xl flex items-center border shadow-sm bg-blue-100/50 text-blue-600 border-blue-200 hover:bg-blue-100"
                                                            >
                                                                <Check className="w-3.5 h-3.5 mr-1.5" />
                                                                Reserved
                                                            </button>
                                                        </div>
                                                        <div className="flex items-center pl-1 gap-2 flex-wrap">
                                                            <input
                                                                type="text"
                                                                value={draftSlotNotes ? (draftSlotNotes[format(date, 'yyyy-MM-dd') + ':' + time] ?? '') : (localDraftSlotNotes?.[time] ?? '')}
                                                                onChange={(e) => {
                                                                    const val = e.target.value;
                                                                    if (onDraftNotesChange) onDraftNotesChange(time, val);
                                                                    else setLocalDraftSlotNotes(prev => ({ ...prev, [time]: val }));
                                                                }}
                                                                onClick={(e) => e.stopPropagation()}
                                                                placeholder="Add notes..."
                                                                className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-sm font-medium text-gray-800 placeholder-gray-500 focus:ring-2 focus:ring-blue-200 focus:border-blue-300 flex-1 min-w-[140px]"
                                                            />
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            onTimeSelect?.(time);
                                                        }}
                                                        className="ml-6 p-2 text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                                    >
                                                        <X className="w-5 h-5" />
                                                    </button>
                                                </div>
                                            );
                                        })()
                                    ) : !allowAddSlots ? (
                                        <div className="flex items-center text-gray-400 text-sm">
                                            Past day — viewing only
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-between">
                                            <button
                                                onClick={(e) => {
                                                    if (!available) return;
                                                    e.stopPropagation();
                                                    onTimeSelect?.(time);
                                                }}
                                                className={`flex items-center transition-all ${available
                                                    ? 'text-blue-600 hover:text-blue-800'
                                                    : 'text-gray-200 cursor-not-allowed hidden'
                                                    }`}
                                                disabled={!available}
                                            >
                                                <span className="text-sm font-black flex items-center">
                                                    <span className="text-lg mr-2">+</span>
                                                    Add slot
                                                </span>
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
            </div>
        </div>
    );
}
