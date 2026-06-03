import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Clock, Users, CheckCircle, AlertCircle, Calendar } from 'lucide-react';
import { slotApi, Slot, Reservation } from '../../../services/api/slotApi';
import { getAgentId } from '../../../utils/authUtils';

interface AvailableSlotsGridProps {
    gigId: string | null | undefined;
    selectedDate: Date;
    onReservationMade?: () => void;
}

export function AvailableSlotsGrid({ gigId, selectedDate, onReservationMade }: AvailableSlotsGridProps) {
    const [slots, setSlots] = useState<Slot[]>([]);
    const [reservations, setReservations] = useState<Reservation[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [reservingSlotId, setReservingSlotId] = useState<string | null>(null);
    const [cancellingReservationId, setCancellingReservationId] = useState<string | null>(null);
    const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
    const [resNotes, setResNotes] = useState<Record<string, string>>({});

    let repId = '';
    try {
        repId = getAgentId() || '';
    } catch (error) {
        console.error('Error getting agent ID:', error);
    }

    useEffect(() => {
        if (!gigId || gigId === '') return;
        loadSlots();
        loadReservations();
    }, [gigId, selectedDate]);

    const loadSlots = async () => {
        if (!gigId || gigId === '' || !selectedDate) return;
        try {
            setLoading(true);
            // Important: fetch all gig slots, because backend can store recurring slots
            // with day names ("Monday") and not only concrete dates ("yyyy-MM-dd").
            const fetchedSlots = await slotApi.getSlots(gigId);
            setSlots(Array.isArray(fetchedSlots) ? fetchedSlots : []);
        } catch (error: any) {
            console.error('Error loading slots:', error);
            setMessage({
                text: error.response?.data?.message || error.message || 'Failed to load available slots',
                type: 'error'
            });
        } finally {
            setLoading(false);
        }
    };

    const loadReservations = async () => {
        if (!repId || repId === '' || !gigId || gigId === '') return;
        try {
            const fetchedReservations = await slotApi.getReservations(repId, gigId);
            setReservations(Array.isArray(fetchedReservations) ? fetchedReservations : []);
        } catch (error: any) {
            console.error('Error loading reservations:', error);
            // Don't show error for reservations, just log it
        }
    };

    const handleReserve = async (slot: Slot) => {
        if (!repId) {
            setMessage({ text: 'Please log in to reserve slots', type: 'error' });
            return;
        }

        if (!slot._id) {
            setMessage({ text: 'Invalid slot', type: 'error' });
            return;
        }

        // Already reserved? Slots can be recurring (same `_id` reusable
        // across multiple dates), so we must compare BOTH the slotId AND
        // the target date, AND ignore cancelled reservations. Otherwise a
        // single past reservation would lock the rep out of every future
        // booking on the same recurring slot.
        const targetDateKey = format(selectedDate, 'yyyy-MM-dd');
        const existingReservation = reservations.find((r) => {
            if (r.slotId !== slot._id) return false;
            if (r.status === 'cancelled') return false;
            const reservedKey = (r.reservationDate || r.date || '').slice(0, 10);
            return reservedKey === targetDateKey;
        });
        if (existingReservation) {
            setMessage({ text: 'You already have a reservation for this slot', type: 'error' });
            return;
        }

        setReservingSlotId(slot._id);
        setMessage(null);

        try {
            const note = resNotes[slot._id] || '';
            await slotApi.reserveSlot(slot._id, repId, note, format(selectedDate, 'yyyy-MM-dd'));
            setMessage({ text: 'Slot reserved successfully!', type: 'success' });

            // Clear the note for this slot
            setResNotes(prev => {
                const next = { ...prev };
                delete next[slot._id!];
                return next;
            });

            await loadSlots();
            await loadReservations();
            setTimeout(() => {
                setMessage(null);
            }, 3000);
        } catch (error: any) {
            console.error('Error reserving slot:', error);
            const errorMsg = error.response?.data?.message || error.message || 'Failed to reserve slot';
            setMessage({ text: errorMsg, type: 'error' });
        } finally {
            setReservingSlotId(null);
        }
    };

    const handleCancel = async (reservation: Reservation) => {
        if (!reservation._id) return;
        setCancellingReservationId(reservation._id);
        setMessage(null);
        try {
            await slotApi.cancelReservation(reservation._id);
            setMessage({ text: 'Reservation cancelled successfully.', type: 'success' });
            await loadSlots();
            await loadReservations();
            setTimeout(() => {
                setMessage(null);
            }, 3000);
        } catch (error: any) {
            console.error('Error cancelling reservation:', error);
            setMessage({ text: error.response?.data?.message || error.message || 'Failed to cancel reservation', type: 'error' });
        } finally {
            setCancellingReservationId(null);
        }
    };

    if (!gigId || gigId === '' || !selectedDate) {
        return (
            <div className="bg-white/90 rounded-2xl shadow-sm border border-harx-100 p-6 text-center text-gray-500 text-sm">
                Select a gig to see available slots
            </div>
        );
    }

    let dateStr = '';
    let daySlots: Slot[] = [];
    let isPastDate = false;

    try {
        dateStr = format(selectedDate, 'yyyy-MM-dd');
        const selectedDayName = format(selectedDate, 'EEEE').toLowerCase();
        daySlots = Array.isArray(slots)
            ? slots.filter((s) => {
                if (!s?.date) return false;
                const raw = String(s.date).trim();
                if (!raw) return false;
                // Concrete date slot: yyyy-MM-dd
                if (raw === dateStr) return true;
                // Recurring weekly slot: Monday/Tuesday...
                return raw.toLowerCase() === selectedDayName;
            })
            : [];
        isPastDate = dateStr < format(new Date(), 'yyyy-MM-dd');
    } catch (error) {
        console.error('Error formatting date:', error);
        return (
            <div className="bg-white/90 rounded-2xl shadow-sm border border-harx-100 p-6 text-center text-harx-600 text-sm">
                Error: Invalid date format
            </div>
        );
    }

    return (
        <div className="bg-white/95 rounded-2xl shadow-sm border border-harx-100 overflow-hidden">
            <div className="p-6 border-b border-harx-100 bg-gradient-to-r from-harx-50/60 to-white">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-harx-600" />
                        <h3 className="text-lg font-black text-gray-900 tracking-tight uppercase">
                            Available Slots - {dateStr ? format(selectedDate, 'MMMM d, yyyy') : 'Loading...'}
                        </h3>
                    </div>
                    {isPastDate && (
                        <span className="text-[10px] text-harx-600 font-black uppercase tracking-widest">Past date - viewing only</span>
                    )}
                </div>
            </div>

            {message && (
                <div className={`mx-6 mt-4 p-3 rounded-xl flex items-center gap-2 ${message.type === 'success'
                    ? 'bg-harx-50 text-harx-900 border border-harx-200'
                    : 'bg-red-50 text-red-800 border border-red-200'
                    }`}>
                    {message.type === 'success' ? (
                        <CheckCircle className="w-5 h-5" />
                    ) : (
                        <AlertCircle className="w-5 h-5" />
                    )}
                    <span className="text-sm font-medium">{message.text}</span>
                </div>
            )}

            <div className="divide-y divide-gray-100">
                {loading ? (
                    <div className="p-8 text-center text-gray-500 font-medium">Loading slots...</div>
                ) : daySlots.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                        No slots available for this date. The company may need to generate slots first.
                    </div>
                ) : (
                    daySlots
                        .sort((a, b) => a.startTime.localeCompare(b.startTime))
                        .map((slot) => {
                            const reservation = reservations.find(r => {
                                const isSlotMatch = r.slotId === slot._id;
                                const rDate = r.reservationDate || r.date;
                                const isDateMatch = rDate === dateStr;
                                return isSlotMatch && isDateMatch;
                            });
                            const isReserved = !!reservation;
                            const isAvailable = slot.status === 'available' && slot.reservedCount < slot.capacity;
                            const remaining = slot.capacity - slot.reservedCount;

                            const isSlotPast = (() => {
                                try {
                                    const now = new Date();
                                    const todayStr = format(now, 'yyyy-MM-dd');
                                    
                                    if (dateStr < todayStr) return true;
                                    if (dateStr > todayStr) return false;
                                    
                                    const currentHHmm = format(now, 'HH:mm');
                                    // A slot is past/expired only when its end time has passed, not its start time!
                                    return slot.endTime < currentHHmm;
                                } catch (err) {
                                    console.error('Error checking isSlotPast:', err);
                                    return false;
                                }
                            })();

                             return (
                                <div
                                    key={slot._id}
                                    className={`p-5 transition-all ${isReserved
                                        ? isSlotPast
                                            ? 'bg-emerald-50/15 border-l-4 border-emerald-500'
                                            : 'bg-harx-50/60'
                                        : isAvailable && !isSlotPast
                                            ? 'bg-white'
                                            : 'bg-gray-50'
                                        }`}
                                >
                                    <div className="flex flex-col gap-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-4 mb-2">
                                                    <span className="text-sm font-bold text-gray-900">
                                                        {slot.startTime} - {slot.endTime}
                                                    </span>
                                                    <div className="flex items-center gap-2 text-xs">
                                                        <Clock className="w-4 h-4 text-gray-400" />
                                                        <span className="text-gray-600">{slot.duration}h</span>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-xs">
                                                        <Users className="w-4 h-4 text-gray-400" />
                                                        <span className={`font-semibold ${remaining > 0 ? 'text-emerald-600' : 'text-red-600'
                                                            }`}>
                                                            {remaining} / {slot.capacity} available
                                                        </span>
                                                    </div>
                                                </div>
                                                {isReserved && (
                                                    <div className={`flex items-center gap-2 text-sm ${
                                                        isSlotPast ? 'text-emerald-700' : 'text-harx-700'
                                                    }`}>
                                                        <CheckCircle className="w-4 h-4" />
                                                        <span className="font-medium">
                                                            {isSlotPast ? 'You reserved and completed this slot' : 'You have reserved this slot'}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {isReserved ? (
                                                    <>
                                                        {!isSlotPast ? (
                                                            <>
                                                                <button
                                                                    onClick={() => handleCancel(reservation!)}
                                                                    disabled={cancellingReservationId === reservation?._id}
                                                                    className="px-4 py-2 text-xs font-black uppercase tracking-widest text-red-600 bg-red-50 border border-red-200 rounded-xl hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                                                >
                                                                    {cancellingReservationId === reservation?._id ? 'Cancelling...' : 'Cancel'}
                                                                </button>
                                                                <span className="px-4 py-2 text-xs font-black uppercase tracking-widest text-harx-700 bg-harx-50 rounded-xl border border-harx-100">
                                                                    Reserved
                                                                </span>
                                                            </>
                                                        ) : (
                                                            <span className="px-4 py-2 text-xs font-black uppercase tracking-widest text-emerald-700 bg-emerald-50 rounded-xl border border-emerald-100">
                                                                Completed
                                                            </span>
                                                        )}
                                                    </>
                                                ) : isAvailable && !isSlotPast ? (
                                                    <button
                                                        onClick={() => handleReserve(slot)}
                                                        disabled={reservingSlotId === slot._id}
                                                        className="px-4 py-2 text-xs font-black uppercase tracking-widest text-white bg-harx-600 rounded-xl hover:bg-harx-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                                    >
                                                        {reservingSlotId === slot._id ? 'Reserving...' : 'Reserve'}
                                                    </button>
                                                ) : (
                                                    <span className="px-4 py-2 text-xs font-black uppercase tracking-widest text-gray-400 bg-gray-100 rounded-xl">
                                                        {isSlotPast ? 'Expired' : slot.status === 'full' ? 'Full' : 'Unavailable'}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {isAvailable && !isSlotPast && !isReserved && (
                                            <div className="flex items-center gap-3">
                                                <input
                                                    type="text"
                                                    placeholder="Add a note (e.g., 'I want to work on this slot')..."
                                                    className="flex-1 bg-gray-50 border border-gray-100 rounded-lg py-2 px-3 text-xs focus:ring-2 focus:ring-harx-500/20 focus:border-harx-200 outline-none transition-all"
                                                    value={resNotes[slot._id!] || ''}
                                                    onChange={(e) => setResNotes(prev => ({ ...prev, [slot._id!]: e.target.value }))}
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                )}
            </div>
        </div>
    );
}
