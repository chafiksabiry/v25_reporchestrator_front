import React, { useState, useMemo, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { HorizontalCalendar } from '../scheduler/HorizontalCalendar';
import { TimeSlot, Gig, WeeklyStats, Rep, UserRole, Company } from '../../../types/scheduler';
import { Building, Clock, Briefcase, AlertCircle, Users, Brain, CalendarRange, CheckCircle2, Sparkles } from 'lucide-react';
import { CompanyView } from '../scheduler/CompanyView';
import { WalletFilterSelect } from '../ui/WalletFilterSelect';
import { WorkloadPredictionComponent as WorkloadPrediction } from '../scheduler/WorkloadPrediction';
import { AttendanceReport } from '../scheduler/AttendanceReport';
import { initializeAI } from '../../../services/schedulerAiService';
import { format } from 'date-fns';
import axios from 'axios';
import Cookies from 'js-cookie';
import { getAgentId } from '../../../utils/authUtils';
import { schedulerApi } from '../../../services/api/scheduler';
import { slotApi } from '../../../services/api/slotApi';
import { AvailableSlotsGrid } from '../scheduler/AvailableSlotsGrid';
import { Skeleton } from '../ui/Skeleton';

// Define ExternalGig type locally for API response mapping
interface ExternalGig {
    _id: string | { $oid: string };
    title: string;
    description: string;
    companyName?: string;
    requiredSkills?: { name: string }[];
    [key: string]: any;
}

// Helper to generate a consistent color from a string
const stringToColor = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const c = (hash & 0x00ffffff).toString(16).toUpperCase();
    return '#' + '00000'.substring(0, 6 - c.length) + c;
};

// Map Slot from backend to frontend TimeSlot type
const mapBackendSlotToSlot = (slot: any, currentAgentId?: string): TimeSlot => {
    const agentData = slot.agentId && typeof slot.agentId === 'object' ? slot.agentId : null;
    const gigData = slot.gigId && typeof slot.gigId === 'object' ? slot.gigId : null;

    const id = slot.slotId || (slot._id as any)?.$oid || slot._id?.toString() || crypto.randomUUID();
    let repId = (agentData as any)?._id || (agentData as any)?.$oid || slot.agentId?.toString() || slot.repId?.toString() || '';
    const gigId = (gigData as any)?._id || (gigData as any)?.$oid || slot.gigId?.toString() || '';

    let status = slot.status;
    let isReservation = !!slot.isMember;
    let repNotes = '';
    let reservationId = '';

    const reservations = slot.reservations || [];
    const reservedCount = slot.reservedCount !== undefined ? slot.reservedCount : reservations.length;
    const capacity = slot.capacity || 1;

    if (slot.reservationId) {
        status = 'reserved';
        isReservation = true;
        reservationId = slot.reservationId;
        repNotes = slot.notes || '';
        repId = currentAgentId || repId;
    } else if (reservations.length > 0 && currentAgentId) {
        const myRes = reservations.find((r: any) =>
            (r.agentId?._id || r.agentId?.$oid || r.agentId)?.toString() === currentAgentId
        );
        if (myRes) {
            status = 'reserved';
            isReservation = true;
            repId = currentAgentId;
            repNotes = myRes.notes || '';
            reservationId = (myRes._id as any)?.$oid || myRes._id?.toString() || '';
        }
    }

    let date = slot.date;
    if (!date && slot.startTime && slot.startTime.includes('T')) {
        date = slot.startTime.split('T')[0];
    }

    return {
        id,
        startTime: slot.startTime,
        endTime: slot.endTime,
        date: date || '',
        gigId,
        repId,
        status: status as any,
        duration: slot.duration || 1,
        notes: repNotes,
        companyNotes: slot.notes,
        capacity,
        reservedCount,
        reservations,
        attended: slot.attended,
        attendanceNotes: slot.attendanceNotes,
        agent: agentData,
        gig: gigData,
        isMember: slot.isMember || isReservation,
        reservationId
    };
};

const mapExternalGigToSchedulerGig = (gig: ExternalGig): Gig => {
    const id = (gig._id as any)?.$oid || gig._id?.toString() || crypto.randomUUID();
    return {
        id,
        name: gig.title,
        description: gig.description,
        company: gig.companyName || 'Unknown Company',
        color: stringToColor(id),
        skills: gig.requiredSkills?.map((s: any) => typeof s === 'string' ? s : s.name) || [],
        priority: 'medium',
        availability: gig.availability
    };
};

