import React, { useState, useEffect, useMemo } from 'react';
import { format, startOfWeek, addDays, isSameDay } from 'date-fns';
import { TimeSlot, Gig } from '../../../types/scheduler';
import { Clock, Calendar, Save, Check, Plus } from 'lucide-react';
import { schedulerApi } from '../../../services/api/scheduler';
import { getAgentId } from '../../../utils/authUtils';

interface PlanningMatrixProps {
    selectedDate: Date;
    gigId: string;
    slots: TimeSlot[];
    onRefresh: () => void;
    gigs: Gig[];
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export function PlanningMatrix({ selectedDate, gigId, slots, onRefresh, gigs }: PlanningMatrixProps) {
    const [localMatrix, setLocalMatrix] = useState<Record<string, Record<number, boolean>>>({});
    const [isSaving, setIsSaving] = useState(false);
    const agentId = getAgentId();

    const selectedGig = useMemo(() => gigs.find(g => g.id === gigId), [gigs, gigId]);

    const hoursList = useMemo(() => {
        let minH = 9;
        let maxH = 19;
        const schedule = selectedGig?.availability?.schedule || [];
        if (schedule && schedule.length > 0) {
            schedule.forEach((entry: any) => {
                const startHour = Number.parseInt(String(entry.hours?.start || '').slice(0, 2), 10);
                const endHour = Number.parseInt(String(entry.hours?.end || '').slice(0, 2), 10);
                if (!Number.isNaN(startHour) && startHour < minH) {
                    minH = startHour;
                }
                if (!Number.isNaN(endHour) && endHour > maxH) {
                    maxH = endHour;
                }
            });
        }
        const length = maxH - minH + 1;
        return Array.from({ length: length > 0 ? length : 11 }, (_, i) => i + minH);
    }, [selectedGig]);

    const weekStart = useMemo(() => {
        try {
            const date = selectedDate instanceof Date ? selectedDate : new Date(selectedDate);
            return startOfWeek(date, { weekStartsOn: 1 });
        } catch (e) {
            console.error('Error calculating weekStart:', e);
            return new Date();
        }
    }, [selectedDate]);

    const weekDates = useMemo(() => {
        return DAYS.map((_, i) => addDays(weekStart, i));
    }, [weekStart]);

    // Initialize/Sync local matrix with existing reservations
    useEffect(() => {
        const matrix: Record<string, Record<number, boolean>> = {};

        weekDates.forEach(date => {
            const dateStr = format(date, 'yyyy-MM-dd');
            matrix[dateStr] = {};
            hoursList.forEach(hour => {
                const timeStr = `${hour.toString().padStart(2, '0')}:00`;
                const slot = slots.find(s =>
                    s.date === dateStr &&
                    s.startTime === timeStr &&
                    s.gigId === gigId &&
                    s.status === 'reserved' &&
                    s.repId === agentId
                );
                matrix[dateStr][hour] = !!slot;
            });
        });

        setLocalMatrix(matrix);
    }, [slots, weekDates, gigId, agentId, hoursList]);

    const handleToggleCell = (dateStr: string, hour: number) => {
        setLocalMatrix(prev => ({
            ...prev,
            [dateStr]: {
                ...prev[dateStr],
                [hour]: !prev[dateStr]?.[hour]
            }
        }));
    };

    const handleSave = async () => {
        if (!agentId) return;
        setIsSaving(true);
        try {
            const slotsToUpdate: Partial<TimeSlot>[] = [];

            for (const dateStr of Object.keys(localMatrix)) {
                for (const hour of hoursList) {
                    const isReserved = localMatrix[dateStr][hour];
                    const timeStr = `${hour.toString().padStart(2, '0')}:00`;
                    const endTimeStr = `${(hour + 1).toString().padStart(2, '0')}:00`;

                    const companySlot = slots.find(s => s.date === dateStr && s.startTime === timeStr && s.gigId === gigId);
                    const wasReservedByMe = companySlot && companySlot.status === 'reserved' && companySlot.repId === agentId;

                    if (isReserved) {
                        // Always send reserved slots
                        slotsToUpdate.push({
                            date: dateStr,
                            startTime: timeStr,
                            endTime: endTimeStr,
                            status: 'reserved',
                            repId: agentId,
                            gigId: gigId,
                            duration: 1
                        });
                    } else if (wasReservedByMe) {
                        // If it was mine but I unchecked it, set to available
                        slotsToUpdate.push({
                            date: dateStr,
                            startTime: timeStr,
                            endTime: endTimeStr,
                            status: 'available',
                            repId: agentId,
                            gigId: gigId,
                            duration: 1
                        });
                    }
                }
            }

            if (slotsToUpdate.length > 0) {
                await schedulerApi.bulkUpsertTimeSlots(gigId, slotsToUpdate);
            }

            onRefresh();
        } catch (error) {
            console.error('Error saving matrix:', error);
        } finally {
            setIsSaving(false);
        }
    };

    const dayTotals = useMemo(() => {
        return weekDates.map(date => {
            const dateStr = format(date, 'yyyy-MM-dd');
            const dayData = localMatrix[dateStr] || {};
            return hoursList.reduce((sum, hour) => sum + (dayData[hour] ? 1 : 0), 0);
        });
    }, [localMatrix, weekDates, hoursList]);

    const totalHours = useMemo(() => dayTotals.reduce((sum, val) => sum + val, 0), [dayTotals]);

    return (
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-8 py-6 flex items-center justify-between">
                <div className="flex items-center gap-4 text-white">
                    <div className="p-3 bg-white/10 backdrop-blur-md rounded-xl">
                        <Calendar className="w-8 h-8" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold">Weekly Planning</h2>
                        <p className="text-blue-100 text-sm opacity-90">
                            Week of {format(weekStart, 'MMMM d, yyyy')} • {selectedGig?.name || 'Loading...'}
                        </p>
                    </div>
                </div>

                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex items-center gap-2 bg-white text-blue-700 px-6 py-3 rounded-xl font-bold hover:bg-blue-50 transition-all disabled:opacity-50 shadow-lg shadow-black/10"
                >
                    {isSaving ? (
                        <div className="w-5 h-5 border-2 border-blue-700 border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                        <Save className="w-5 h-5" />
                    )}
                    {isSaving ? 'Saving...' : 'Save Schedule'}
                </button>
            </div>

            <div className="overflow-x-auto p-4">
                <table className="w-full border-collapse">
                    <thead>
                        <tr>
                            <th className="p-4 text-left text-gray-400 font-semibold text-sm border-b border-gray-100 w-24">Time</th>
                            {DAYS.map((day, idx) => (
                                <th key={day} className="p-4 text-center border-b border-gray-100 min-w-[100px]">
                                    <div className="text-xs uppercase tracking-wider text-gray-500 font-bold mb-1">{day}</div>
                                    <div className={`text-lg font-black ${isSameDay(weekDates[idx], new Date()) ? 'text-blue-600' : 'text-gray-900'}`}>
                                        {format(weekDates[idx], 'dd')}
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {hoursList.map(hour => (
                            <tr key={hour} className="group hover:bg-gray-50/50 transition-colors">
                                <td className="p-4 border-b border-gray-50 text-gray-500 font-bold text-sm">
                                    <div className="flex items-center gap-2">
                                        <Clock className="w-4 h-4 opacity-40" />
                                        {hour}:00
                                    </div>
                                </td>
                                {weekDates.map(date => {
                                    const dateStr = format(date, 'yyyy-MM-dd');
                                    const isReserved = localMatrix[dateStr]?.[hour] || false;

                                    // Check if slot is officially available from company
                                    const timeStr = `${hour.toString().padStart(2, '0')}:00`;
                                    const companySlot = slots.find(s => s.date === dateStr && s.startTime === timeStr && s.gigId === gigId);
                                    const isCompanyAvailable = companySlot && companySlot.status === 'available';

                                    return (
                                        <td key={dateStr} className="p-2 border-b border-gray-50 text-center">
                                            <button
                                                onClick={() => handleToggleCell(dateStr, hour)}
                                                className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all border-2 
                                                    ${isReserved
                                                        ? 'bg-blue-600 border-blue-600 text-white shadow-md'
                                                        : isCompanyAvailable
                                                            ? 'bg-emerald-50 border-emerald-200 text-emerald-600 hover:border-emerald-400'
                                                            : 'bg-gray-50 border-gray-100 text-gray-300 hover:border-blue-200'
                                                    }`}
                                            >
                                                {isReserved ? <Check className="w-6 h-6" /> : isCompanyAvailable ? <Plus className="w-5 h-5 opacity-40" /> : <div className="w-1 h-1 bg-gray-200 rounded-full group-hover:bg-blue-300"></div>}
                                            </button>
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr className="bg-gray-50/80">
                            <td className="p-6 font-black text-gray-900 text-lg">
                                <div className="flex items-center gap-2">
                                    <span className="text-2xl">Σ</span>
                                    <span>Totals</span>
                                </div>
                            </td>
                            {dayTotals.map((total, idx) => (
                                <td key={idx} className="p-6 text-center">
                                    <div className={`text-2xl font-black ${total > 0 ? 'text-blue-700' : 'text-gray-300'}`}>
                                        {total}h
                                    </div>
                                </td>
                            ))}
                        </tr>
                    </tfoot>
                </table>
            </div>

            <div className="p-10 border-t border-gray-100 bg-gray-50/30 flex justify-center">
                <div className="flex flex-col items-center">
                    <span className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Weekly Commitment</span>
                    <div className="text-5xl font-black text-indigo-700 tracking-tighter">
                        {totalHours} HOURS
                        <span className="w-full h-1.5 bg-indigo-700 block mt-1"></span>
                    </div>
                </div>
            </div>
        </div>
    );
}
