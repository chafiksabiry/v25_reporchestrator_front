import React, { useEffect, useState } from 'react';
import axios from 'axios';
import toast, { Toaster } from 'react-hot-toast';
import {
  Mail,
  User as UserIcon,
  Phone,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  Settings,
  ShieldCheck,
  ArrowRight,
  RotateCcw,
} from 'lucide-react';
import config from '../../../config';

interface ApiUserResponse {
  success?: boolean;
  data?: {
    _id?: string;
    email?: string;
    fullName?: string;
    phone?: string;
    typeUser?: string;
    isVerified?: boolean;
  };
  error?: string;
  message?: string;
}

type Section = 'profile' | 'email' | 'password' | 'phone';

const PROFILE_UPDATE_EVENT = 'PROFILE_UPDATED';

export function AccountSettings() {
  const [section, setSection] = useState<Section>('profile');

  const [loadingUser, setLoadingUser] = useState(true);
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');

  // PROFILE (fullName)
  const [editingFullName, setEditingFullName] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  // EMAIL CHANGE
  const [newEmail, setNewEmail] = useState('');
  const [emailRequestSent, setEmailRequestSent] = useState(false);
  const [emailCode, setEmailCode] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);

  // PASSWORD CHANGE
  const [pwdCurrent, setPwdCurrent] = useState('');
  const [pwdNew, setPwdNew] = useState('');
  const [pwdConfirm, setPwdConfirm] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [pwdRequestSent, setPwdRequestSent] = useState(false);
  const [pwdCode, setPwdCode] = useState('');
  const [pwdLoading, setPwdLoading] = useState(false);

  // PHONE CHANGE
  const [newPhone, setNewPhone] = useState('');
  const [phoneRequestSent, setPhoneRequestSent] = useState(false);
  const [phoneOtp, setPhoneOtp] = useState('');
  const [phoneLoading, setPhoneLoading] = useState(false);

  // Auth API base already includes the `/api` suffix (e.g. https://…/api).
  const baseUrl = (import.meta.env.VITE_AUTH_API_URL || '').replace(/\/+$/, '');
  const { userId, token } = config.getUserData();
  const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

  const loadUser = async () => {
    if (!userId) {
      setLoadingUser(false);
      toast.error('Identifiant utilisateur introuvable.');
      return;
    }
    setLoadingUser(true);
    try {
      const { data } = await axios.get<ApiUserResponse>(
        `${baseUrl}/users/${userId}`,
        { headers: authHeaders }
      );
      const u = data?.data;
      const resolvedEmail = u?.email || '';
      const resolvedName = u?.fullName || '';
      const resolvedPhone = u?.phone || '';
      setEmail(resolvedEmail);
      setFullName(resolvedName);
      setEditingFullName(resolvedName);
      setPhone(resolvedPhone);
    } catch (err) {
      console.error('Failed to load user details:', err);
      toast.error('Impossible de charger le profil utilisateur.');
    } finally {
      setLoadingUser(false);
    }
  };

  useEffect(() => {
    loadUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, baseUrl]);

  const extractError = (err: any, fallback: string) =>
    err?.response?.data?.error ||
    err?.response?.data?.message ||
    (err instanceof Error ? err.message : fallback);

  // ── Profile (fullName) ────────────────────────────────────────────────
  const handleSaveFullName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    const trimmed = editingFullName.trim();
    if (trimmed.length < 2) {
      toast.error('Le nom doit contenir au moins 2 caractères.');
      return;
    }
    setSavingProfile(true);
    try {
      const { data } = await axios.patch<ApiUserResponse>(
        `${baseUrl}/users/${userId}`,
        { fullName: trimmed },
        { headers: authHeaders }
      );
      const nextName = data?.data?.fullName || trimmed;
      setFullName(nextName);
      setEditingFullName(nextName);
      window.dispatchEvent(new Event(PROFILE_UPDATE_EVENT));
      toast.success('Nom mis à jour.');
    } catch (err) {
      toast.error(extractError(err, 'Échec de la mise à jour.'));
    } finally {
      setSavingProfile(false);
    }
  };

  // ── Email change ──────────────────────────────────────────────────────
  const handleRequestEmailCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    if (!newEmail.trim()) {
      toast.error('Saisissez un nouvel email.');
      return;
    }
    setEmailLoading(true);
    try {
      await axios.post(
        `${baseUrl}/users/${userId}/email/request-change`,
        { newEmail: newEmail.trim() },
        { headers: authHeaders }
      );
      setEmailRequestSent(true);
      toast.success(`Code envoyé à ${newEmail.trim()}.`);
    } catch (err) {
      toast.error(extractError(err, "Échec de l'envoi du code."));
    } finally {
      setEmailLoading(false);
    }
  };

  const handleConfirmEmailChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    if (emailCode.length < 4) {
      toast.error('Code invalide.');
      return;
    }
    setEmailLoading(true);
    try {
      const { data } = await axios.post<ApiUserResponse>(
        `${baseUrl}/users/${userId}/email/confirm-change`,
        { code: emailCode.trim() },
        { headers: authHeaders }
      );
      const next = data?.data?.email || newEmail.trim();
      setEmail(next);
      setNewEmail('');
      setEmailCode('');
      setEmailRequestSent(false);
      toast.success('Email modifié.');
    } catch (err) {
      toast.error(extractError(err, 'Échec de la confirmation.'));
    } finally {
      setEmailLoading(false);
    }
  };

  // ── Password change ───────────────────────────────────────────────────
  const handleRequestPasswordCode = async () => {
    if (!userId) return;
    setPwdLoading(true);
    try {
      await axios.post(
        `${baseUrl}/users/${userId}/password/request-change`,
        {},
        { headers: authHeaders }
      );
      setPwdRequestSent(true);
      toast.success(`Code envoyé à ${email}.`);
    } catch (err) {
      toast.error(extractError(err, "Échec de l'envoi du code."));
    } finally {
      setPwdLoading(false);
    }
  };

  const handleConfirmPasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    if (pwdNew.length < 8) {
      toast.error('Le nouveau mot de passe doit contenir au moins 8 caractères.');
      return;
    }
    if (pwdNew !== pwdConfirm) {
      toast.error('Les deux mots de passe ne correspondent pas.');
      return;
    }
    if (pwdCode.length < 4) {
      toast.error('Code invalide.');
      return;
    }
    setPwdLoading(true);
    try {
      await axios.post(
        `${baseUrl}/users/${userId}/password/confirm-change`,
        {
          currentPassword: pwdCurrent,
          newPassword: pwdNew,
          code: pwdCode.trim(),
        },
        { headers: authHeaders }
      );
      setPwdCurrent('');
      setPwdNew('');
      setPwdConfirm('');
      setPwdCode('');
      setPwdRequestSent(false);
      toast.success('Mot de passe modifié.');
    } catch (err) {
      toast.error(extractError(err, 'Échec du changement de mot de passe.'));
    } finally {
      setPwdLoading(false);
    }
  };

  // ── Phone change ──────────────────────────────────────────────────────
  const handleRequestPhoneOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    if (!newPhone.trim()) {
      toast.error('Saisissez un nouveau numéro de téléphone.');
      return;
    }
    setPhoneLoading(true);
    try {
      await axios.post(
        `${baseUrl}/users/${userId}/phone/request-change`,
        { newPhone: newPhone.trim() },
        { headers: authHeaders }
      );
      setPhoneRequestSent(true);
      toast.success(`OTP envoyé à ${newPhone.trim()}.`);
    } catch (err) {
      toast.error(extractError(err, "Échec de l'envoi de l'OTP."));
    } finally {
      setPhoneLoading(false);
    }
  };

  const handleConfirmPhoneChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    if (phoneOtp.length < 4) {
      toast.error('OTP invalide.');
      return;
    }
    setPhoneLoading(true);
    try {
      const { data } = await axios.post<ApiUserResponse>(
        `${baseUrl}/users/${userId}/phone/confirm-change`,
        { otp: phoneOtp.trim() },
        { headers: authHeaders }
      );
      const next = data?.data?.phone || newPhone.trim();
      setPhone(next);
      setNewPhone('');
      setPhoneOtp('');
      setPhoneRequestSent(false);
      toast.success('Téléphone modifié.');
    } catch (err) {
      toast.error(extractError(err, 'Échec de la confirmation.'));
    } finally {
      setPhoneLoading(false);
    }
  };

  const sections: { id: Section; label: string; icon: React.ElementType }[] = [
    { id: 'profile', label: 'Profil', icon: UserIcon },
    { id: 'email', label: 'Email', icon: Mail },
    { id: 'password', label: 'Mot de passe', icon: Lock },
    { id: 'phone', label: 'Téléphone', icon: Phone },
  ];

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 animate-in fade-in duration-300">
      <Toaster position="top-right" />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1 text-harx-500">
            <Settings className="h-4 w-4" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Paramètres</span>
          </div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight leading-tight">
            Paramètres du compte
          </h1>
          <p className="text-xs text-gray-500 mt-0.5 font-medium">
            Tout changement sensible est confirmé par email ou OTP SMS.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-md overflow-hidden">
        {/* Tabs */}
        <div className="px-4 sm:px-6 pt-4 sm:pt-6">
          <div className="flex flex-wrap gap-1 rounded-xl bg-gray-50 p-1 border border-gray-100">
            {sections.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setSection(id)}
                className={`flex-1 min-w-[110px] px-3 py-2 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                  section === id
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-gray-500 hover:text-slate-700'
                }`}
              >
                <Icon size={14} />
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-4 sm:p-6">
          {loadingUser && (
            <div className="flex items-center gap-2 text-[11px] text-gray-500 font-bold mb-4">
              <Loader2 className="h-4 w-4 animate-spin" />
              Chargement du profil…
            </div>
          )}

          {/* PROFILE */}
          {section === 'profile' && (
            <form onSubmit={handleSaveFullName} className="space-y-5 max-w-xl">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
                  Nom complet
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <UserIcon size={16} />
                  </div>
                  <input
                    type="text"
                    value={editingFullName}
                    onChange={(e) => setEditingFullName(e.target.value)}
                    required
                    minLength={2}
                    maxLength={120}
                    className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 focus:border-harx-500 rounded-xl font-bold text-sm focus:outline-none transition-all"
                  />
                </div>
                <p className="text-[10px] text-gray-400 mt-1">
                  Le nom est modifié immédiatement (pas de confirmation requise).
                </p>
              </div>

              <button
                type="submit"
                disabled={savingProfile || loadingUser || editingFullName.trim() === fullName.trim()}
                className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-harx-500 to-rose-500 hover:from-harx-600 hover:to-rose-600 text-white rounded-xl font-black text-xs uppercase tracking-wider transition-all duration-300 shadow-md active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {savingProfile && <Loader2 className="h-4 w-4 animate-spin" />}
                {savingProfile ? 'Enregistrement…' : 'Enregistrer le nom'}
              </button>
            </form>
          )}

          {/* EMAIL */}
          {section === 'email' && (
            <div className="space-y-5 max-w-xl">
              <div className="p-3 bg-blue-50/60 border border-blue-100 rounded-xl flex gap-2.5 text-[10px] text-blue-800/80 font-bold leading-relaxed">
                <ShieldCheck size={16} className="shrink-0 text-blue-600" />
                <span>
                  Un code de vérification sera envoyé à votre <strong>nouvel</strong> email. Il
                  expire dans 15 minutes.
                </span>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
                  Email actuel
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <Mail size={16} />
                  </div>
                  <input
                    type="email"
                    value={email}
                    readOnly
                    disabled
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl font-bold text-sm text-gray-700 cursor-not-allowed"
                  />
                </div>
              </div>

              {!emailRequestSent && (
                <form onSubmit={handleRequestEmailCode} className="space-y-4">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
                      Nouvel email
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                        <Mail size={16} />
                      </div>
                      <input
                        type="email"
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        required
                        className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 focus:border-harx-500 rounded-xl font-bold text-sm focus:outline-none transition-all"
                        placeholder="vous@exemple.com"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={emailLoading || !newEmail.trim()}
                    className="w-full sm:w-auto px-6 py-3 bg-slate-900 hover:bg-black text-white rounded-xl font-black text-xs uppercase tracking-wider transition-all duration-300 shadow-md active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {emailLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                    {emailLoading ? 'Envoi…' : (
                      <>
                        Envoyer le code <ArrowRight size={14} />
                      </>
                    )}
                  </button>
                </form>
              )}

              {emailRequestSent && (
                <form onSubmit={handleConfirmEmailChange} className="space-y-4">
                  <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-[11px] text-emerald-800 font-bold">
                    Code envoyé à <span className="underline">{newEmail}</span>. Vérifiez votre
                    boîte de réception.
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
                      Code de vérification (6 chiffres)
                    </label>
                    <input
                      type="text"
                      value={emailCode}
                      onChange={(e) => setEmailCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      inputMode="numeric"
                      maxLength={6}
                      className="w-full px-4 py-3 bg-white border border-gray-200 focus:border-harx-500 rounded-xl font-black text-xl text-center tracking-[0.5em] focus:outline-none transition-all"
                      placeholder="••••••"
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2">
                    <button
                      type="submit"
                      disabled={emailLoading || emailCode.length < 6}
                      className="flex-1 px-6 py-3 bg-gradient-to-r from-harx-500 to-rose-500 hover:from-harx-600 hover:to-rose-600 text-white rounded-xl font-black text-xs uppercase tracking-wider transition-all duration-300 shadow-md active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {emailLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                      {emailLoading ? 'Confirmation…' : 'Confirmer le changement'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEmailRequestSent(false);
                        setEmailCode('');
                      }}
                      disabled={emailLoading}
                      className="px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                    >
                      <RotateCcw size={14} /> Recommencer
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* PASSWORD */}
          {section === 'password' && (
            <div className="space-y-5 max-w-xl">
              <div className="p-3 bg-blue-50/60 border border-blue-100 rounded-xl flex gap-2.5 text-[10px] text-blue-800/80 font-bold leading-relaxed">
                <ShieldCheck size={16} className="shrink-0 text-blue-600" />
                <span>
                  Un code de vérification sera envoyé à votre email actuel (<strong>{email}</strong>).
                  Il expire dans 15 minutes.
                </span>
              </div>

              {!pwdRequestSent && (
                <button
                  type="button"
                  onClick={handleRequestPasswordCode}
                  disabled={pwdLoading || !email}
                  className="w-full sm:w-auto px-6 py-3 bg-slate-900 hover:bg-black text-white rounded-xl font-black text-xs uppercase tracking-wider transition-all duration-300 shadow-md active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {pwdLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                  {pwdLoading ? 'Envoi…' : (
                    <>
                      Envoyer le code par email <ArrowRight size={14} />
                    </>
                  )}
                </button>
              )}

              {pwdRequestSent && (
                <form onSubmit={handleConfirmPasswordChange} className="space-y-4">
                  <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-[11px] text-emerald-800 font-bold">
                    Code envoyé à <span className="underline">{email}</span>.
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
                      Mot de passe actuel
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                        <Lock size={16} />
                      </div>
                      <input
                        type={showCurrent ? 'text' : 'password'}
                        value={pwdCurrent}
                        onChange={(e) => setPwdCurrent(e.target.value)}
                        className="w-full pl-10 pr-10 py-3 bg-white border border-gray-200 focus:border-harx-500 rounded-xl font-bold text-sm focus:outline-none transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrent((v) => !v)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                      >
                        {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
                      Nouveau mot de passe
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                        <Lock size={16} />
                      </div>
                      <input
                        type={showNew ? 'text' : 'password'}
                        value={pwdNew}
                        onChange={(e) => setPwdNew(e.target.value)}
                        required
                        minLength={8}
                        maxLength={128}
                        className="w-full pl-10 pr-10 py-3 bg-white border border-gray-200 focus:border-harx-500 rounded-xl font-bold text-sm focus:outline-none transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNew((v) => !v)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                      >
                        {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1">Au moins 8 caractères.</p>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
                      Confirmer le nouveau mot de passe
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                        <Lock size={16} />
                      </div>
                      <input
                        type={showNew ? 'text' : 'password'}
                        value={pwdConfirm}
                        onChange={(e) => setPwdConfirm(e.target.value)}
                        required
                        minLength={8}
                        maxLength={128}
                        className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 focus:border-harx-500 rounded-xl font-bold text-sm focus:outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
                      Code reçu par email (6 chiffres)
                    </label>
                    <input
                      type="text"
                      value={pwdCode}
                      onChange={(e) => setPwdCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      inputMode="numeric"
                      maxLength={6}
                      className="w-full px-4 py-3 bg-white border border-gray-200 focus:border-harx-500 rounded-xl font-black text-xl text-center tracking-[0.5em] focus:outline-none transition-all"
                      placeholder="••••••"
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2">
                    <button
                      type="submit"
                      disabled={pwdLoading || pwdCode.length < 6}
                      className="flex-1 px-6 py-3 bg-gradient-to-r from-harx-500 to-rose-500 hover:from-harx-600 hover:to-rose-600 text-white rounded-xl font-black text-xs uppercase tracking-wider transition-all duration-300 shadow-md active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {pwdLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                      {pwdLoading ? 'Confirmation…' : 'Confirmer le mot de passe'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPwdRequestSent(false);
                        setPwdCode('');
                        setPwdCurrent('');
                        setPwdNew('');
                        setPwdConfirm('');
                      }}
                      disabled={pwdLoading}
                      className="px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                    >
                      <RotateCcw size={14} /> Recommencer
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* PHONE */}
          {section === 'phone' && (
            <div className="space-y-5 max-w-xl">
              <div className="p-3 bg-blue-50/60 border border-blue-100 rounded-xl flex gap-2.5 text-[10px] text-blue-800/80 font-bold leading-relaxed">
                <ShieldCheck size={16} className="shrink-0 text-blue-600" />
                <span>
                  Un OTP sera envoyé par SMS au <strong>nouveau</strong> numéro. Il expire dans
                  5 minutes.
                </span>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
                  Téléphone actuel
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <Phone size={16} />
                  </div>
                  <input
                    type="tel"
                    value={phone || '—'}
                    readOnly
                    disabled
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl font-bold text-sm text-gray-700 cursor-not-allowed"
                  />
                </div>
              </div>

              {!phoneRequestSent && (
                <form onSubmit={handleRequestPhoneOtp} className="space-y-4">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
                      Nouveau téléphone
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                        <Phone size={16} />
                      </div>
                      <input
                        type="tel"
                        value={newPhone}
                        onChange={(e) => setNewPhone(e.target.value)}
                        required
                        maxLength={32}
                        placeholder="+33…"
                        className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 focus:border-harx-500 rounded-xl font-bold text-sm focus:outline-none transition-all"
                      />
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1">
                      Format international, ex. <code>+33612345678</code>.
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={phoneLoading || !newPhone.trim()}
                    className="w-full sm:w-auto px-6 py-3 bg-slate-900 hover:bg-black text-white rounded-xl font-black text-xs uppercase tracking-wider transition-all duration-300 shadow-md active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {phoneLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                    {phoneLoading ? 'Envoi…' : (
                      <>
                        Envoyer l'OTP par SMS <ArrowRight size={14} />
                      </>
                    )}
                  </button>
                </form>
              )}

              {phoneRequestSent && (
                <form onSubmit={handleConfirmPhoneChange} className="space-y-4">
                  <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-[11px] text-emerald-800 font-bold">
                    OTP envoyé à <span className="underline">{newPhone}</span>.
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
                      OTP reçu (6 chiffres)
                    </label>
                    <input
                      type="text"
                      value={phoneOtp}
                      onChange={(e) => setPhoneOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      inputMode="numeric"
                      maxLength={6}
                      className="w-full px-4 py-3 bg-white border border-gray-200 focus:border-harx-500 rounded-xl font-black text-xl text-center tracking-[0.5em] focus:outline-none transition-all"
                      placeholder="••••••"
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2">
                    <button
                      type="submit"
                      disabled={phoneLoading || phoneOtp.length < 6}
                      className="flex-1 px-6 py-3 bg-gradient-to-r from-harx-500 to-rose-500 hover:from-harx-600 hover:to-rose-600 text-white rounded-xl font-black text-xs uppercase tracking-wider transition-all duration-300 shadow-md active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {phoneLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                      {phoneLoading ? 'Confirmation…' : 'Confirmer le téléphone'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPhoneRequestSent(false);
                        setPhoneOtp('');
                      }}
                      disabled={phoneLoading}
                      className="px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                    >
                      <RotateCcw size={14} /> Recommencer
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default AccountSettings;
