import React, { useState, useEffect } from 'react';
import { format, startOfWeek, addDays, startOfMonth, endOfMonth, endOfWeek, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns';
import { TimeSlot } from '../../../types/scheduler';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock } from 'lucide-react';

interface CalendarProps {
    selectedDate: Date;
    onDateSelect: (date: Date) => void;
    slots: TimeSlot[];
    view?: 'week' | 'month' | '2-weeks';
}

export function Calendar({ selectedDate, onDateSelect, slots, view = 'month' }: CalendarProps) {
    const [currentMonth, setCurrentMonth] = useState(view === '2-weeks' ? selectedDate : startOfMonth(selectedDate));

    // Sync currentMonth if selectedDate changes drastically
    useEffect(() => {
        if (view === '2-weeks') {
            // For 2-weeks view, only sync if selectedDate is outside the current 14-day window
            const start = startOfWeek(currentMonth);
            const end = addDays(start, 13);
            if (selectedDate < start || selectedDate > end) {
                setCurrentMonth(selectedDate);
            }
        } else if (!isSameMonth(currentMonth, selectedDate)) {
            setCurrentMonth(startOfMonth(selectedDate));
        }
    }, [selectedDate, view]);

    const nextPeriod = () => {
        if (view === '2-weeks') {
            setCurrentMonth(addDays(currentMonth, 14));
        } else {
            setCurrentMonth(addMonths(currentMonth, 1));
        }
    };

    const prevPeriod = () => {
        if (view === '2-weeks') {
            setCurrentMonth(addDays(currentMonth, -14));
        } else {
            setCurrentMonth(subMonths(currentMonth, 1));
        }
    };

    const renderHeader = () => {
        return (
            <div className="flex items-center justify-between mb-6 px-2">
                <div className="flex items-center space-x-4">
                    <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                        <CalendarIcon className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-gray-900 tracking-tight">
                            {view === '2-weeks'
                                ? `${format(startOfWeek(currentMonth), 'MMMM d')} - ${format(addDays(startOfWeek(currentMonth), 13), 'MMMM d, yyyy')}`
                                : format(currentMonth, 'MMMM yyyy')}
                        </h2>
                        <div className="flex items-center mt-1">
                            <div className="w-2 h-2 rounded-full bg-green-500 mr-2 animate-pulse"></div>
                            <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Live Schedule Overview</p>
                        </div>
                    </div>
                </div>
                <div className="flex bg-gray-100 rounded-lg p-1 space-x-1">
                    <button
                        onClick={prevPeriod}
                        className="p-2 hover:bg-white hover:shadow-sm rounded-md transition-all text-gray-600 hover:text-gray-900"
                        aria-label="Previous"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                        onClick={nextPeriod}
                        className="p-2 hover:bg-white hover:shadow-sm rounded-md transition-all text-gray-600 hover:text-gray-900"
                        aria-label="Next"
                    >
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>
            </div>
        );
    };

    const renderDays = () => {
        const days = [];
        const dateFormat = "EEEE";
        const startDate = startOfWeek(currentMonth);

        for (let i = 0; i < 7; i++) {
            days.push(
                <div className="text-center font-bold text-gray-400 text-[10px] uppercase tracking-[0.2em] py-4" key={i}>
                    {format(addDays(startDate, i), dateFormat)}
                </div>
            );
        }
        return <div className="grid grid-cols-7 mb-4 bg-gray-50/50 rounded-t-xl">{days}</div>;
    };

    const renderCells = () => {
        let startDate, endDate;
        const monthStart = startOfMonth(currentMonth);

        if (view === '2-weeks') {
            startDate = startOfWeek(currentMonth);
            endDate = addDays(startDate, 13);
        } else {
            const monthEnd = endOfMonth(monthStart);
            startDate = startOfWeek(monthStart);
            endDate = endOfWeek(monthEnd);
        }

        const dateFormat = "d";
        const rows = [];
        let days = [];
        let day = startDate;
        let formattedDate = "";

        while (day <= endDate) {
            for (let i = 0; i < 7; i++) {
                formattedDate = format(day, dateFormat);
                const cloneDay = day;
                const isSelected = isSameDay(day, selectedDate);
                const isCurrentMonth = isSameMonth(day, monthStart);
                const isToday = isSameDay(day, new Date());

                const daySlots = slots.filter(slot => slot.date === format(cloneDay, 'yyyy-MM-dd'));
                const reservedCount = daySlots.filter(s => s.status === 'reserved').length;
                const availableCount = daySlots.filter(s => s.status === 'available').length;

                days.push(
                    <button
                        key={day.toString()}
                        onClick={() => onDateSelect(cloneDay)}
                        className={`
                            min-h-[140px] p-4 border border-gray-100 flex flex-col justify-start transition-all duration-300 relative group
                            ${!isCurrentMonth ? 'bg-gray-50/30 text-gray-300' : 'bg-white text-gray-700'}
                            ${isSelected ? 'ring-2 ring-blue-600 shadow-xl z-10 bg-blue-50/30' : 'hover:bg-gray-50/80 hover:scale-[1.02] hover:z-10 hover:shadow-lg'}
                        `}
                    >
                        <div className="flex justify-between items-start w-full mb-3">
                            <span className={`
                                text-sm font-black rounded-xl w-10 h-10 flex items-center justify-center transition-all duration-300
                                ${isToday ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : isSelected ? 'bg-blue-100 text-blue-700' : 'bg-transparent text-gray-900 group-hover:bg-white group-hover:shadow-sm'}
                            `}>
                                {formattedDate}
                            </span>
                            {isToday && (
                                <span className="flex h-2 w-2 relative">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                                </span>
                            )}
                        </div>

                        <div className="w-full space-y-2 mt-auto">
                            {daySlots.length > 0 && (
                                <>
                                    {reservedCount > 0 && (
                                        <div className="flex items-center justify-between text-[10px] px-2.5 py-1.5 bg-purple-50 text-purple-700 rounded-lg border border-purple-100 shadow-sm transition-all">
                                            <div className="flex items-center">
                                                <Clock className="w-3 h-3 mr-1.5 font-bold" />
                                                <span className="font-extrabold">{reservedCount}</span>
                                                <span className="ml-1 font-bold uppercase tracking-tight opacity-70">Booked</span>
                                            </div>
                                            <div className="w-1.5 h-1.5 rounded-full bg-purple-400"></div>
                                        </div>
                                    )}
                                    {availableCount > 0 && (
                                        <div className="flex items-center justify-between text-[10px] px-2.5 py-1.5 bg-green-50 text-green-700 rounded-lg border border-green-100 shadow-sm transition-all">
                                            <div className="flex items-center">
                                                <div className="w-2 h-2 rounded-full bg-green-500 mr-2 shadow-sm shadow-green-200"></div>
                                                <span className="font-extrabold">{availableCount}</span>
                                                <span className="ml-1 font-bold uppercase tracking-tight opacity-70">Open</span>
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </button>
                );
                day = addDays(day, 1);
            }
            rows.push(
                <div className="grid grid-cols-7 border-l border-t border-gray-100 overflow-hidden" key={day.toString()}>
                    {days}
                </div>
            );
            days = [];
        }
        return <div className="border border-gray-200 rounded-2xl overflow-hidden bg-white shadow-2xl transition-all duration-500 hover:shadow-blue-900/10">{rows}</div>;
    };

    return (
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 transition-all hover:shadow-2xl">
            {renderHeader()}
            <div className="relative">
                {renderDays()}
                {renderCells()}
            </div>
            <div className="mt-6 flex items-center justify-end space-x-6 text-xs font-semibold text-gray-500 bg-gray-50 p-3 rounded-xl border border-gray-100">
                <div className="flex items-center">
                    <div className="w-2.5 h-2.5 rounded-full bg-blue-500 mr-2 shadow-sm shadow-blue-200"></div>
                    <span>Today</span>
                </div>
                <div className="flex items-center">
                    <div className="w-2.5 h-2.5 rounded-full bg-purple-500 mr-2 shadow-sm shadow-purple-200"></div>
                    <span>Booked Sessions</span>
                </div>
                <div className="flex items-center">
                    <div className="w-2.5 h-2.5 rounded-full bg-green-500 mr-2 shadow-sm shadow-green-200"></div>
                    <span>Open Slots</span>
                </div>
            </div>
        </div>
    );
}
