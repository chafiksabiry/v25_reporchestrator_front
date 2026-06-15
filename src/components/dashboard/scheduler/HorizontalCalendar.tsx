import React, { useState } from 'react';
import { format, startOfWeek, addDays, isSameDay, addWeeks, subWeeks } from 'date-fns';
import { fr } from 'date-fns/locale';
import { TimeSlot } from '../../../types/scheduler';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';

interface HorizontalCalendarProps {
    selectedDate: Date;
    onDateSelect: (date: Date) => void;
    slots: TimeSlot[];
    selectedGigId: string | null;
}

export function HorizontalCalendar({ selectedDate, onDateSelect, slots, selectedGigId }: HorizontalCalendarProps) {
    const [baseDate, setBaseDate] = useState(new Date());
    const today = new Date();
    const startDate = startOfWeek(baseDate, { weekStartsOn: 1 });
    const weekDays = Array.from({ length: 14 }, (_, i) => addDays(startDate, i));

    const nextPeriod = () => setBaseDate(addWeeks(baseDate, 2));
    const prevPeriod = () => setBaseDate(subWeeks(baseDate, 2));

    return (
        <div className="bg-white rounded-xl shadow-sm border border-harx-100 p-4">
            <div className="flex items-center justify-between mb-4 px-0.5">
                <div className="flex items-center space-x-3">
                    <div className="p-2 bg-harx-50 rounded-xl">
                        <CalendarIcon className="w-5 h-5 text-harx-600" />
                    </div>
                    <div>
                        <h2 className="text-lg font-black text-gray-900">Calendrier</h2>
                        <p className="text-xs text-gray-500 mt-0.5">Aperçu sur 14 jours</p>
                    </div>
                </div>
                <div className="flex items-center space-x-3">
                    <div className="hidden md:flex space-x-3 bg-harx-50/30 p-1 rounded-xl border border-harx-100">
                        <div className="flex items-center text-[10px] font-bold text-gray-500 px-3">
                            <div className="w-2 h-2 rounded-full bg-harx-600 mr-2 shadow-sm"></div>
                            Réservés
                        </div>
                        <div className="flex items-center text-[10px] font-bold text-gray-500 px-3 border-l border-gray-200">
                            <div className="w-2 h-2 rounded-full bg-harx-300 mr-2 shadow-sm"></div>
                            Disponibles
                        </div>
                    </div>

                    <div className="flex bg-gray-100 rounded-xl p-1 space-x-1 border border-gray-200 shadow-inner">
                        <button
                            onClick={prevPeriod}
                            className="p-1.5 hover:bg-white hover:text-harx-600 hover:shadow rounded-lg transition-all duration-300 text-gray-500"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <button
                            onClick={nextPeriod}
                            className="p-1.5 hover:bg-white hover:text-harx-600 hover:shadow rounded-lg transition-all duration-300 text-gray-500"
                        >
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-7 gap-2.5">
                {weekDays.map((day) => {
                    const isSelected = isSameDay(day, selectedDate);
                    const isToday = isSameDay(day, today);
                    const daySlots = slots.filter(s =>
                        s.date === format(day, 'yyyy-MM-dd') &&
                        (!selectedGigId || s.gigId === selectedGigId)
                    );
                    const reservedSlots = daySlots.filter(s => s.status === 'reserved').length;
                    const availableSlots = daySlots.reduce((acc, s) => acc + (s.status === 'available' ? (s.capacity || 1) - (s.reservedCount || 0) : 0), 0);

                    return (
                        <button
                            key={day.toString()}
                            onClick={() => onDateSelect(day)}
                            className={`group relative flex flex-col items-center py-4 px-2 rounded-xl transition-all duration-300 ${isSelected
                                ? 'bg-harx-600 text-white shadow-lg shadow-harx-500/30 scale-[1.02] ring-2 ring-harx-100 z-10'
                                : 'bg-white hover:bg-gray-50 text-gray-600 border border-gray-100 border-transparent hover:border-harx-100'
                                }`}
                        >
                            {isToday && !isSelected && (
                                <div className="absolute top-2 right-2 w-1.5 h-1.5 bg-harx-500 rounded-full animate-ping"></div>
                            )}

                            <span className={`text-[10px] font-black uppercase mb-1.5 tracking-tighter ${isSelected ? 'text-harx-100' : 'text-gray-400 group-hover:text-gray-500'}`}>
                                {format(day, 'EEE', { locale: fr })}
                            </span>
                            <span className={`text-2xl font-black mb-2 tabular-nums ${isSelected ? 'text-white' : 'text-gray-900'}`}>
                                {format(day, 'd')}
                            </span>

                            <div className="flex flex-col space-y-1 w-full mt-auto">
                                {reservedSlots > 0 && (
                                    <div className={`h-1 rounded-full transition-all duration-500 ${isSelected ? 'bg-white/40' : 'bg-harx-100 group-hover:bg-harx-200'} w-full`}>
                                        <div
                                            className={`h-full rounded-full ${isSelected ? 'bg-white' : 'bg-harx-600'}`}
                                            style={{ width: `${Math.min(100, (reservedSlots / (daySlots.length || 1)) * 100)}%` }}
                                        ></div>
                                    </div>
                                )}
                                {availableSlots > 0 && (
                                    <div className={`h-1 rounded-full transition-all duration-500 ${isSelected ? 'bg-white/20' : 'bg-harx-100/70 group-hover:bg-harx-200'} w-full`}>
                                        <div
                                            className={`h-full rounded-full ${isSelected ? 'bg-white/60' : 'bg-harx-400'}`}
                                            style={{ width: `${Math.min(100, (availableSlots / (daySlots.length || 1)) * 100)}%` }}
                                        ></div>
                                    </div>
                                )}
                                {daySlots.length === 0 && (
                                    <div className={`h-1 rounded-full ${isSelected ? 'bg-white/10' : 'bg-gray-100'} w-full`}></div>
                                )}
                            </div>

                            <span className={`text-[9px] font-black mt-1.5 uppercase tracking-tighter ${isSelected ? 'text-harx-100' : 'text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap'}`}>
                                {daySlots.length} créneau{daySlots.length !== 1 ? 'x' : ''}
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
