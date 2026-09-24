import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Clock, Users, CheckCircle, AlertCircle, Calendar } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { slotApi, Slot, Reservation } from '../../../services/api/slotApi';
import { getAgentId } from '../../../utils/authUtils';
import { formatSlotTimeRange } from '../../../utils/planningMetrics';

interface AvailableSlotsGridProps {
    gigId: string | null | undefined;
    selectedDate: Date;
    gigTimeZone?: unknown;
    /** Map of gigId → display name (for cross-gig conflict messages). */
    gigNamesById?: Record<string, string>;
    onReservationMade?: () => void;
    /** Switch the planning view to another enrolled GIG (cross-gig conflict). */
    onSelectGig?: (gigId: string) => void;
}

/** Normalize API gigId (string or populated gig doc) to an id string. */
function normalizeGigId(gigId: unknown): string {
    if (gigId == null || gigId === '') return '';
    if (typeof gigId === 'string' || typeof gigId === 'number') return String(gigId).trim();
    if (typeof gigId === 'object') {
        const o = gigId as Record<string, unknown>;
        const id = o._id ?? o.$oid ?? o.id;
        if (id && typeof id === 'object') {
            const nested = id as Record<string, unknown>;
            return String(nested.$oid ?? nested._id ?? '').trim();
        }
        return String(id ?? '').trim();
    }
    return '';
}

/** Prefer populated title from the reservation, then the local name map. */
function resolveGigTitle(
    gigRef: unknown,
    namesById: Record<string, string>,
    fallback: string
): string {
    if (gigRef && typeof gigRef === 'object') {
        const o = gigRef as Record<string, unknown>;
        const title = String(o.title || o.name || '').trim();
        if (title) return title;
    }
    const id = normalizeGigId(gigRef);
    if (id && namesById[id]?.trim()) return namesById[id].trim();
    return fallback;
}

/** HH:mm → minutes since midnight. */
function toMinutes(hhmm: string): number {
    const m = /^(\d{1,2}):(\d{2})/.exec(String(hhmm || '').trim());
    if (!m) return NaN;
    return Number(m[1]) * 60 + Number(m[2]);
}

function normalizeHHmm(hhmm: string): string {
    const mins = toMinutes(hhmm);
    if (Number.isNaN(mins) || mins < 0) return '';
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** True if intervals overlap; touching endpoints (10:00–11:00 & 11:00–12:00) do not. */
function timesOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
    const as = toMinutes(aStart);
    const ae = toMinutes(aEnd);
    const bs = toMinutes(bStart);
    const be = toMinutes(bEnd);
    if ([as, ae, bs, be].some((n) => Number.isNaN(n))) return false;
    if (!(ae > as && be > bs)) return false;
    return as < be && bs < ae;
}

function isActiveReservation(r: Reservation): boolean {
    return String(r.status || '').toLowerCase() === 'reserved';
}

function reservationDateKey(r: Reservation): string {
    const raw = String(r.reservationDate || r.date || '').trim();
    // Only accept concrete calendar dates (ignore day-name legacy values here).
    if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
    return '';
}

function slotOccupancy(slot: Slot, dateKey: string): number {
    const byDate = slot.occupancyByDate;
    if (byDate && Object.prototype.hasOwnProperty.call(byDate, dateKey)) {
        return Number(byDate[dateKey]) || 0;
    }
    const rawDate = String(slot.date || '').trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(rawDate)) {
        return Number(slot.reservedCount) || 0;
    }
    // Recurring template: other weeks must not keep this day "Complet".
    return Number(byDate?.[dateKey]) || 0;
}

