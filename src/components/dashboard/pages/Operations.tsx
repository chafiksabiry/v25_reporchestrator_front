import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Wallet as WalletIcon,
  Phone,
  Briefcase,
  CalendarDays,
  CalendarCheck,
  GraduationCap,
  PhoneCall,
  CheckCircle2,
} from 'lucide-react';
import { CallRecords } from '../CallRecords';
import api, { callsApi } from '../../../utils/client';
import { slotApi, type Reservation } from '../../../services/api/slotApi';
import { getAgentId } from '../../../utils/authUtils';

export function Operations() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const agentId = getAgentId();

  const [availableBalance, setAvailableBalance] = useState(0);
  const [calls, setCalls] = useState<any[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!agentId) {
      setLoading(false);
      return;
    }

    const load = async () => {
      try {
        const [walletRes, callsRes, reservationsRes] = await Promise.all([
          api.get(`/escrow/agent/wallet/${agentId}`).catch(() => null),
          callsApi.getByAgentId(agentId).catch(() => null),
          slotApi.getReservations(agentId).catch(() => []),
        ]);

        if (walletRes?.data?.success) {
          setAvailableBalance(walletRes.data.data.availableBalance || 0);
        }
        if (callsRes?.success && Array.isArray(callsRes.data)) {
          setCalls(callsRes.data);
        }
        setReservations(Array.isArray(reservationsRes) ? reservationsRes : []);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [agentId]);

  const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const callsThisWeek = calls.filter((c) => {
    const created = c.createdAt ? new Date(c.createdAt).getTime() : NaN;
    return !Number.isNaN(created) && created >= oneWeekAgo;
  }).length;

  const successfulCalls = calls.filter((c) => {
    const status = String(c.status || '').toLowerCase();
    return status === 'completed' || c.validByAI === true || c.valid === true;
  }).length;

  const activeGigIds = new Set(
    calls.map((c) => {
      const gig = c.lead?.gigId;
      if (!gig) return null;
      return typeof gig === 'object' ? gig._id || gig.$oid : gig;
    }).filter(Boolean)
  );

  const now = new Date();
  const nextReservation = reservations
    .filter((r) => r.status === 'reserved' && new Date(r.date) >= new Date(now.toDateString()))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];

  const formatBalance = (value: number) =>
    new Intl.NumberFormat(i18n.language, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);

  const formatNextSessionDate = (r: Reservation) =>
    new Intl.DateTimeFormat(i18n.language, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(
      new Date(r.date)
    );

  const metrics = [
    {
      title: t('operations.availableBalance'),
      value: loading ? '…' : `${formatBalance(availableBalance)} €`,
      icon: WalletIcon,
      color: 'green',
      onClick: () => navigate('/wallet'),
    },
    {
      title: t('operations.callsThisWeek'),
      value: loading ? '…' : String(callsThisWeek),
      icon: Phone,
      color: 'blue',
      onClick: () => navigate('/workspace?tab=calls'),
    },
    {
      title: t('operations.activeGigs'),
      value: loading ? '…' : String(activeGigIds.size),
      icon: Briefcase,
      color: 'purple',
      onClick: () => navigate('/marketplace'),
    },
    {
      title: t('operations.nextSession'),
      value: loading ? '…' : nextReservation ? formatNextSessionDate(nextReservation) : t('operations.noneScheduled'),
      icon: CalendarDays,
      color: 'yellow',
      onClick: () => navigate('/session-planning'),
    },
  ];

  const quickActions = [
    {
      title: t('operations.planSession'),
      description: t('operations.planSessionDesc'),
      icon: CalendarCheck,
      action: () => navigate('/session-planning'),
    },
    {
      title: t('operations.goToCockpit'),
      description: t('operations.goToCockpitDesc'),
      icon: PhoneCall,
      action: () => navigate('/workspace?tab=copilot'),
    },
    {
      title: t('operations.viewWallet'),
      description: t('operations.viewWalletDesc'),
      icon: WalletIcon,
      action: () => navigate('/wallet'),
    },
    {
      title: t('operations.resumeTraining'),
      description: t('operations.resumeTrainingDesc'),
      icon: GraduationCap,
      action: () => navigate('/training'),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{t('operations.title')}</h1>
          <p className="text-sm text-gray-500 mt-1">{t('operations.subtitle')}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map((metric, index) => (
          <button
            key={index}
            onClick={metric.onClick}
            className="bg-white rounded-xl p-6 shadow-sm text-left hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div className={`p-2 bg-${metric.color}-50 rounded-lg`}>
                <metric.icon className={`w-6 h-6 text-${metric.color}-600`} />
              </div>
            </div>
            <p className="mt-4 text-2xl font-semibold text-gray-900">{metric.value}</p>
            <p className="text-sm text-gray-500">{metric.title}</p>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">{t('operations.quickActions')}</h2>
          </div>
          <div className="space-y-4">
            {quickActions.map((action, index) => (
              <div key={index} className="flex items-center justify-between p-4 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors">
                <div className="flex items-center space-x-4">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <action.icon className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">{action.title}</h3>
                    <p className="text-sm text-gray-500">{action.description}</p>
                  </div>
                </div>
                <button
                  onClick={action.action}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
                >
                  {t('operations.go')}
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">{t('operations.activitySummary')}</h2>
          </div>
          <div className="space-y-4">
            {[
              { label: t('operations.totalCalls'), value: loading ? '…' : String(calls.length), icon: Phone },
              { label: t('operations.successfulCalls'), value: loading ? '…' : String(successfulCalls), icon: CheckCircle2 },
              { label: t('operations.upcomingSessions'), value: loading ? '…' : String(reservations.filter((r) => r.status === 'reserved' && new Date(r.date) >= new Date(now.toDateString())).length), icon: CalendarDays },
            ].map((stat, index) => (
              <div key={index} className="flex items-center justify-between p-3 border-b border-gray-100">
                <div className="flex items-center space-x-3">
                  <stat.icon className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-600">{stat.label}</span>
                </div>
                <span className="font-medium text-gray-900">{stat.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <CallRecords />
    </div>
  );
}
