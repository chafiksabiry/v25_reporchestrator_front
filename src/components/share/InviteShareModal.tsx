import { useMemo, useRef, useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { useTranslation } from 'react-i18next';
import { Briefcase, Check, Copy, Download, Mail, MessageCircle, Share2, UserPlus, X } from 'lucide-react';
import { buildInviteLink, type InviteAudience } from '../../utils/inviteLink';

type Props = {
  open: boolean;
  onClose: () => void;
  /** Identifiant du parrain, joint au lien (suivi des invitations). */
  referrerId?: string | null;
};

/**
 * Invitation à rejoindre HARX : lien à partager (copier, partage du téléphone, WhatsApp, e-mail, LinkedIn) et QR code,
 * au choix pour un REP ou pour une entreprise.
 */
export function InviteShareModal({ open, onClose, referrerId }: Props) {
  const { t, i18n } = useTranslation();
  const [audience, setAudience] = useState<InviteAudience>('rep');
  const [copied, setCopied] = useState(false);
  const qrWrap = useRef<HTMLDivElement>(null);

  const link = useMemo(
    () => buildInviteLink({ origin: typeof window === 'undefined' ? 'https://harx.ai' : window.location.origin, language: i18n.language, audience, ref: referrerId }),
    [i18n.language, audience, referrerId]
  );
  if (!open) return null;

  const message = audience === 'rep' ? t('share.messageRep') : t('share.messageCompany');
  const fullText = `${message} ${link}`;
  const canNativeShare = typeof navigator !== 'undefined' && typeof (navigator as any).share === 'function';

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
    } catch {
      // Contexte sans accès au presse-papiers : sélection manuelle du champ.
      const input = document.getElementById('invite-link-input') as HTMLInputElement | null;
      input?.select();
      try { document.execCommand('copy'); } catch { /* ignore */ }
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  const nativeShare = async () => {
    try {
      await (navigator as any).share({ title: 'HARX', text: message, url: link });
    } catch {
      /* annulé par l'utilisateur */
    }
  };

  const downloadQr = () => {
    const canvas = qrWrap.current?.querySelector('canvas');
    if (!canvas) return;
    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = `harx-invitation-${audience}.png`;
    a.click();
  };

  const tab = (id: InviteAudience, icon: JSX.Element, title: string, desc: string) => (
    <button
      type="button"
      role="tab"
      aria-selected={audience === id}
      onClick={() => setAudience(id)}
      data-testid={`invite-${id}`}
      className={`flex flex-1 items-start gap-3 rounded-2xl border-2 p-3 text-left transition ${audience === id ? 'border-harx-500 bg-harx-50 shadow-sm' : 'border-gray-100 bg-white hover:border-harx-200'}`}
    >
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${audience === id ? 'bg-gradient-to-br from-harx-500 to-harx-alt-500 text-white' : 'bg-gray-100 text-gray-500'}`}>{icon}</span>
      <span className="min-w-0">
        <span className="block text-sm font-extrabold text-gray-900">{title}</span>
        <span className="mt-0.5 block text-xs font-medium leading-snug text-gray-500">{desc}</span>
      </span>
    </button>
  );

  const chip = 'inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-700 shadow-sm transition hover:border-harx-300 hover:bg-harx-50';

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={t('share.title')} className="relative max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="h-1.5 bg-gradient-to-r from-harx-500 via-harx-alt-500 to-harx-600" />
        <button type="button" onClick={onClose} aria-label={t('share.close')} className="absolute right-4 top-5 flex h-9 w-9 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600">
          <X className="h-5 w-5" />
        </button>
        <div className="space-y-5 p-6 sm:p-7">
          <div>
            <h2 className="text-xl font-extrabold text-gray-900">{t('share.title')}</h2>
            <p className="mt-1 text-sm text-gray-500">{t('share.subtitle')}</p>
          </div>

          <div role="tablist" aria-label={t('share.audience')} className="flex flex-col gap-3 sm:flex-row">
            {tab('rep', <UserPlus className="h-4.5 w-4.5" />, t('share.audienceRep'), t('share.audienceRepDesc'))}
            {tab('company', <Briefcase className="h-4.5 w-4.5" />, t('share.audienceCompany'), t('share.audienceCompanyDesc'))}
          </div>

          <div className="grid gap-5 sm:grid-cols-[1fr_auto] sm:items-start">
            <div className="space-y-3">
              <label htmlFor="invite-link-input" className="text-[11px] font-bold uppercase tracking-widest text-gray-500">{t('share.linkLabel')}</label>
              <div className="flex gap-2">
                <input id="invite-link-input" readOnly value={link} onFocus={(e) => e.currentTarget.select()} className="min-w-0 flex-1 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-xs font-medium text-gray-700" />
                <button type="button" onClick={() => void copy()} data-testid="invite-copy" className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-gradient-to-r from-harx-600 to-harx-alt-600 px-4 py-2.5 text-xs font-extrabold text-white shadow-md hover:opacity-95">
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied ? t('share.copied') : t('share.copy')}
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {canNativeShare ? <button type="button" onClick={() => void nativeShare()} className={chip}><Share2 className="h-4 w-4 text-harx-600" /> {t('share.share')}</button> : null}
                <a className={chip} href={`https://wa.me/?text=${encodeURIComponent(fullText)}`} target="_blank" rel="noopener noreferrer"><MessageCircle className="h-4 w-4 text-emerald-600" /> WhatsApp</a>
                <a className={chip} href={`mailto:?subject=${encodeURIComponent(t('share.mailSubject'))}&body=${encodeURIComponent(fullText)}`}><Mail className="h-4 w-4 text-sky-600" /> {t('share.email')}</a>
                <a className={chip} href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(link)}`} target="_blank" rel="noopener noreferrer">
                  <span className="flex h-4 w-4 items-center justify-center rounded-sm bg-[#0A66C2] text-[9px] font-black text-white">in</span> LinkedIn
                </a>
              </div>
              <p className="rounded-xl bg-gray-50 px-3 py-2 text-xs leading-relaxed text-gray-500">{message}</p>
            </div>

            <div className="flex flex-col items-center gap-2 sm:w-[196px]">
              <div ref={qrWrap} className="rounded-2xl border border-gray-100 bg-white p-3 shadow-sm" data-testid="invite-qr">
                <QRCodeCanvas value={link} size={168} level="M" marginSize={1} />
              </div>
              <p className="text-center text-[11px] font-medium text-gray-500">{t('share.qrHint')}</p>
              <button type="button" onClick={downloadQr} className={chip}><Download className="h-4 w-4" /> {t('share.downloadQr')}</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default InviteShareModal;