const sampleReps: Rep[] = [
    {
        id: '1',
        name: 'Alex Johnson',
        email: 'alex@harx.com',
        avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
        specialties: ['Customer Support', 'Technical Troubleshooting'],
        performanceScore: 87,
        preferredHours: { start: 9, end: 17 },
        attendanceScore: 92,
        attendanceHistory: []
    },
    {
        id: '2',
        name: 'Jamie Smith',
        email: 'jamie@harx.com',
        avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
        specialties: ['Sales', 'Product Demos'],
        performanceScore: 92,
        preferredHours: { start: 8, end: 16 },
        attendanceScore: 85,
        attendanceHistory: []
    },
    {
        id: '3',
        name: 'Taylor Wilson',
        email: 'taylor@harx.com',
        avatar: 'https://images.unsplash.com/photo-1519345182560-3f2917c472ef?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
        specialties: ['Training', 'Onboarding'],
        performanceScore: 78,
        preferredHours: { start: 10, end: 18 },
        attendanceScore: 78,
        attendanceHistory: []
    },
    {
        id: '4',
        name: 'Morgan Lee',
        email: 'morgan@harx.com',
        avatar: 'https://images.unsplash.com/photo-1531427186611-ecfd6d936c79?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
        specialties: ['Technical Support', 'Product Expertise'],
        performanceScore: 85,
        preferredHours: { start: 9, end: 17 },
        attendanceScore: 88,
        attendanceHistory: []
    },
];

const sampleCompanies: Company[] = [
    {
        id: '1',
        name: 'Tech Co',
        logo: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?ixlib=rb-1.2.1&auto=format&fit=crop&w=128&h=128&q=80',
        priority: 3
    },
    {
        id: '2',
        name: 'Marketing Inc',
        logo: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?ixlib=rb-1.2.1&auto=format&fit=crop&w=128&h=128&q=80',
        priority: 2
    },
    {
        id: '3',
        name: 'Acme Corp',
        logo: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?ixlib=rb-1.2.1&auto=format&fit=crop&w=128&h=128&q=80',
        priority: 1
    },
];

interface EnrolledGig {
    _id: string;
    status: string;
    gigId: {
        _id: string;
        title: string;
        description?: string;
        availability?: {
            schedule?: {
                day: string;
                hours: { start: string; end: string; };
            }[];
            time_zone?: string | { name: string };
        };
        commission?: {
            commission_per_call?: number;
            currency?: { symbol?: string; code?: string };
        };
        destination_zone?: {
            name: { common: string };
        };
        companyId?: {
            _id: string;
            name: string;
            logo?: string;
        };
    };
    matchScore?: number;
}

