import { useMemo } from 'react';
import { Rep, TimeSlot } from '../../../types/scheduler';
import { startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { Award, AlertCircle, CheckCircle, XCircle, TrendingUp, Target } from 'lucide-react';

interface AttendanceScoreCardProps {
    rep: Rep;
    slots: TimeSlot[];
}

export function AttendanceScorecard({ rep, slots }: AttendanceScoreCardProps) {
    const metrics = useMemo(() => {
        const repSlots = slots.filter(slot =>
            slot.repId === rep.id &&
            slot.status === 'reserved' &&
            slot.attended !== undefined
        );

        const totalTracked = repSlots.length;
        const attended = repSlots.filter(slot => slot.attended === true).length;

        const now = new Date();
        const monthStart = startOfMonth(now);
        const monthEnd = endOfMonth(now);

        const currentMonthSlots = repSlots.filter(slot => {
            const slotDate = new Date(slot.date);
            return isWithinInterval(slotDate, { start: monthStart, end: monthEnd });
        });

        const currentMonthTotal = currentMonthSlots.length;
        const currentMonthAttended = currentMonthSlots.filter(slot => slot.attended === true).length;

        const attendanceScore = totalTracked > 0
            ? Math.round((attended / totalTracked) * 100)
            : 0;

        const currentMonthScore = currentMonthTotal > 0
            ? Math.round((currentMonthAttended / currentMonthTotal) * 100)
            : 0;

        let reliabilityTier = 'INITIALIZING';
        if (totalTracked >= 5) {
            if (attendanceScore >= 95) reliabilityTier = 'ELITE';
            else if (attendanceScore >= 85) reliabilityTier = 'PROFESSIONAL';
            else if (attendanceScore >= 75) reliabilityTier = 'STABLE';
            else reliabilityTier = 'UNDER REVIEW';
        }

        return {
            attendanceScore,
            currentMonthScore,
            totalTracked,
            attended,
            currentMonthTotal,
            currentMonthAttended,
            reliabilityTier
        };
    }, [rep, slots]);

    const getScoreStyles = (score: number) => {
        if (score >= 90) return 'text-emerald-500 border-emerald-100 bg-emerald-50/20';
        if (score >= 80) return 'text-blue-500 border-blue-100 bg-blue-50/20';
        if (score >= 70) return 'text-amber-500 border-amber-100 bg-amber-50/20';
        return 'text-rose-500 border-rose-100 bg-rose-50/20';
    };

    const getTierBadgeStyles = (tier: string) => {
        switch (tier) {
            case 'ELITE': return 'bg-emerald-600 text-white shadow-emerald-100';
            case 'PROFESSIONAL': return 'bg-blue-600 text-white shadow-blue-100';
            case 'STABLE': return 'bg-amber-600 text-white shadow-amber-100';
            case 'UNDER REVIEW': return 'bg-rose-600 text-white shadow-rose-100';
            default: return 'bg-gray-400 text-white';
        }
    };

    return (
        <div className="bg-white rounded-3xl shadow-sm border border-gray-200 p-8">
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center">
                    <div className="p-2.5 bg-blue-50 rounded-2xl mr-4 shadow-sm text-blue-600">
                        <Award className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-gray-900 tracking-tight uppercase">SCORECARD</h2>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-0.5">Reliability & Compliance Audit</p>
                    </div>
                </div>
            </div>

            <div className="flex flex-col items-center mb-10">
                <div className="relative group">
                    <div className="absolute inset-0 bg-blue-100 rounded-full blur-2xl opacity-20 group-hover:opacity-40 transition-opacity" />
                    <div className={`relative w-40 h-40 rounded-full border-[10px] flex items-center justify-center transition-all duration-500 shadow-inner ${getScoreStyles(metrics.attendanceScore).split(' ')[1]}`}>
                        <div className="text-center">
                            <div className={`text-4xl font-black tracking-tighter ${getScoreStyles(metrics.attendanceScore).split(' ')[0]}`}>
                                {metrics.attendanceScore}%
                            </div>
                            <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest mt-1">COMPLIANCE</div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100 text-center">
                    <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 text-center">CURRENT MONTH</div>
                    <div className={`text-2xl font-black ${getScoreStyles(metrics.currentMonthScore).split(' ')[0]}`}>
                        {metrics.currentMonthScore}%
                    </div>
                    <div className="text-[9px] font-bold text-gray-400 mt-1 uppercase">
                        {metrics.currentMonthAttended} / {metrics.currentMonthTotal} SESSIONS
                    </div>
                </div>
                <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100 flex flex-col items-center justify-center">
                    <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 text-center">TRUST TIER</div>
                    <div className={`text-[10px] font-black px-4 py-1.5 rounded-full shadow-lg transition-all ${getTierBadgeStyles(metrics.reliabilityTier)}`}>
                        {metrics.reliabilityTier}
                    </div>
                </div>
            </div>

            <div className="space-y-3">
                <div className="flex justify-between items-center p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100 group hover:bg-emerald-50 transition-colors">
                    <div className="flex items-center">
                        <CheckCircle className="w-4 h-4 text-emerald-600 mr-3" />
                        <span className="text-xs font-black text-emerald-900 uppercase tracking-tight">Present</span>
                    </div>
                    <span className="text-sm font-black text-emerald-700">{metrics.attended}</span>
                </div>
                <div className="flex justify-between items-center p-4 bg-rose-50/50 rounded-2xl border border-rose-100 group hover:bg-rose-50 transition-colors">
                    <div className="flex items-center">
                        <XCircle className="w-4 h-4 text-rose-600 mr-3" />
                        <span className="text-xs font-black text-rose-900 uppercase tracking-tight">Missed</span>
                    </div>
                    <span className="text-sm font-black text-rose-700">{metrics.totalTracked - metrics.attended}</span>
                </div>
                <div className="flex justify-between items-center p-4 bg-blue-50/50 rounded-2xl border border-blue-100 group hover:bg-blue-50 transition-colors">
                    <div className="flex items-center">
                        <TrendingUp className="w-4 h-4 text-blue-600 mr-3" />
                        <span className="text-xs font-black text-blue-900 uppercase tracking-tight">Total Volume</span>
                    </div>
                    <span className="text-sm font-black text-blue-700">{metrics.totalTracked}</span>
                </div>
            </div>

            {metrics.totalTracked < 5 && (
                <div className="mt-8 flex items-start p-4 bg-amber-50 rounded-2xl border border-amber-100">
                    <AlertCircle className="w-4 h-4 text-amber-600 mr-3 mt-0.5 shrink-0" />
                    <p className="text-[10px] font-bold text-amber-800 leading-relaxed uppercase tracking-tight">
                        Insufficient data for Tier Calibration. A minimum of 5 verified sessions is required.
                    </p>
                </div>
            )}

            <div className="mt-6 flex flex-col items-center">
                <div className="flex items-center text-[9px] font-bold text-gray-400 italic">
                    <Target className="w-3 h-3 mr-1.5 text-blue-400" />
                    Target Score: 95% for Elite status
                </div>
            </div>
        </div>
    );
}
