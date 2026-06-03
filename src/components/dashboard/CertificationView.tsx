import React, { useEffect, useState } from 'react';
import { Award, Download, Share2, CheckCircle, Star, Calendar, Trophy } from 'lucide-react';

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

export const CertificationView: React.FC<CertificationViewProps> = ({
  traineeName,
  trainingTitle,
  completionDate,
  onClose,
}) => {
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    // Fade in content
    setTimeout(() => setShowContent(true), 500);
  }, []);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0b1025]/95 backdrop-blur-md overflow-y-auto p-4 py-12">
      <div 
        className={`max-w-4xl w-full bg-white/5 border border-white/10 rounded-[40px] shadow-2xl overflow-hidden transition-all duration-1000 transform ${
          showContent ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-12 scale-95'
        }`}
      >
        {/* Animated Background Elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10">
          <div className="absolute -top-24 -left-24 w-96 h-96 bg-harx-500/20 rounded-full blur-[120px] animate-pulse"></div>
          <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-harx-alt-500/20 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }}></div>
        </div>

        <div className="p-8 md:p-12 text-center relative">
          {/* Close Button */}
          <button 
            onClick={onClose}
            className="absolute top-6 right-6 p-2 rounded-full bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors"
          >
            <Share2 className="w-5 h-5" />
          </button>

          {/* Badge Image */}
          <div className="relative inline-block mb-8 group">
            <div className="absolute inset-0 bg-harx-500 rounded-full blur-3xl opacity-20 group-hover:opacity-40 transition-opacity duration-700"></div>
            <div className="relative w-48 h-48 md:w-56 md:h-56 flex items-center justify-center">
              {/* Replace with your generated image path if available */}
              <div className="w-full h-full rounded-full bg-gradient-to-tr from-amber-200 via-yellow-400 to-amber-600 p-1 shadow-2xl transform group-hover:scale-105 transition-transform duration-700">
                <div className="w-full h-full rounded-full bg-[#0b1025] flex items-center justify-center">
                  <Trophy className="w-24 h-24 text-yellow-400 drop-shadow-[0_0_15px_rgba(250,204,21,0.5)]" />
                </div>
              </div>
              
              {/* Floating Stars */}
              <Star className="absolute top-4 right-4 w-6 h-6 text-yellow-400 animate-bounce" style={{ animationDuration: '3s' }} />
              <Star className="absolute bottom-10 -left-2 w-4 h-4 text-yellow-400 animate-bounce" style={{ animationDuration: '2.5s' }} />
              <Star className="absolute top-1/2 -right-6 w-5 h-5 text-yellow-400 animate-bounce" style={{ animationDuration: '4s' }} />
            </div>
          </div>

          {/* Achievement Text */}
          <div className="space-y-4 mb-10">
            <h2 className="text-harx-400 font-bold tracking-widest uppercase text-sm md:text-base">Certification Obtenue</h2>
            <h1 className="text-4xl md:text-6xl font-black text-white leading-tight">
              Félicitations, <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-600">
                {traineeName}
              </span>
            </h1>
            <p className="text-slate-400 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
              Vous avez complété avec succès tous les modules et évaluations de la formation :
            </p>
            <div className="inline-block px-6 py-3 rounded-2xl bg-white/5 border border-white/10 text-xl md:text-2xl font-bold text-white shadow-xl backdrop-blur-sm">
              {trainingTitle}
            </div>
          </div>

          {/* Certificate Details */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 max-w-3xl mx-auto">
            <div className="p-6 rounded-3xl bg-white/5 border border-white/10 flex flex-col items-center gap-2">
              <Calendar className="w-6 h-6 text-harx-400" />
              <span className="text-slate-500 text-xs uppercase tracking-wider font-bold">Date</span>
              <span className="text-white font-semibold">{completionDate}</span>
            </div>
            <div className="p-6 rounded-3xl bg-white/5 border border-white/10 flex flex-col items-center gap-2">
              <CheckCircle className="w-6 h-6 text-emerald-400" />
              <span className="text-slate-500 text-xs uppercase tracking-wider font-bold">Statut</span>
              <span className="text-white font-semibold">Validé</span>
            </div>
            <div className="p-6 rounded-3xl bg-white/5 border border-white/10 flex flex-col items-center gap-2">
              <Award className="w-6 h-6 text-amber-400" />
              <span className="text-slate-500 text-xs uppercase tracking-wider font-bold">Niveau</span>
              <span className="text-white font-semibold">Expert</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button className="w-full sm:w-auto px-10 py-5 rounded-2xl bg-gradient-to-r from-harx-600 to-harx-alt-500 text-white font-bold text-lg shadow-lg hover:shadow-harx-500/30 hover:-translate-y-1 transition-all duration-300 flex items-center justify-center gap-3">
              <Download className="w-6 h-6" />
              Télécharger le Certificat
            </button>
            <button 
              onClick={onClose}
              className="w-full sm:w-auto px-10 py-5 rounded-2xl bg-white/5 border border-white/10 text-white font-bold text-lg hover:bg-white/10 transition-all duration-300 flex items-center justify-center gap-3"
            >
              Retour au Dashboard
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-white/5 border-t border-white/10 p-6 text-center">
          <p className="text-slate-500 text-sm">
            Certifié par <span className="text-slate-300 font-bold">HARX Academy</span> • ID: CERT-{Math.random().toString(36).substr(2, 9).toUpperCase()}
          </p>
        </div>
      </div>
    </div>
  );
};