export function SessionPlanning() {
    const { t } = useTranslation();
    const location = useLocation();
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [slots, setSlots] = useState<TimeSlot[]>([]);
    const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
    const [notification, setNotification] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
    const [userRole, setUserRole] = useState<UserRole>('rep');

    const [selectedRepId] = useState<string>(() => {
        const agendId = getAgentId();
        return agendId || sampleReps[0].id;
    });

    const [selectedGigId, setSelectedGigId] = useState<string | null>(null);
    const [gigs, setGigs] = useState<Gig[]>([]);
    const [reps, setReps] = useState<Rep[]>([]);
    const [draftSlots, setDraftSlots] = useState<Partial<TimeSlot>[]>([]);
    const [draftSlotNotes, setDraftSlotNotes] = useState<Record<string, string>>({});
    const [quickStart, setQuickStart] = useState<string>('');
    const [quickEnd, setQuickEnd] = useState<string>('');
    const [globalNotes, setGlobalNotes] = useState<string>('');
    const [loadingGigs, setLoadingGigs] = useState<boolean>(true);
    const [showAttendancePanel] = useState<boolean>(false);
    const [showAIPanel] = useState<boolean>(true);
    const routeGigId = useMemo(() => {
        const p = new URLSearchParams(location.search);
        return String(p.get('gigId') || '').trim();
    }, [location.search]);

    const refreshData = async () => {
        if (!selectedRepId) return;

        try {
            if (userRole === 'rep') {
                const [timeSlots, availableSlots, reservations] = await Promise.all([
                    schedulerApi.getTimeSlots(selectedRepId),
                    selectedGigId ? slotApi.getSlots(selectedGigId) : slotApi.getSlots(),
                    selectedGigId ? slotApi.getReservations(selectedRepId, selectedGigId) : slotApi.getReservations(selectedRepId)
                ]);

                const mappedTimeSlots = Array.isArray(timeSlots) ? timeSlots.map(s => mapBackendSlotToSlot(s, selectedRepId)) : [];
                const mappedAvailableSlots = Array.isArray(availableSlots) ? availableSlots.map(s => mapBackendSlotToSlot(s, selectedRepId)) : [];
                const mappedReservations = Array.isArray(reservations) ? reservations.map((r: any) => ({
                    ...mapBackendSlotToSlot(r, selectedRepId),
                    isReservation: true
                })) : [];

                const finalSlots: TimeSlot[] = [];
                const seenIds = new Set<string>();

                mappedReservations.forEach(slot => {
                    if (!seenIds.has(slot.id)) {
                        finalSlots.push(slot);
                        seenIds.add(slot.id);
                    }
                });

                mappedTimeSlots.forEach(slot => {
                    if (!seenIds.has(slot.id)) {
                        finalSlots.push(slot);
                        seenIds.add(slot.id);
                    }
                });

                mappedAvailableSlots.forEach(slot => {
                    if (!seenIds.has(slot.id)) {
                        finalSlots.push(slot);
                        seenIds.add(slot.id);
                    }
                });

                let allSlots = finalSlots;
                if (selectedGigId) {
                    allSlots = allSlots.filter(slot => slot.gigId === selectedGigId);
                }
                setSlots(allSlots);
            } else {
                if (!selectedGigId) return;

                const gigAgents = await schedulerApi.getGigAgents(selectedGigId, 'enrolled');
                const mappedReps = gigAgents.map(ga => ({
                    id: ga.agentId._id,
                    name: ga.agentId.personalInfo?.firstName + ' ' + ga.agentId.personalInfo?.lastName,
                    email: ga.agentId.personalInfo?.email || '',
                    avatar: ga.agentId.personalInfo?.avatar,
                    specialties: ga.agentId.professionalSummary?.industries || [],
                    performanceScore: 85,
                    attendanceScore: 90,
                    attendanceHistory: []
                }));
                setReps(mappedReps);

                const [timeSlots, availableSlots] = await Promise.all([
                    schedulerApi.getTimeSlots(undefined, selectedGigId),
                    slotApi.getSlots(selectedGigId)
                ]);

                const mappedTimeSlots = Array.isArray(timeSlots) ? timeSlots.map((s: any) => mapBackendSlotToSlot(s, selectedRepId)) : [];
                const mappedAvailableSlots = Array.isArray(availableSlots) ? availableSlots.map((s: any) => mapBackendSlotToSlot(s, selectedRepId)) : [];

                const finalSlots: TimeSlot[] = [];
                const seenIds = new Set<string>();

                mappedTimeSlots.forEach(slot => {
                    if (!seenIds.has(slot.id)) {
                        finalSlots.push(slot);
                        seenIds.add(slot.id);
                    }
                });

                mappedAvailableSlots.forEach(slot => {
                    if (!seenIds.has(slot.id)) {
                        finalSlots.push(slot);
                        seenIds.add(slot.id);
                    }
                });

                setSlots(finalSlots);
            }
        } catch (error) {
            console.error('Error refreshing data:', error);
        }
    };

    useEffect(() => {
        const role = Cookies.get('user_role') as UserRole;
        if (role) setUserRole(role);
        
        const fetchGigs = async () => {
            const companyId = Cookies.get('companyId');
            if (role !== 'company' || !companyId) {
                setLoadingGigs(false);
                return;
            }

            try {
                setLoadingGigs(true);
                const apiUrl = import.meta.env.VITE_API_URL_GIGS || 'https://v25gigsmanualcreationbackend-production.up.railway.app/api';
                const response = await axios.get(`${apiUrl}/gigs/company/${companyId}`);

                if (response.data && response.data.data) {
                    const mappedGigs = response.data.data.map(mapExternalGigToSchedulerGig);
                    setGigs(mappedGigs);
                }
            } catch (error) {
                console.error('Error fetching gigs:', error);
                setNotification({ message: 'Failed to load Gigs', type: 'error' });
            } finally {
                setLoadingGigs(false);
            }
        };

        const initAI = async () => {
            await initializeAI();
        };
        initAI();
        fetchGigs();
    }, [userRole]);

    useEffect(() => {
        const fetchEnrolledGigs = async () => {
            if (!selectedRepId) return;

            try {
                const matchingApiUrl = import.meta.env.VITE_MATCHING_API_URL || 'https://v25matchingbackend-production.up.railway.app/api';
                const response = await axios.get(`${matchingApiUrl}/gig-agents/agent/${selectedRepId}`);

                if (response.data) {
                    const enrolledOnly = response.data.filter((ga: EnrolledGig) => ga.status?.toLowerCase() === 'enrolled');

                    const mappedGigs: Gig[] = enrolledOnly.map((gigAgent: EnrolledGig) => ({
                        id: gigAgent.gigId._id,
                        name: gigAgent.gigId.title,
                        description: gigAgent.gigId.description || '',
                        company: gigAgent.gigId.companyId?.name || 'Unknown Company',
                        companyId: gigAgent.gigId.companyId?._id || '',
                        color: stringToColor(gigAgent.gigId._id || gigAgent.gigId.title),
                        skills: [],
                        priority: 'medium',
                        availability: gigAgent.gigId.availability
                    }));

                    setGigs(mappedGigs);
                }
            } catch (error) {
                console.error('Error fetching enrolled gigs:', error);
            }
        };

        if (userRole === 'rep') {
            fetchEnrolledGigs();
        }
    }, [selectedRepId, userRole]);

    useEffect(() => {
        refreshData();
    }, [selectedRepId, userRole, selectedGigId, selectedDate]);

    useEffect(() => {
        if (gigs.length <= 0) return;
        if (routeGigId && gigs.some((g) => g.id === routeGigId)) {
            setSelectedGigId(routeGigId);
            return;
        }
        if (!selectedGigId) {
            setSelectedGigId(gigs[0].id);
        }
    }, [gigs, routeGigId, selectedGigId]);

    const weeklyStats = useMemo<WeeklyStats>(() => {
        const stats: WeeklyStats = {
            totalHours: 0,
            gigBreakdown: {} as Record<string, number>,
            availableSlots: 0,
            reservedSlots: 0,
            pendingHours: 0
        };

        const filteredSlots = userRole === 'rep'
            ? slots.filter(slot => slot.repId === selectedRepId)
            : slots;

        filteredSlots.forEach((slot) => {
            if (slot.status !== 'cancelled') {
                stats.totalHours += slot.duration || 1;
                if (slot.status === 'available') {
                    stats.availableSlots++;
                } else if (slot.status === 'reserved') {
                    stats.reservedSlots++;
                }
                if (slot.gigId) {
                    stats.gigBreakdown[slot.gigId] = (stats.gigBreakdown[slot.gigId] || 0) + (slot.duration || 1);
                }
            }
        });

        stats.pendingHours = draftSlots.reduce((sum, s) => sum + (s.duration || 1), 0);
        return stats;
    }, [slots, userRole, selectedRepId, draftSlots]);

    const isPastDate = format(selectedDate, 'yyyy-MM-dd') < format(new Date(), 'yyyy-MM-dd');

    const handleTimeSelect = (time: string) => {
        if (isPastDate) return;
        const hour = parseInt(time.split(':')[0]);
        const dateStr = format(selectedDate, 'yyyy-MM-dd');
        const isAlreadyDrafted = draftSlots.some(s => s.date === dateStr && s.startTime === time);

        setQuickStart('');
        setQuickEnd('');

        if (isAlreadyDrafted) {
            setDraftSlots(prev => prev.filter(s => !(s.date === dateStr && s.startTime === time)));
        } else {
            setDraftSlots(prev => [...prev, {
                id: crypto.randomUUID(),
                date: dateStr,
                startTime: time,
                endTime: `${(hour + 1).toString().padStart(2, '0')}:00`,
                duration: 1,
                repId: selectedRepId,
                status: 'reserved',
                gigId: selectedGigId || undefined
            }]);
        }
    };

    const updateDraftRange = (start: string, end: string) => {
        if (isPastDate || !start || !end) return;
        const startH = parseInt(start.split(':')[0]);
        const endH = parseInt(end.split(':')[0]);
        const dateStr = format(selectedDate, 'yyyy-MM-dd');

        if (endH > startH) {
            const newRange: Partial<TimeSlot>[] = [];
            for (let h = startH; h < endH; h++) {
                const hStr = `${h.toString().padStart(2, '0')}:00`;
                const endHStr = `${(h + 1).toString().padStart(2, '0')}:00`;
                newRange.push({
                    id: crypto.randomUUID(),
                    date: dateStr,
                    startTime: hStr,
                    endTime: endHStr,
                    duration: 1,
                    repId: selectedRepId,
                    status: 'reserved',
                    gigId: selectedGigId || undefined
                });
            }
            setDraftSlots(newRange);
            setQuickStart('');
            setQuickEnd('');
        }
    };

    const handleSlotUpdate = async (updates: Partial<TimeSlot>) => {
        let slotWithRep: TimeSlot;
        if (updates.id) {
            const existing = slots.find(s => s.id === updates.id);
            if (existing) {
                slotWithRep = { ...existing, ...updates } as TimeSlot;
            } else {
                slotWithRep = { ...updates, repId: (updates as any).repId || selectedRepId } as TimeSlot;
            }
        } else if (selectedSlot) {
            slotWithRep = { ...selectedSlot, ...updates } as TimeSlot;
        } else {
            return;
        }

        try {
            const existing = updates.id ? slots.find(s => s.id === updates.id) : null;
            if (existing && (existing as any).capacity !== undefined && updates.status === 'reserved') {
                await slotApi.reserveSlot(
                    existing.id,
                    selectedRepId,
                    updates.notes || '',
                    format(selectedDate, 'yyyy-MM-dd')
                );
                await refreshData();
                showNotification('success', 'Slot reserved successfully');
                return;
            }
            if (existing && (existing as any).capacity !== undefined && updates.notes !== undefined && (existing as any).reservationId) {
                await slotApi.updateReservationNotes((existing as any).reservationId, updates.notes);
                await refreshData();
                showNotification('success', 'Reservation notes updated');
                return;
            }
            if (existing && (existing as any).capacity !== undefined && updates.status === 'available') {
                const resId = (existing as any).reservationId || existing.id;
                await slotApi.cancelReservation(resId);
                await refreshData();
                showNotification('success', 'Reservation cancelled');
                return;
            }
            await schedulerApi.upsertTimeSlot(slotWithRep);
            await refreshData();
            showNotification('success', updates.id ? 'Time slot updated successfully' : 'New time slot created');
        } catch (error) {
            console.error('Error saving slot:', error);
            showNotification('error', 'Failed to save time slot');
        }
    };

    const handleSlotCancel = async (slotId: string) => {
        try {
            const slot = slots.find(s => s.id === slotId);
            if (slot && (slot as any).reservationId) {
                await slotApi.cancelReservation((slot as any).reservationId);
            } else if (slot && (slot as any).isReservation) {
                await slotApi.cancelReservation(slotId);
            } else {
                await schedulerApi.cancelTimeSlot(slotId);
            }
            await refreshData();
            showNotification('success', 'Time slot cancelled');
        } catch (error) {
            console.error('Error cancelling slot:', error);
            showNotification('error', 'Failed to cancel time slot');
        }
        if (selectedSlot?.id === slotId) setSelectedSlot(null);
    };

    const handleQuickReserve = async () => {
        if (!selectedGigId || draftSlots.length === 0) return;
        try {
            await Promise.all(draftSlots.map(slot =>
                schedulerApi.upsertTimeSlot({
                    ...slot,
                    gigId: selectedGigId,
                    notes: draftSlotNotes[`${slot.date}:${slot.startTime}`] ?? globalNotes ?? slot.notes ?? ''
                })
            ));
            await refreshData();
            showNotification('success', `${draftSlots.length} time block(s) reserved successfully`);
            setDraftSlots([]);
            setDraftSlotNotes({});
            setGlobalNotes('');
        } catch (error) {
            console.error('Error in multi-reserve:', error);
            showNotification('error', 'Failed to reserve time blocks');
        }
    };

    const handleSlotSelect = (slot: TimeSlot) => {
        setSelectedSlot(slot);
    };

    const showNotification = (type: 'success' | 'error', message: string) => {
        setNotification({ type, message });
        setTimeout(() => setNotification(null), 5000);
    };

    return (
        <div className="min-h-screen bg-gray-50/50 font-sans p-4">
            {notification && (
                <div className={`fixed top-8 right-8 z-50 px-5 py-3 rounded-xl shadow-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 ${
                    notification.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-100 shadow-emerald-500/5' : 'bg-harx-50 text-harx-800 border border-harx-100 shadow-harx-500/5'
                }`}>
                    <AlertCircle className={`w-4 h-4 shrink-0 ${notification.type === 'success' ? 'text-emerald-500' : 'text-harx-500'}`} />
                    <p className="font-black text-xs uppercase tracking-tight">{notification.message}</p>
                </div>
            )}

            <div className="max-w-[1600px] mx-auto space-y-4">
                {/* Page title + stats */}
                <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 to-slate-800 p-6 shadow-lg shadow-slate-900/20">
                    <div className="absolute -top-16 -right-10 h-48 w-48 rounded-full bg-harx-500/20 blur-3xl pointer-events-none"></div>
                    <div className="absolute -bottom-20 -left-10 h-48 w-48 rounded-full bg-harx-alt-500/10 blur-3xl pointer-events-none"></div>
                    <div className="relative z-10 flex flex-wrap items-center justify-between gap-5">
                        <div className="flex items-center gap-4">
                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-sm border border-white/15 shadow-lg">
                                <CalendarRange className="h-6 w-6 text-harx-300" />
                            </div>
                            <div>
                                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-harx-300">Planning des sessions</span>
                                <h1 className="text-2xl font-black text-white tracking-tight leading-none mt-0.5">{t('sessionPlanning.title')}</h1>
                                <p className="text-[11px] font-medium text-white/50 mt-1">Gérez et réservez vos créneaux d'appels en toute simplicité.</p>
                            </div>
                            {loadingGigs && (
                                <div className="ml-2 flex items-center gap-1.5">
                                    <Skeleton className="h-5 w-24" variant="rounded" />
                                </div>
                            )}
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-3 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/15 px-4 py-3">
                                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-harx-500/20">
                                    <Clock className="h-4.5 w-4.5 text-harx-300" />
                                </div>
                                <div>
                                    <p className="text-[9px] text-white/50 font-black uppercase tracking-widest mb-0.5">Engagement hebdo</p>
                                    <p className="text-xl font-black text-white tracking-tight">{weeklyStats.totalHours}<span className="text-sm text-white/40 ml-1">h</span></p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/15 px-4 py-3">
                                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/20">
                                    <CheckCircle2 className="h-4.5 w-4.5 text-emerald-300" />
                                </div>
                                <div>
                                    <p className="text-[9px] text-white/50 font-black uppercase tracking-widest mb-0.5">Réservés</p>
                                    <p className="text-xl font-black text-white tracking-tight">{weeklyStats.reservedSlots}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/15 px-4 py-3">
                                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/20">
                                    <Briefcase className="h-4.5 w-4.5 text-indigo-300" />
                                </div>
                                <div>
                                    <p className="text-[9px] text-white/50 font-black uppercase tracking-widest mb-0.5">Projets actifs</p>
                                    <p className="text-xl font-black text-white tracking-tight">{Object.keys(weeklyStats.gigBreakdown).length}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <main className="w-full">
                    {userRole === 'company' ? (
                        <div className="space-y-8">
                            <div className="flex space-x-3 overflow-x-auto pb-6 no-scrollbar">
                                {loadingGigs ? (
                                    [1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-40 shrink-0" variant="rounded" />)
                                ) : gigs.length === 0 ? (
                                    <div className="text-gray-400 italic px-8 py-5 bg-white/50 backdrop-blur-sm rounded-3xl border border-dashed border-gray-200 w-full text-center text-[10px] font-black uppercase tracking-widest">No active projects found.</div>
                                ) : (
                                    gigs.map(gig => (
                                        <button
                                            key={gig.id}
                                            onClick={() => setSelectedGigId(gig.id)}
                                            className={`px-8 py-4 rounded-2xl whitespace-nowrap transition-all duration-300 text-[10px] font-black uppercase tracking-widest ${selectedGigId === gig.id
                                                ? 'bg-gradient-harx text-white shadow-lg shadow-harx-500/20'
                                                : 'bg-white text-gray-500 hover:text-harx-600 hover:bg-harx-50 border border-gray-100 shadow-sm'
                                                }`}
                                        >
                                            {gig.name}
                                        </button>
                                    ))
                                )}
                            </div>

                            {selectedGigId && (
                                <div className="space-y-8">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="p-8 bg-white/80 backdrop-blur-md rounded-3xl shadow-sm border border-gray-100 relative overflow-hidden group hover:border-emerald-100 transition-all">
                                            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-[50px] -mr-16 -mt-16 group-hover:bg-emerald-500/10 transition-all"></div>
                                            <p className="text-[10px] text-gray-400 mb-2 font-black uppercase tracking-widest relative z-10">REPs Scheduled</p>
                                            <p className="text-4xl font-black text-gray-900 tracking-tight relative z-10">
                                                {new Set(slots
                                                    .filter(slot => slot.gigId === selectedGigId && slot.status === 'reserved')
                                                    .map(slot => slot.repId)
                                                ).size}
                                            </p>
                                        </div>
                                        <div className="p-8 bg-white/80 backdrop-blur-md rounded-3xl shadow-sm border border-gray-100 relative overflow-hidden group hover:border-harx-100 transition-all">
                                            <div className="absolute top-0 right-0 w-32 h-32 bg-harx-500/5 blur-[50px] -mr-16 -mt-16 group-hover:bg-harx-500/10 transition-all"></div>
                                            <p className="text-[10px] text-gray-400 mb-2 font-black uppercase tracking-widest relative z-10">Total Commitment</p>
                                            <p className="text-4xl font-black text-gray-900 tracking-tight relative z-10">
                                                {slots
                                                    .filter(slot => slot.gigId === selectedGigId && slot.status === 'reserved')
                                                    .reduce((sum, slot) => sum + slot.duration, 0)}<span className="text-xl text-gray-400 ml-1">h</span>
                                            </p>
                                        </div>
                                    </div>

                                    <CompanyView
                                        company={gigs.find(g => g.id === selectedGigId)?.name || ''}
                                        gigs={gigs.filter(g => g.id === selectedGigId).map(g => ({ ...g, company: g.name }))}
                                        slots={slots}
                                        reps={reps}
                                        selectedDate={selectedDate}
                                    />
                                </div>
                            )}
                        </div>
                    ) : userRole === 'rep' ? (
                        <div className="space-y-3">
                            <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
                                <div className="flex items-center gap-1.5 mb-3 text-slate-400">
                                    <Briefcase className="w-3.5 h-3.5" />
                                    <span className="text-[10px] font-black uppercase tracking-widest">Projet sélectionné</span>
                                </div>
                                <WalletFilterSelect
                                    label="Gig inscrit"
                                    value={selectedGigId || ''}
                                    onChange={(v) => setSelectedGigId(v === '' ? null : v)}
                                    options={[
                                        { value: '', label: 'Choisir un projet…', tone: 'neutral' as const },
                                        ...gigs.map((gig: Gig) => ({ value: gig.id, label: gig.name, tone: 'brand' as const })),
                                    ]}
                                    className="w-full md:max-w-[460px]"
                                />
                            </div>

                            <HorizontalCalendar
                                selectedDate={selectedDate}
                                onDateSelect={setSelectedDate}
                                slots={slots.filter((slot: TimeSlot) => slot.repId === selectedRepId)}
                                selectedGigId={selectedGigId || ''}
                            />

                            {selectedGigId ? (
                                <AvailableSlotsGrid
                                    selectedDate={selectedDate}
                                    gigId={selectedGigId}
                                    onReservationMade={refreshData}
                                />
                            ) : (
                                <div className="flex flex-col items-center justify-center py-16 text-center rounded-2xl border border-dashed border-slate-200 bg-white">
                                    <div className="h-14 w-14 rounded-2xl bg-harx-50 flex items-center justify-center mb-4">
                                        <Sparkles className="w-7 h-7 text-harx-400" />
                                    </div>
                                    <p className="text-sm font-black text-slate-700 uppercase tracking-wider">Sélectionnez un projet</p>
                                    <p className="text-xs text-slate-400 font-medium mt-1 max-w-xs">
                                        Choisissez un gig ci-dessus pour afficher les créneaux disponibles à la réservation.
                                    </p>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-8">
                            <div className="bg-white/80 backdrop-blur-md rounded-[2.5rem] shadow-sm border border-gray-100 p-10 relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 blur-[100px] -mr-32 -mt-32"></div>
                                <h2 className="text-3xl font-black text-gray-900 mb-10 flex items-center tracking-tighter uppercase relative z-10">
                                    <div className="w-2.5 h-10 bg-gradient-to-b from-indigo-500 to-indigo-700 rounded-full mr-6 shadow-lg shadow-indigo-500/20"></div>
                                    Admin Intelligence Hub
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10">
                                    <div className="bg-indigo-600 rounded-[2rem] p-8 text-white shadow-xl shadow-indigo-500/20 relative overflow-hidden group">
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 blur-[40px] -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700"></div>
                                        <h3 className="text-[10px] font-black opacity-60 uppercase mb-3 tracking-[0.2em]">Scale: Total REPs</h3>
                                        <p className="text-6xl font-black tracking-tighter">{reps.length}</p>
                                    </div>
                                    <div className="bg-emerald-500 rounded-[2rem] p-8 text-white shadow-xl shadow-emerald-500/20 relative overflow-hidden group">
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 blur-[40px] -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700"></div>
                                        <h3 className="text-[10px] font-black opacity-60 uppercase mb-3 tracking-[0.2em]">Network: Partners</h3>
                                        <p className="text-6xl font-black tracking-tighter">{sampleCompanies.length}</p>
                                    </div>
                                    <div className="bg-harx-600 rounded-[2rem] p-8 text-white shadow-xl shadow-harx-500/20 relative overflow-hidden group">
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 blur-[40px] -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700"></div>
                                        <h3 className="text-[10px] font-black opacity-60 uppercase mb-3 tracking-[0.2em]">Impact: Active projects</h3>
                                        <p className="text-6xl font-black tracking-tighter">{gigs.length}</p>
                                    </div>
                                </div>
                            </div>

                            {showAttendancePanel && (
                                <AttendanceReport reps={reps} slots={slots} />
                            )}

                            {showAIPanel && (
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                    <WorkloadPrediction slots={slots} />
                                    <div className="bg-white/80 backdrop-blur-md rounded-[2.5rem] shadow-sm border border-gray-100 p-10 relative overflow-hidden">
                                        <div className="absolute top-0 right-0 w-64 h-64 bg-harx-500/5 blur-[100px] -mr-32 -mt-32"></div>
                                        <div className="flex items-center mb-10 relative z-10">
                                            <div className="w-14 h-14 bg-gradient-harx rounded-2xl flex items-center justify-center shadow-lg shadow-harx-500/20 mr-6">
                                                <Brain className="w-7 h-7 text-white" />
                                            </div>
                                            <h2 className="text-3xl font-black text-gray-900 tracking-tighter uppercase leading-none">AI Strategic Insights</h2>
                                        </div>
                                        <div className="space-y-6 relative z-10">
                                            <div className="p-8 bg-harx-50 rounded-[2rem] border border-harx-100 shadow-sm shadow-harx-500/5 relative overflow-hidden group">
                                                <div className="absolute top-0 right-0 w-32 h-32 bg-harx-500/5 blur-[40px] -mr-16 -mt-16 group-hover:bg-harx-500/10 transition-all"></div>
                                                <h3 className="font-black text-harx-900 mb-3 uppercase text-[10px] tracking-widest relative z-10">Scheduling Optimization</h3>
                                                <p className="text-sm text-harx-800 leading-relaxed font-black relative z-10">
                                                    Global operation efficiency is at <span className="text-3xl tracking-tighter text-harx-900 mx-1">78%</span>.
                                                    Predicted optimization could increase output by <span className="text-emerald-500 font-black">14%</span> next week.
                                                </p>
                                            </div>
                                            <div className="p-8 bg-indigo-50 rounded-[2rem] border border-indigo-100 shadow-sm shadow-indigo-500/5 relative overflow-hidden group">
                                                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 blur-[40px] -mr-16 -mt-16 group-hover:bg-indigo-500/10 transition-all"></div>
                                                <h3 className="font-black text-indigo-900 mb-3 uppercase text-[10px] tracking-widest relative z-10">Intelligence Report</h3>
                                                <p className="text-sm text-indigo-800 leading-relaxed font-black relative z-10">
                                                    Peak resource utilization identified: <span className="px-2 py-0.5 bg-indigo-100 rounded-lg mx-1">10:00 - 15:00 UTC</span>.
                                                    Recommended shift re-distribution for evening operations.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-4">
                                <div className="bg-white/80 backdrop-blur-md rounded-[2.5rem] shadow-sm border border-gray-100 p-10 relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 blur-[100px] -mr-32 -mt-32 group-hover:bg-emerald-500/10 transition-all"></div>
                                    <h2 className="text-[10px] font-black text-emerald-600 mb-8 uppercase tracking-[0.2em] relative z-10 flex items-center">
                                        <div className="w-1.5 h-4 bg-emerald-500 rounded-full mr-3 animate-pulse"></div>
                                        Active Force: REP Performance
                                    </h2>
                                    <div className="space-y-4 relative z-10">
                                        {reps.map(rep => {
                                            const repSlots = slots.filter(slot => slot.repId === rep.id && slot.status === 'reserved');
                                            const totalHours = repSlots.reduce((sum, slot) => sum + slot.duration, 0);
                                            return (
                                                <div key={rep.id} className="flex items-center justify-between p-6 bg-white rounded-3xl group/item hover:bg-emerald-50 hover:shadow-lg hover:shadow-emerald-500/5 transition-all border border-gray-50 hover:border-emerald-100">
                                                    <div className="flex items-center gap-6">
                                                        <div className="w-14 h-14 rounded-2xl bg-white shadow-sm flex items-center justify-center overflow-hidden border border-gray-100 group-hover/item:border-emerald-200 transition-all">
                                                            {rep.avatar ? (
                                                                <img src={rep.avatar} alt={rep.name} className="w-full h-full object-cover" />
                                                            ) : (
                                                                <Users className="w-7 h-7 text-gray-400 group-hover/item:text-emerald-500" />
                                                            )}
                                                        </div>
                                                        <div>
                                                            <h4 className="font-black text-gray-900 tracking-tight group-hover/item:text-emerald-900">{rep.name}</h4>
                                                            <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">{rep.email}</p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-2xl font-black text-emerald-600 tracking-tighter group-hover/item:scale-110 transition-transform">{totalHours}<span className="text-xs ml-0.5 opacity-60">h</span></p>
                                                        <div className="flex space-x-2 mt-2">
                                                            <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-[10px] font-black rounded-lg uppercase tracking-widest">P: {rep.performanceScore}</span>
                                                            <span className="px-2 py-1 bg-blue-100 text-blue-700 text-[10px] font-black rounded-lg uppercase tracking-widest">A: {rep.attendanceScore}%</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className="bg-white/80 backdrop-blur-md rounded-[2.5rem] shadow-sm border border-gray-100 p-10 relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 w-64 h-64 bg-harx-500/5 blur-[100px] -mr-32 -mt-32 group-hover:bg-harx-500/10 transition-all"></div>
                                    <h2 className="text-[10px] font-black text-harx-600 mb-8 uppercase tracking-[0.2em] relative z-10 flex items-center">
                                        <div className="w-1.5 h-4 bg-harx-500 rounded-full mr-3 animate-pulse"></div>
                                        Strategic Network: Partners
                                    </h2>
                                    <div className="space-y-4 relative z-10">
                                        {sampleCompanies.map(company => {
                                            const companySlots = slots.filter(slot => {
                                                const gig = gigs.find(g => g.id === slot.gigId);
                                                return gig?.company === company.name && slot.status === 'reserved';
                                            });
                                            const totalHours = companySlots.reduce((sum, slot) => sum + slot.duration, 0);
                                            const uniqueReps = new Set(companySlots.map(slot => slot.repId)).size;
                                            return (
                                                <div key={company.id} className="flex items-center justify-between p-6 bg-white rounded-3xl group/item hover:bg-harx-50 hover:shadow-lg hover:shadow-harx-500/5 transition-all border border-gray-50 hover:border-harx-100">
                                                    <div className="flex items-center gap-6">
                                                        <div className="w-14 h-14 rounded-2xl bg-white shadow-sm flex items-center justify-center overflow-hidden border border-gray-100 group-hover/item:border-harx-200 transition-all">
                                                            {company.logo ? (
                                                                <img src={company.logo} alt={company.name} className="w-full h-full object-contain p-2" />
                                                            ) : (
                                                                <Building className="w-7 h-7 text-gray-400 group-hover/item:text-harx-500" />
                                                            )}
                                                        </div>
                                                        <div>
                                                            <h4 className="font-black text-gray-900 tracking-tight group-hover/item:text-harx-900">{company.name}</h4>
                                                            <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">{uniqueReps} REPs Active</p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-2xl font-black text-harx-600 tracking-tighter group-hover/item:scale-110 transition-transform">{totalHours}<span className="text-xs ml-0.5 opacity-60">h</span></p>
                                                        <span className="px-2 py-1 bg-harx-100 text-harx-700 text-[10px] font-black rounded-lg mt-2 inline-block uppercase tracking-widest">Priority {company.priority}</span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}

export default SessionPlanning;
