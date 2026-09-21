import React, { useEffect, useMemo, useState } from 'react';
import { Award, CheckCircle, Calendar, X } from 'lucide-react';
import harxLogo from '../../assets/logo-pink.png';

interface CertificationViewProps {
  traineeName: string;
  trainingTitle: string;
  completionDate: string;
  /** Identifiant officiel du certificat (issu de la base). À défaut, un id local est généré. */
  certificateId?: string;
  /** URL de partage (page /certification/:certificateId). */
  shareUrl?: string;
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

const CONFETTI_COLORS = ['#ff6b6b', '#ff4d4d', '#f472b6', '#ec4899', '#db2777', '#ffc2c2'];

export const CertificationView: React.FC<CertificationViewProps> = ({
  traineeName,
  trainingTitle,
  completionDate,
  certificateId,
  onClose,
}) => {
  const [showContent, setShowContent] = useState(false);

  const certId = useMemo(
    () => certificateId || buildCertId(`${traineeName}|${trainingTitle}|${completionDate}`),
    [certificateId, traineeName, trainingTitle, completionDate]
  );

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
      `}</style>

      <div className="relative z-[2] flex min-h-full items-center justify-center p-3 sm:p-4">
      <div
        className={`relative max-w-2xl w-full bg-white/[0.04] border border-harx-alt-400/15 rounded-[32px] shadow-2xl overflow-hidden transition-all duration-1000 transform ${
          showContent ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-12 scale-95'
        }`}
      >
        {/* Animated Background Elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10">
          <div className="absolute -top-24 -left-24 w-96 h-96 bg-harx-500/20 rounded-full blur-[120px] animate-pulse"></div>
          <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-harx-alt-500/20 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }}></div>
        </div>

        <div className="p-5 sm:p-7 md:p-8 text-center relative">
          {/* Top action buttons */}
          <div className="absolute top-6 right-6 flex items-center gap-2">
            <button
              onClick={onClose}
              title="Fermer"
              className="p-2.5 rounded-full bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex justify-center mb-6 pt-2">
            <img
              src={harxLogo}
              alt="HARX"
              className="h-16 md:h-20 w-auto object-contain drop-shadow-[0_8px_24px_rgba(236,72,153,0.35)]"
            />
          </div>

          {/* Achievement Text */}
          <div className="space-y-2 mb-5">
            <h2 className="text-harx-400 font-bold tracking-widest uppercase text-xs">Certification Obtenue</h2>
            <h1 className="text-2xl md:text-4xl font-black text-white leading-tight">
              Félicitations,{' '}
              <span className="cert-shimmer text-transparent bg-clip-text bg-gradient-to-r from-harx-300 via-harx-alt-400 to-harx-alt-500">
                {traineeName}
              </span>
            </h1>
            <p className="text-slate-400 text-sm md:text-base max-w-2xl mx-auto leading-relaxed">
              Vous avez complété avec succès tous les modules et évaluations de la formation :
            </p>
            <div className="inline-block px-5 py-2.5 rounded-2xl bg-harx-500/10 border border-harx-alt-400/20 text-base md:text-lg font-bold text-white shadow-xl backdrop-blur-sm">
              {trainingTitle}
            </div>
          </div>

          {/* Certificate Details */}
          <div className="grid grid-cols-3 gap-3 mb-6 max-w-2xl mx-auto">
            <div className="p-4 rounded-2xl bg-white/5 border border-harx-alt-400/10 flex flex-col items-center gap-1 hover:bg-harx-500/[0.07] hover:border-harx-alt-400/25 transition-colors">
              <Calendar className="w-5 h-5 text-harx-300" />
              <span className="text-slate-500 text-[10px] uppercase tracking-wider font-bold">Date</span>
              <span className="text-white font-semibold text-sm">{completionDate}</span>
            </div>
            <div className="p-4 rounded-2xl bg-white/5 border border-harx-alt-400/10 flex flex-col items-center gap-1 hover:bg-harx-500/[0.07] hover:border-harx-alt-400/25 transition-colors">
              <CheckCircle className="w-5 h-5 text-harx-alt-400" />
              <span className="text-slate-500 text-[10px] uppercase tracking-wider font-bold">Statut</span>
              <span className="text-white font-semibold text-sm">Validé</span>
            </div>
            <div className="p-4 rounded-2xl bg-white/5 border border-harx-alt-400/10 flex flex-col items-center gap-1 hover:bg-harx-500/[0.07] hover:border-harx-alt-400/25 transition-colors">
              <Award className="w-5 h-5 text-harx-400" />
              <span className="text-slate-500 text-[10px] uppercase tracking-wider font-bold">Niveau</span>
              <span className="text-white font-semibold text-sm">Expert</span>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="bg-white/5 border-t border-white/10 p-4 text-center">
          <p className="text-slate-500 text-xs">
            Certifié par <span className="text-harx-alt-300 font-bold">HARX Academy</span> • ID: {certId}
          </p>
        </div>
      </div>
      </div>
    </div>
  );
};
