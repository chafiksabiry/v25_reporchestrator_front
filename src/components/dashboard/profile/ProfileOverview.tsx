import React from 'react';
import { AlertTriangle, Briefcase, Camera, Clock, Globe, Mail, MapPin, Phone, RefreshCw, Target, User, Zap } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { hasPresentationVideo } from '../../../utils/introVideo';
import { ProfileProgressCard } from './ProfileProgressCard';
import { SafeAvatar } from '../../common/SafeAvatar';

interface Props {
  profile: any;
  countryName: string;
  warningTabs: string[];
  isUploadingPhoto: boolean;
  onChangePhoto: () => void;
  onViewPhoto: () => void;
  onOpenTab: (tab: string) => void;
  onNavigate: (path: string) => void;
}

const experiencesOf = (profile: any): any[] =>
  Array.isArray(profile?.experience) ? profile.experience : Array.isArray(profile?.experiences) ? profile.experiences : [];

/**
 * Vue d'ensemble « un seul écran » de l'étape Profil : identité, rubriques cliquables
 * (le détail s'ouvre dans la vue complète) et avancement + prochaine étape. Pas de défilement
 * vertical dans le cadre de l'onboarding.
 */
export const ProfileOverview: React.FC<Props> = ({
  profile,
  countryName,
  warningTabs,
  isUploadingPhoto,
  onChangePhoto,
  onViewPhoto,
  onOpenTab,
  onNavigate,
}) => {
  const { t } = useTranslation('repsx');
  const { t: tg } = useTranslation();

  const info = profile?.personalInfo || {};
  const skillCount = ['technical', 'professional', 'soft'].reduce((n, k) => n + (profile?.skills?.[k]?.length || 0), 0);
  const specCount = (profile?.professionalSummary?.industries?.length || 0) + (profile?.professionalSummary?.activities?.length || 0);
  const days = Array.isArray(profile?.availability?.schedule) ? profile.availability.schedule.length : 0;

  const tiles: { id: string; label: string; value: React.ReactNode; icon: any; tone: string }[] = [
    { id: 'profile', tone: 'bg-pink-100 text-[#F90080]', label: t('profile.overview.presentation'), value: hasPresentationVideo(profile) ? '✓' : '—', icon: User },
    { id: 'experience', tone: 'bg-sky-100 text-sky-700', label: tg('profile.nav.experience'), value: experiencesOf(profile).length, icon: Briefcase },
    { id: 'languages', tone: 'bg-violet-100 text-violet-700', label: tg('profile.nav.languages'), value: (info.languages || []).length, icon: Globe },
    { id: 'skills', tone: 'bg-amber-100 text-amber-700', label: tg('profile.nav.skills'), value: skillCount, icon: Zap },
    { id: 'specialization', tone: 'bg-emerald-100 text-emerald-700', label: tg('profile.nav.specialization'), value: specCount, icon: Target },
    { id: 'availability', tone: 'bg-cyan-100 text-cyan-700', label: tg('profile.nav.availability'), value: days, icon: Clock },
  ];

  return (
    <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
      {/* Colonne gauche : identité + rubriques */}
      <div className="space-y-3">
        <section className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-md shadow-slate-200/60">
          <div className="relative h-9 bg-gradient-harx" aria-hidden="true">
            <div className="absolute -right-6 -top-10 h-28 w-28 rounded-full bg-white/15" />
            <div className="absolute left-1/3 -top-6 h-16 w-16 rounded-full bg-white/10" />
            <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-amber-300 via-white/70 to-cyan-300 opacity-80" />
          </div>
          <div className="flex items-center gap-4 p-4">
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={onViewPhoto}
                disabled={!info.photo?.url}
                className="block h-24 w-24 overflow-hidden rounded-3xl border-4 border-white bg-slate-100 shadow-lg ring-2 ring-[#F90080]/30 focus:outline-none focus-visible:ring-4 focus-visible:ring-[#F90080]/30"
                aria-label={tg('profile.header.viewPhoto')}
              >
                <SafeAvatar
                  url={info.photo?.url}
                  name={info.name}
                  alt={tg('profile.header.profilePhotoAlt')}
                  imgClassName="h-full w-full object-cover"
                  fallbackClassName="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#0C1C2E] to-[#14304d] text-3xl font-black uppercase text-white"
                />
              </button>
              <button
                type="button"
                onClick={onChangePhoto}
                disabled={isUploadingPhoto}
                title={tg('profile.header.changePhoto')}
                aria-label={tg('profile.header.changePhoto')}
                className="absolute -right-2 -top-2 rounded-xl bg-gradient-harx p-2 text-white shadow-lg hover:opacity-90 disabled:opacity-60"
              >
                {isUploadingPhoto ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
              </button>
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-xl font-black tracking-tight text-[#0C1C2E]">{info.name}</h2>
              <p className="truncate text-xs font-black uppercase tracking-widest text-[#F90080]">
                {profile?.professionalSummary?.currentRole || tg('profile.header.defaultRole')}
              </p>
              <ul className="mt-2 space-y-1 text-xs font-bold text-slate-600">
                <li className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 shrink-0 text-[#F90080]" aria-hidden="true" /><span className="truncate">{countryName}</span></li>
                <li className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5 shrink-0 text-sky-600" aria-hidden="true" /><span className="truncate" title={info.email}>{info.email || 'N/A'}</span></li>
                {info.phone && (
                  <li className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5 shrink-0 text-emerald-600" aria-hidden="true" /><span className="truncate">{info.phone}</span></li>
                )}
              </ul>
            </div>
          </div>
        </section>

        <section aria-label={t('profile.overview.sectionsTitle')} className="rounded-3xl border border-slate-100 bg-white p-4 shadow-md shadow-slate-200/60">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3">
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">{t('profile.overview.sectionsTitle')}</p>
            <p className="text-[11px] font-medium text-slate-500">{t('profile.overview.sectionsHint')}</p>
          </div>
          <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {tiles.map((tile) => {
              const warn = warningTabs.includes(tile.id);
              return (
                <li key={tile.id}>
                  <button
                    type="button"
                    onClick={() => onOpenTab(tile.id)}
                    className="relative flex w-full items-center gap-2 rounded-2xl border border-slate-100 bg-slate-50 px-2.5 py-2.5 text-left transition hover:border-[#F90080]/40 hover:bg-pink-50/50 focus:outline-none focus-visible:ring-4 focus-visible:ring-[#F90080]/25"
                  >
                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl shadow-sm ${tile.tone}`}>
                      <tile.icon className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-base font-black leading-none text-[#0C1C2E]">{tile.value}</span>
                      <span className="block text-[11px] font-bold leading-tight text-slate-600">{tile.label}</span>
                    </span>
                    {warn && (
                      <span className="absolute right-2 top-2 text-amber-500" title={t('profile.overview.warn')}>
                        <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                        <span className="sr-only">{t('profile.overview.warn')}</span>
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      </div>

      {/* Colonne droite : avancement + prochaine étape */}
      <ProfileProgressCard profile={profile} onNavigate={onNavigate} compact />
    </div>
  );
};

export default ProfileOverview;
