import React, { useEffect, useMemo, useState } from 'react';
import { Award, Download, Share2, CheckCircle, Star, Calendar, Trophy, X, Sparkles } from 'lucide-react';

interface CertificationViewProps {
  traineeName: string;
  trainingTitle: string;
  completionDate: string;
  onClose: () => void;
  visualTheme?: {
    primaryColor?: string;
    secondaryColor?: string;
    accentColor?: string;
  };
}

// Petit utilitaire : génère un ID de certificat stable à partir du nom + de la date.
const buildCertId = (seed: string): string => {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return `CERT-${hash.toString(36).toUpperCase().padStart(7, '0').slice(0, 7)}`;
};

const CONFETTI_COLORS = ['#10b981', '#2dd4bf', '#22d3ee', '#34d399', '#06b6d4', '#a7f3d0'];

export const CertificationView: React.FC<CertificationViewProps> = ({
  traineeName,
  trainingTitle,
  completionDate,
  onClose,
}) => {
  const [showContent, setShowContent] = useState(false);
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);

  const certId = useMemo(() => buildCertId(`${traineeName}|${trainingTitle}|${completionDate}`), [traineeName, trainingTitle, completionDate]);

  // Confettis générés une seule fois.
  const confetti = useMemo(
    () =>
      Array.from({ length: 48 }).map((_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 3,
        duration: 3 + Math.random() * 3,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        size: 6 + Math.random() * 8,
        rounded: Math.random() > 0.5,
      })),
    []
  );

  useEffect(() => {
    const t = setTimeout(() => setShowContent(true), 300);
    return () => clearTimeout(t);
  }, []);

  // Fermeture au clavier (Échap).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const handleShare = async () => {
    const shareData = {
      title: 'Certification HARX Academy',
      text: `${traineeName} vient d'obtenir la certification « ${trainingTitle} » sur HARX Academy ! 🎓`,
      url: typeof window !== 'undefined' ? window.location.href : '',
    };
    try {
      if (typeof navigator !== 'undefined' && (navigator as any).share) {
        await (navigator as any).share(shareData);
        return;
      }
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(`${shareData.text} ${shareData.url}`);
        setShareFeedback('Lien copié !');
        setTimeout(() => setShareFeedback(null), 2500);
      }
    } catch {
      // l'utilisateur a annulé le partage — rien à faire
    }
  };

  const handleDownload = () => {
    const win = window.open('', '_blank', 'width=1100,height=800');
    if (!win) return;
    const safe = (s: string) => s.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    win.document.write(`<!DOCTYPE html>
<html lang="fr"><head><meta charset="utf-8"/>
<title>Certificat - ${safe(traineeName)}</title>
<style>
  @page { size: A4 landscape; margin: 0; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; background: #0b1025; }
  .cert { width: 297mm; height: 210mm; padding: 18mm; position: relative;
    background: radial-gradient(circle at 20% 15%, rgba(244,63,94,.18), transparent 45%),
                radial-gradient(circle at 85% 85%, rgba(99,102,241,.18), transparent 45%), #0b1025;
    color: #fff; display: flex; flex-direction: column; align-items: center; text-align: center; }
  .frame { position: absolute; inset: 9mm; border: 2px solid rgba(251,191,36,.5); border-radius: 14px; }
  .frame:before { content: ''; position: absolute; inset: 5px; border: 1px solid rgba(255,255,255,.12); border-radius: 10px; }
  .brand { letter-spacing: .5em; font-weight: 800; color: #fbbf24; font-size: 14px; margin-top: 6mm; }
  .seal { width: 90px; height: 90px; margin: 8mm auto 4mm; border-radius: 50%;
    background: linear-gradient(135deg, #fde68a, #f59e0b); display: flex; align-items: center; justify-content: center;
    font-size: 42px; box-shadow: 0 10px 30px rgba(245,158,11,.4); }
  .sub { text-transform: uppercase; letter-spacing: .35em; color: #94a3b8; font-size: 12px; }
  .name { font-size: 46px; font-weight: 900; margin: 6mm 0 2mm;
    background: linear-gradient(90deg,#fde68a,#f59e0b,#d97706); -webkit-background-clip: text; background-clip: text; color: transparent; }
  .desc { color: #cbd5e1; max-width: 180mm; line-height: 1.6; font-size: 15px; }
  .title { font-size: 22px; font-weight: 700; margin: 5mm 0; padding: 4mm 8mm; border: 1px solid rgba(255,255,255,.15);
    border-radius: 12px; display: inline-block; }
  .meta { display: flex; gap: 18mm; margin-top: 8mm; }
  .meta div span { display: block; }
  .meta .k { color: #64748b; text-transform: uppercase; letter-spacing: .2em; font-size: 10px; margin-bottom: 3px; }
  .meta .v { font-weight: 700; font-size: 14px; }
  .footer { position: absolute; bottom: 14mm; left: 0; right: 0; color: #64748b; font-size: 11px; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style></head>
<body>
  <div class="cert">
    <div class="frame"></div>
    <div class="brand">HARX ACADEMY</div>
    <div class="seal">🏆</div>
    <div class="sub">Certificat de réussite</div>
    <div class="name">${safe(traineeName)}</div>
    <div class="desc">a complété avec succès l'ensemble des modules et évaluations de la formation</div>
    <div class="title">${safe(trainingTitle)}</div>
    <div class="meta">
      <div><span class="k">Date</span><span class="v">${safe(completionDate)}</span></div>
      <div><span class="k">Statut</span><span class="v">Validé</span></div>
      <div><span class="k">Niveau</span><span class="v">Expert</span></div>
    </div>
    <div class="footer">Certifié par HARX Academy • ID : ${certId}</div>
  </div>
  <script>window.onload = function(){ setTimeout(function(){ window.print(); }, 300); };<\/script>
</body></html>`);
    win.document.close();
  };

  return (
    <div className="fixed inset-0 z-[100] bg-[#060a18]/95 backdrop-blur-md overflow-y-auto">
      {/* Confettis de célébration */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden z-[1]">
        {confetti.map((c) => (
          <span
            key={c.id}
            className="absolute top-[-20px] cert-confetti"
            style={{
              left: `${c.left}%`,
              width: `${c.size}px`,
              height: `${c.size}px`,
              background: c.color,
              borderRadius: c.rounded ? '50%' : '2px',
              animationDelay: `${c.delay}s`,
              animationDuration: `${c.duration}s`,
            }}
          />
        ))}
      </div>

      <style>{`
        @keyframes cert-fall {
          0% { transform: translateY(-10vh) rotate(0deg); opacity: 0; }
          10% { opacity: 1; }
          100% { transform: translateY(110vh) rotate(720deg); opacity: 0; }
        }
        .cert-confetti { animation-name: cert-fall; animation-timing-function: linear; animation-iteration-count: infinite; }
        @keyframes cert-shimmer { 0% { background-position: -200% center; } 100% { background-position: 200% center; } }
        .cert-shimmer { background-size: 200% auto; animation: cert-shimmer 4s linear infinite; }
        @keyframes cert-ring { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        .cert-ring { animation: cert-ring 18s linear infinite; }
      `}</style>

      <div className="relative z-[2] flex min-h-full items-center justify-center p-4 py-10">
      <div
        className={`relative max-w-3xl w-full bg-white/[0.04] border border-emerald-400/15 rounded-[40px] shadow-2xl overflow-hidden transition-all duration-1000 transform ${
          showContent ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-12 scale-95'
        }`}
      >
        {/* Animated Background Elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10">
          <div className="absolute -top-24 -left-24 w-96 h-96 bg-emerald-500/20 rounded-full blur-[120px] animate-pulse"></div>
          <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-cyan-500/20 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }}></div>
        </div>

        <div className="p-6 md:p-10 text-center relative">
          {/* Top action buttons */}
          <div className="absolute top-6 right-6 flex items-center gap-2">
            <button
              onClick={handleShare}
              title="Partager"
              className="p-2.5 rounded-full bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors"
            >
              <Share2 className="w-5 h-5" />
            </button>
            <button
              onClick={onClose}
              title="Fermer"
              className="p-2.5 rounded-full bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {shareFeedback && (
            <div className="absolute top-20 right-6 px-4 py-2 rounded-xl bg-emerald-500/90 text-white text-sm font-semibold shadow-lg animate-fade-in">
              {shareFeedback}
            </div>
          )}

          {/* Badge Image */}
          <div className="relative inline-block mb-5 group">
            <div className="absolute inset-0 bg-emerald-500 rounded-full blur-3xl opacity-25 group-hover:opacity-45 transition-opacity duration-700"></div>
            <div className="relative w-32 h-32 md:w-40 md:h-40 flex items-center justify-center">
              {/* Rotating dashed ring */}
              <div className="cert-ring absolute inset-0 rounded-full border-2 border-dashed border-emerald-400/40"></div>
              <div className="w-[88%] h-[88%] rounded-full bg-gradient-to-tr from-emerald-300 via-teal-400 to-cyan-500 p-1 shadow-2xl transform group-hover:scale-105 transition-transform duration-700">
                <div className="w-full h-full rounded-full bg-[#060a18] flex items-center justify-center">
                  <Trophy className="w-16 h-16 md:w-20 md:h-20 text-emerald-300 drop-shadow-[0_0_15px_rgba(16,185,129,0.55)]" />
                </div>
              </div>

              {/* Floating Stars */}
              <Star className="absolute top-2 right-2 w-5 h-5 text-teal-300 fill-teal-300 animate-bounce" style={{ animationDuration: '3s' }} />
              <Star className="absolute bottom-8 -left-2 w-4 h-4 text-cyan-300 fill-cyan-300 animate-bounce" style={{ animationDuration: '2.5s' }} />
              <Sparkles className="absolute top-1/2 -right-5 w-5 h-5 text-emerald-300 animate-pulse" />
            </div>
          </div>

          {/* Achievement Text */}
          <div className="space-y-3 mb-8">
            <h2 className="text-emerald-400 font-bold tracking-widest uppercase text-xs md:text-sm">Certification Obtenue</h2>
            <h1 className="text-3xl md:text-5xl font-black text-white leading-tight">
              Félicitations,{' '}
              <span className="cert-shimmer text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 via-teal-300 to-cyan-400">
                {traineeName}
              </span>
            </h1>
            <p className="text-slate-400 text-base md:text-lg max-w-2xl mx-auto leading-relaxed">
              Vous avez complété avec succès tous les modules et évaluations de la formation :
            </p>
            <div className="inline-block px-6 py-3 rounded-2xl bg-emerald-500/10 border border-emerald-400/20 text-lg md:text-xl font-bold text-white shadow-xl backdrop-blur-sm">
              {trainingTitle}
            </div>
          </div>

          {/* Certificate Details */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 max-w-3xl mx-auto">
            <div className="p-5 rounded-2xl bg-white/5 border border-emerald-400/10 flex flex-col items-center gap-1.5 hover:bg-emerald-500/[0.07] hover:border-emerald-400/25 transition-colors">
              <Calendar className="w-6 h-6 text-teal-300" />
              <span className="text-slate-500 text-xs uppercase tracking-wider font-bold">Date</span>
              <span className="text-white font-semibold">{completionDate}</span>
            </div>
            <div className="p-5 rounded-2xl bg-white/5 border border-emerald-400/10 flex flex-col items-center gap-1.5 hover:bg-emerald-500/[0.07] hover:border-emerald-400/25 transition-colors">
              <CheckCircle className="w-6 h-6 text-emerald-400" />
              <span className="text-slate-500 text-xs uppercase tracking-wider font-bold">Statut</span>
              <span className="text-white font-semibold">Validé</span>
            </div>
            <div className="p-5 rounded-2xl bg-white/5 border border-emerald-400/10 flex flex-col items-center gap-1.5 hover:bg-emerald-500/[0.07] hover:border-emerald-400/25 transition-colors">
              <Award className="w-6 h-6 text-cyan-300" />
              <span className="text-slate-500 text-xs uppercase tracking-wider font-bold">Niveau</span>
              <span className="text-white font-semibold">Expert</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={handleDownload}
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 text-white font-bold text-base shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 hover:-translate-y-1 transition-all duration-300 flex items-center justify-center gap-3"
            >
              <Download className="w-5 h-5" />
              Télécharger le Certificat
            </button>
            <button
              onClick={onClose}
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-white/5 border border-white/10 text-white font-bold text-base hover:bg-white/10 transition-all duration-300 flex items-center justify-center gap-3"
            >
              Retour au Dashboard
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-white/5 border-t border-white/10 p-6 text-center">
          <p className="text-slate-500 text-sm">
            Certifié par <span className="text-emerald-300 font-bold">HARX Academy</span> • ID: {certId}
          </p>
        </div>
      </div>
      </div>
    </div>
  );
};