export function AvailableSlotsGrid({
    gigId,
    selectedDate,
    gigTimeZone,
    gigNamesById = {},
    onReservationMade,
    onSelectGig,
}: AvailableSlotsGridProps) {
    const { t, i18n } = useTranslation();
    const [slots, setSlots] = useState<Slot[]>([]);
    const [reservations, setReservations] = useState<Reservation[]>([]);
    const [reservationsReady, setReservationsReady] = useState(false);
    const [loading, setLoading] = useState<boolean>(false);
    const [reservingSlotId, setReservingSlotId] = useState<string | null>(null);
    const [cancellingReservationId, setCancellingReservationId] = useState<string | null>(null);
    const [switchingSlotId, setSwitchingSlotId] = useState<string | null>(null);
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
        // Both loads must complete before slots become interactive.
        // Running them in parallel but gating reservationsReady on BOTH prevents
        // the race where slots briefly show "RÉSERVER" before cross-GIG conflicts
        // are known, causing conflict banners to appear only on user action.
        setReservationsReady(false);
        void loadAll();
    }, [gigId, selectedDate]);

    const loadAll = async () => {
        try {
            await Promise.all([loadSlots(), loadReservations()]);
        } finally {
            setReservationsReady(true);
        }
    };

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
                text: error.response?.data?.message || error.message || 'Échec du chargement des créneaux.',
                type: 'error'
            });
        } finally {
            setLoading(false);
        }
    };

    /** Load ALL reservations for this rep (all GIGs) so we can detect cross-gig overlaps. */
    const loadReservations = async () => {
        if (!repId || repId === '') {
            setReservations([]);
            return; // reservationsReady is controlled by loadAll()
        }
        try {
            const fetchedReservations = await slotApi.getReservations(repId);
            setReservations(Array.isArray(fetchedReservations) ? fetchedReservations : []);
        } catch (error: any) {
            console.error('Error loading reservations:', error);
            // Don't set reservationsReady here — loadAll() will do it.
            // Leaving reservations as-is means conflict detection uses stale-but-safe data.
        }
    };

    const resolveGigName = (gigRef: unknown): string => {
        return resolveGigTitle(gigRef, gigNamesById, t('sessionPlanning.overlapUnknownGig'));
    };

    const findOwnReservation = (slot: Slot, dateKey: string): Reservation | undefined => {
        const currentGig = normalizeGigId(gigId);
        const slotId = normalizeGigId(slot._id);
        const slotStart = normalizeHHmm(slot.startTime);
        const slotEnd = normalizeHHmm(slot.endTime);
        return reservations.find((r) => {
            if (!isActiveReservation(r)) return false;
            if (normalizeGigId(r.gigId) !== currentGig) return false;
            if (reservationDateKey(r) !== dateKey) return false;
            const resSlotId = normalizeGigId(r.slotId);
            if (resSlotId && slotId && resSlotId === slotId) return true;
            const rStart = normalizeHHmm(r.startTime);
            const rEnd = normalizeHHmm(r.endTime);
            return !!slotStart && !!rStart && rStart === slotStart && rEnd === slotEnd;
        });
    };

    const findCrossGigConflict = (slot: Slot, dateKey: string): Reservation | undefined => {
        const currentGig = normalizeGigId(gigId);
        const slotStart = normalizeHHmm(slot.startTime);
        const slotEnd = normalizeHHmm(slot.endTime);
        if (!slotStart || !slotEnd) return undefined;

        return reservations.find((r) => {
            if (!isActiveReservation(r)) return false;
            const otherGig = normalizeGigId(r.gigId);
            if (!otherGig || otherGig === currentGig) return false;
            if (reservationDateKey(r) !== dateKey) return false;
            const rStart = normalizeHHmm(r.startTime);
            const rEnd = normalizeHHmm(r.endTime);
            if (!rStart || !rEnd) return false;
            return timesOverlap(slotStart, slotEnd, rStart, rEnd);
        });
    };

    const handleReserve = async (slot: Slot) => {
        if (!repId) {
            setMessage({ text: 'Veuillez vous connecter pour réserver des créneaux.', type: 'error' });
            return;
        }

        if (!slot._id) {
            setMessage({ text: 'Créneau invalide.', type: 'error' });
            return;
        }

        const targetDateKey = format(selectedDate, 'yyyy-MM-dd');
        const existingReservation = findOwnReservation(slot, targetDateKey);
        if (existingReservation) {
            setMessage({ text: 'Vous avez déjà une réservation pour ce créneau.', type: 'error' });
            return;
        }

        const conflict = findCrossGigConflict(slot, targetDateKey);
        if (conflict) {
            // Re-fetch fresh reservations so ALL cross-GIG conflicts are visible
            // immediately, not only after the next user action.
            await loadAll();
            setMessage({
                text: t('sessionPlanning.overlapMessage', { gig: resolveGigName(conflict.gigId) }),
                type: 'error',
            });
            return;
        }

        setReservingSlotId(slot._id);
        setMessage(null);

        try {
            const note = resNotes[slot._id] || '';
            await slotApi.reserveSlot(slot._id, repId, note, format(selectedDate, 'yyyy-MM-dd'));
            setMessage({ text: 'Créneau réservé avec succès !', type: 'success' });

            setResNotes(prev => {
                const next = { ...prev };
                delete next[slot._id!];
                return next;
            });

            await loadAll();
            onReservationMade?.();
            setTimeout(() => {
                setMessage(null);
            }, 3000);
        } catch (error: any) {
            console.error('Error reserving slot:', error);
            const apiMsg = String(error.response?.data?.message || error.message || '');
            const looksLikeOverlap = /overlap/i.test(apiMsg);
            if (looksLikeOverlap) {
                await loadAll();
                // Re-resolve after refresh so the slot row shows BASCULER (single action).
                const refreshed = findCrossGigConflict(slot, targetDateKey);
                const gigLabel = resolveGigName(refreshed?.gigId);
                setMessage({
                    text: t('sessionPlanning.overlapMessage', { gig: gigLabel }),
                    type: 'error',
                });
            } else {
                setMessage({
                    text: apiMsg || 'Échec de la réservation du créneau.',
                    type: 'error',
                });
            }
        } finally {
            setReservingSlotId(null);
        }
    };

    const handleCancel = async (reservation: Reservation, successText?: string) => {
        if (!reservation._id) return;
        setCancellingReservationId(reservation._id);
        setMessage(null);
        try {
            await slotApi.cancelReservation(reservation._id);
            setMessage({
                text: successText || 'Réservation annulée avec succès.',
                type: 'success',
            });
            await loadAll();
            onReservationMade?.();
            setTimeout(() => {
                setMessage(null);
            }, 3000);
        } catch (error: any) {
            console.error('Error cancelling reservation:', error);
            setMessage({ text: error.response?.data?.message || error.message || "Échec de l'annulation de la réservation.", type: 'error' });
        } finally {
            setCancellingReservationId(null);
        }
    };

    /** Cancel the conflicting reservation on the other GIG, then reserve this slot. */
    const handleSwitch = async (slot: Slot, conflict: Reservation) => {
        if (!repId || !slot._id || !conflict._id) return;

        const dateKey = format(selectedDate, 'yyyy-MM-dd');
        const canTakeHere = slotOccupancy(slot, dateKey) < (slot.capacity || 0) && slot.status !== 'cancelled';
        if (!canTakeHere) {
            const otherId = normalizeGigId(conflict.gigId);
            if (otherId && onSelectGig) {
                onSelectGig(otherId);
                return;
            }
            await handleCancel(
                conflict,
                t('sessionPlanning.cancelOtherSuccess', { gig: resolveGigName(conflict.gigId) })
            );
            return;
        }

        setSwitchingSlotId(slot._id);
        setMessage(null);
        try {
            await slotApi.cancelReservation(conflict._id);
            const note = resNotes[slot._id] || '';
            await slotApi.reserveSlot(slot._id, repId, note, format(selectedDate, 'yyyy-MM-dd'));

            setResNotes(prev => {
                const next = { ...prev };
                delete next[slot._id!];
                return next;
            });

            setMessage({ text: t('sessionPlanning.switchSuccess'), type: 'success' });
            await loadAll();
            onReservationMade?.();
            setTimeout(() => {
                setMessage(null);
            }, 3000);
        } catch (error: any) {
            console.error('Error switching reservation:', error);
            await loadAll();
            setMessage({
                text: error.response?.data?.message || error.message || 'Échec de la bascule de réservation.',
                type: 'error',
            });
        } finally {
            setSwitchingSlotId(null);
        }
    };

    if (!gigId || gigId === '' || !selectedDate) {
        return (
            <div className="bg-white/90 rounded-2xl shadow-sm border border-harx-100 p-6 text-center text-gray-500 text-sm">
                Sélectionnez un gig pour voir les créneaux disponibles.
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
                Erreur : format de date invalide.
            </div>
        );
    }

    const dateLocale = i18n.language?.startsWith('fr') ? fr : undefined;

    return (
        <div className="bg-white/95 rounded-2xl shadow-sm border border-harx-100 overflow-hidden">
            <div className="p-6 border-b border-harx-100 bg-gradient-to-r from-harx-50/60 to-white">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-harx-600" />
                        <h3 className="text-lg font-black text-gray-900 tracking-tight">
                            <span className="capitalize">Créneaux disponibles — {dateStr ? format(selectedDate, 'd MMMM yyyy', { locale: dateLocale }) : 'Chargement…'}</span>
                        </h3>
                    </div>
                    {isPastDate && (
                        <span className="text-[10px] text-harx-600 font-black uppercase tracking-widest">Date passée — lecture seule</span>
                    )}
                </div>
            </div>

            {message && (
                <div className={`mx-6 mt-4 p-3 rounded-xl flex items-center gap-2 ${message.type === 'success'
                    ? 'bg-harx-50 text-harx-900 border border-harx-200'
                    : 'bg-red-50 text-red-800 border border-red-200'
                    }`}>
                    {message.type === 'success' ? (
                        <CheckCircle className="w-5 h-5 shrink-0" />
                    ) : (
                        <AlertCircle className="w-5 h-5 shrink-0" />
                    )}
                    <span className="text-sm font-medium">{message.text}</span>
                </div>
            )}

            <div className="divide-y divide-gray-100">
                {loading ? (
                    <div className="p-8 text-center text-gray-500 font-medium">Chargement des créneaux…</div>
                ) : daySlots.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                        Aucun créneau disponible pour cette date. L'entreprise doit d'abord générer des créneaux.
                    </div>
                ) : (
                    daySlots
                        .sort((a, b) => a.startTime.localeCompare(b.startTime))
                        .map((slot) => {
                            const reservation = findOwnReservation(slot, dateStr);
                            const conflict = !reservation ? findCrossGigConflict(slot, dateStr) : undefined;
                            const isReserved = !!reservation;
                            const hasConflict = !!conflict;
                            const occupied = slotOccupancy(slot, dateStr);
                            const remaining = Math.max(0, (slot.capacity || 0) - occupied);
                            const isAvailable = remaining > 0 && slot.status !== 'cancelled';
                            const timeDisplay = formatSlotTimeRange(
                                dateStr,
                                slot.startTime,
                                slot.endTime,
                                gigTimeZone
                            );
                            const conflictGigName = conflict ? resolveGigName(conflict.gigId) : '';

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
                                        : hasConflict
                                            ? 'bg-amber-50/40 border-l-4 border-amber-400'
                                            : isAvailable && !isSlotPast
                                                ? 'bg-white'
                                                : 'bg-gray-50'
                                        }`}
                                >
                                    <div className="flex flex-col gap-4">
                                        <div className="flex items-center justify-between gap-3">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-4 mb-2 flex-wrap">
                                                    {/* Dual-timezone display */}
                                                    {timeDisplay.dualZone ? (
                                                        <div className="flex flex-col gap-0.5" title={timeDisplay.hint}>
                                                            {/* REP local time — where they are */}
                                                            <div className="flex items-center gap-1.5">
                                                                <span className="text-sm font-bold text-gray-900">{timeDisplay.repLabel}</span>
                                                                <span className="text-[10px] font-black uppercase tracking-wider text-harx-500 bg-harx-50 px-1.5 py-0.5 rounded-md border border-harx-100">
                                                                    {t('sessionPlanning.tzRep', 'Vous')} · {timeDisplay.repCity}
                                                                </span>
                                                            </div>
                                                            {/* GIG destination time — where prospects are */}
                                                            <div className="flex items-center gap-1.5">
                                                                <span className="text-sm font-medium text-slate-500">{timeDisplay.gigLabel}</span>
                                                                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded-md border border-slate-100">
                                                                    {t('sessionPlanning.tzGig', 'Destination')} · {timeDisplay.gigCity}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <span className="text-sm font-bold text-gray-900" title={timeDisplay.hint}>
                                                            {timeDisplay.label}
                                                        </span>
                                                    )}
                                                    <div className="flex items-center gap-2 text-xs">
                                                        <Clock className="w-4 h-4 text-gray-400" />
                                                        <span className="text-gray-600">{slot.duration}h</span>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-xs">
                                                        <Users className="w-4 h-4 text-gray-400" />
                                                        <span className={`font-semibold ${remaining > 0 ? 'text-emerald-600' : 'text-red-600'
                                                            }`}>
                                                            {remaining} / {slot.capacity} disponible{remaining !== 1 ? 's' : ''}
                                                        </span>
                                                    </div>
                                                </div>
                                                {isReserved && (
                                                    <div className={`flex items-center gap-2 text-sm ${
                                                        isSlotPast ? 'text-emerald-700' : 'text-harx-700'
                                                    }`}>
                                                        <CheckCircle className="w-4 h-4" />
                                                        <span className="font-medium">
                                                            {isSlotPast ? 'Vous avez réservé et complété ce créneau' : 'Vous avez réservé ce créneau'}
                                                        </span>
                                                    </div>
                                                )}
                                                {hasConflict && !isSlotPast && (
                                                    <div className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-amber-950">
                                                        <div className="flex items-start gap-2">
                                                            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-amber-600" />
                                                            <div className="space-y-1">
                                                                <p className="text-xs font-black uppercase tracking-wider text-amber-800">
                                                                    {t('sessionPlanning.overlapTitle', { gig: conflictGigName })}
                                                                </p>
                                                                <p className="text-sm font-medium leading-snug">
                                                                    {isAvailable
                                                                        ? t('sessionPlanning.overlapMessage', { gig: conflictGigName })
                                                                        : t('sessionPlanning.overlapFullMessage', { gig: conflictGigName })}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                                                {isReserved ? (
                                                    <>
                                                        {!isSlotPast ? (
                                                            <>
                                                                <button
                                                                    onClick={() => handleCancel(reservation!)}
                                                                    disabled={cancellingReservationId === reservation?._id}
                                                                    className="px-4 py-2 text-xs font-black uppercase tracking-widest text-red-600 bg-red-50 border border-red-200 rounded-xl hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                                                >
                                                                    {cancellingReservationId === reservation?._id ? 'Annulation…' : 'Annuler'}
                                                                </button>
                                                                <span className="px-4 py-2 text-xs font-black uppercase tracking-widest text-harx-700 bg-harx-50 rounded-xl border border-harx-100">
                                                                    Réservé
                                                                </span>
                                                            </>
                                                        ) : (
                                                            <span className="px-4 py-2 text-xs font-black uppercase tracking-widest text-emerald-700 bg-emerald-50 rounded-xl border border-emerald-100">
                                                                Terminé
                                                            </span>
                                                        )}
                                                    </>
                                                ) : hasConflict && !isSlotPast ? (
                                                    <button
                                                        onClick={() => handleSwitch(slot, conflict!)}
                                                        disabled={switchingSlotId === slot._id}
                                                        className="px-4 py-2 text-xs font-black uppercase tracking-widest text-white bg-harx-600 rounded-xl hover:bg-harx-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                                    >
                                                        {switchingSlotId === slot._id
                                                            ? t('sessionPlanning.switching')
                                                            : t('sessionPlanning.switchHere')}
                                                    </button>
                                                ) : isAvailable && !isSlotPast && reservationsReady ? (
                                                    <button
                                                        onClick={() => handleReserve(slot)}
                                                        disabled={reservingSlotId === slot._id}
                                                        className="px-4 py-2 text-xs font-black uppercase tracking-widest text-white bg-harx-600 rounded-xl hover:bg-harx-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                                    >
                                                        {reservingSlotId === slot._id ? 'Réservation…' : 'Réserver'}
                                                    </button>
                                                ) : isAvailable && !isSlotPast && !reservationsReady ? (
                                                    <span className="px-4 py-2 text-xs font-black uppercase tracking-widest text-gray-400 bg-gray-100 rounded-xl">
                                                        …
                                                    </span>
                                                ) : (
                                                    <span className="px-4 py-2 text-xs font-black uppercase tracking-widest text-gray-400 bg-gray-100 rounded-xl">
                                                        {isSlotPast ? 'Expiré' : slot.status === 'full' || remaining <= 0 ? 'Complet' : 'Indisponible'}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {isAvailable && !isSlotPast && !isReserved && !hasConflict && (
                                            <div className="flex items-center gap-3">
                                                <input
                                                    type="text"
                                                    placeholder="Ajouter une note (ex : « Je souhaite travailler sur ce créneau »)…"
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
