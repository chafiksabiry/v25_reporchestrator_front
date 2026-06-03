import { useState } from 'react';
import { Rep, TimeSlot } from '../../../types/scheduler';
import { format, parseISO, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { FileText, Download, Filter, CheckCircle, XCircle, Users, BarChart3, TrendingUp } from 'lucide-react';

interface AttendanceReportProps {
    reps: Rep[];
    slots: TimeSlot[];
}

export function AttendanceReport({ reps, slots }: AttendanceReportProps) {
    const [timeframe, setTimeframe] = useState<'all' | 'month' | 'week'>('month');
    const [sortBy, setSortBy] = useState<'name' | 'score'>('score');

    const filteredSlots = slots.filter(slot => {
        const slotDate = parseISO(slot.date);
        const now = new Date();

        if (timeframe === 'month') {
            const monthStart = startOfMonth(now);
            const monthEnd = endOfMonth(now);
            return isWithinInterval(slotDate, { start: monthStart, end: monthEnd });
        } else if (timeframe === 'week') {
            const weekStart = new Date(now);
            weekStart.setDate(now.getDate() - now.getDay());
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekStart.getDate() + 6);
            return isWithinInterval(slotDate, { start: weekStart, end: weekEnd });
        }

        return true;
    });

    const repScores = reps.map(rep => {
        const repSlots = filteredSlots.filter(slot =>
            slot.repId === rep.id &&
            slot.status === 'reserved' &&
            slot.attended !== undefined
        );

        const totalTracked = repSlots.length;
        const attended = repSlots.filter(slot => slot.attended === true).length;

        const score = totalTracked > 0
            ? Math.round((attended / totalTracked) * 100)
            : 0;

        return {
            ...rep,
            attendanceScore: score,
            totalTracked,
            attended
        };
    });

    const sortedReps = [...repScores].sort((a, b) => {
        if (sortBy === 'name') {
            return a.name.localeCompare(b.name);
        } else {
            return (b.attendanceScore || 0) - (a.attendanceScore || 0);
        }
    });

    const getScoreStyles = (score: number | undefined) => {
        const s = score || 0;
        if (s >= 90) return 'bg-emerald-50 text-emerald-700 border-emerald-100';
        if (s >= 80) return 'bg-blue-50 text-blue-700 border-blue-100';
        if (s >= 70) return 'bg-amber-50 text-amber-700 border-amber-100';
        return 'bg-rose-50 text-rose-700 border-rose-100';
    };

    const generateCSV = () => {
        const headers = ['REP Name', 'Email', 'Attendance Score', 'Sessions Attended', 'Total Sessions', 'Specialties'];
        const rows = sortedReps.map(rep => [
            rep.name,
            rep.email,
            `${rep.attendanceScore}%`,
            rep.attended,
            rep.totalTracked,
            rep.specialties.join(', ')
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `attendance_report_${format(new Date(), 'yyyy-MM-dd')}.csv`);
        link.click();
    };

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-8 border-b border-gray-50 flex flex-wrap items-center justify-between gap-6">
                <div className="flex items-center">
                    <div className="p-2.5 bg-blue-600 rounded-2xl mr-4 shadow-lg shadow-blue-100 text-white">
                        <BarChart3 className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-gray-900 tracking-tight uppercase">HARX ATTENDANCE ANALYTICS</h2>
                        <p className="text-xs font-bold text-gray-400 mt-0.5 uppercase tracking-widest">Performance Insights & Compliance</p>
                    </div>
                </div>

                <div className="flex items-center space-x-3">
                    <div className="flex bg-gray-50 p-1 rounded-xl border border-gray-100">
                        {['all', 'month', 'week'].map((t) => (
                            <button
                                key={t}
                                onClick={() => setTimeframe(t as any)}
                                className={`px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${timeframe === t
                                        ? 'bg-white text-blue-600 shadow-sm border border-gray-100'
                                        : 'text-gray-400 hover:text-gray-600'
                                    }`}
                            >
                                {t}
                            </button>
                        ))}
                    </div>
                    <button
                        onClick={generateCSV}
                        className="p-2 bg-white border border-gray-200 text-gray-400 hover:text-blue-600 hover:border-blue-200 rounded-xl transition-all shadow-sm group"
                        title="Download CSV Report"
                    >
                        <Download className="w-5 h-5 group-hover:scale-110 transition-transform" />
                    </button>
                </div>
            </div>

            <div className="overflow-x-auto no-scrollbar">
                <table className="min-w-full">
                    <thead>
                        <tr className="bg-gray-50/50">
                            {[
                                { label: 'REP IDENTITY', width: '40%' },
                                { label: 'COMPLIANCE SCORE', width: '20%' },
                                { label: 'SESSSION STATS', width: '20%' },
                                { label: 'TAGS', width: '20%' }
                            ].map((header, idx) => (
                                <th key={header.label} className={`px-8 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest ${idx > 0 ? 'text-center' : ''}`} style={{ width: header.width }}>
                                    {header.label}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {sortedReps.map(rep => (
                            <tr key={rep.id} className="group hover:bg-blue-50/20 transition-colors">
                                <td className="px-8 py-6">
                                    <div className="flex items-center">
                                        <div className="relative">
                                            <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center overflow-hidden border border-gray-100 group-hover:scale-105 transition-transform duration-300">
                                                {rep.avatar ? (
                                                    <img src={rep.avatar} alt={rep.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    <Users className="w-6 h-6 text-gray-200" />
                                                )}
                                            </div>
                                            <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white" />
                                        </div>
                                        <div className="ml-5">
                                            <div className="text-sm font-black text-gray-900 group-hover:text-blue-600 transition-colors uppercase tracking-tight">{rep.name}</div>
                                            <div className="text-[10px] font-bold text-gray-400 tracking-wider mt-0.5">{rep.email}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-8 py-6 text-center">
                                    <div className={`inline-flex items-center px-4 py-1.5 rounded-full border text-xs font-black tracking-widest ${getScoreStyles(rep.attendanceScore)}`}>
                                        <TrendingUp className="w-3.5 h-3.5 mr-2" />
                                        {rep.attendanceScore}%
                                    </div>
                                </td>
                                <td className="px-8 py-6 text-center">
                                    <div className="flex items-center justify-center space-x-4">
                                        <div className="flex items-center">
                                            <div className="w-2 h-2 rounded-full bg-emerald-500 mr-2" />
                                            <span className="text-sm font-black text-gray-700">{rep.attended}</span>
                                        </div>
                                        <div className="flex items-center">
                                            <div className="w-2 h-2 rounded-full bg-rose-400 mr-2" />
                                            <span className="text-sm font-black text-gray-400">{rep.totalTracked - rep.attended}</span>
                                        </div>
                                    </div>
                                    <div className="text-[9px] font-black text-gray-300 uppercase tracking-tighter mt-1">ATTENDED / MISSED</div>
                                </td>
                                <td className="px-8 py-6">
                                    <div className="flex flex-wrap gap-1.5 justify-center">
                                        {rep.specialties.slice(0, 2).map((specialty, i) => (
                                            <span
                                                key={i}
                                                className="px-2 py-0.5 rounded-md text-[9px] font-black bg-white border border-gray-100 text-gray-500 uppercase tracking-tighter"
                                            >
                                                {specialty}
                                            </span>
                                        ))}
                                    </div>
                                </td>
                            </tr>
                        ))}

                        {sortedReps.length === 0 && (
                            <tr>
                                <td colSpan={4} className="px-8 py-16 text-center">
                                    <div className="flex flex-col items-center">
                                        <FileText className="w-12 h-12 text-gray-100 mb-4" />
                                        <p className="text-sm font-bold text-gray-300 uppercase tracking-widest">No Compliance Data for this Window</p>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-between items-center">
                <div className="flex items-center text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mr-3 animate-pulse" />
                    Live Analytics Feed Active
                </div>
                <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    Last Updated: {format(new Date(), 'HH:mm:ss')}
                </div>
            </div>
        </div>
    );
}
