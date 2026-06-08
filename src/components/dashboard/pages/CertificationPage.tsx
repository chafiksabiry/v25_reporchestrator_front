import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { Loader2, AlertCircle, ArrowLeft } from 'lucide-react';
import { CertificationView } from '../CertificationView';
import { getAgentId, getAuthToken } from '../../../utils/authUtils';
import { buildCertificationShareUrl } from '../../../utils/certificationUrl';

function trainingApiBase(): string {
  const raw =
    import.meta.env.VITE_TRAINING_API_URL ||
    import.meta.env.VITE_TRAINING_BACKEND_URL ||
    '';
  return String(raw).replace(/\/$/, '');
}

type CertPayload = {
  certificateId?: string;
  traineeName?: string;
  trainingTitle?: string;
  level?: string;
  finalScore?: number;
  issuedAt?: string;
  status?: string;
};

export function CertificationPage() {
  const navigate = useNavigate();
  const { certificateId, journeyId } = useParams<{ certificateId?: string; journeyId?: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cert, setCert] = useState<CertPayload | null>(null);

  useEffect(() => {
    const base = trainingApiBase();
    if (!base) {
      setError('API de formation non configurée (VITE_TRAINING_API_URL).');
      setLoading(false);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const token = getAuthToken() || '';
        const headers = token ? { Authorization: `Bearer ${token}` } : undefined;

        if (journeyId) {
          const repId = getAgentId();
          if (!repId) {
            setError('Connectez-vous pour afficher votre certificat.');
            return;
          }
          const res = await axios.get<{ success?: boolean; certification?: CertPayload }>(
            `${base}/training_journeys/certification/${encodeURIComponent(repId)}/${encodeURIComponent(journeyId)}`,
            { headers }
          );
          if (!cancelled) setCert(res.data?.certification || null);
          return;
        }

        if (certificateId) {
          const res = await axios.get<{ success?: boolean; certification?: CertPayload }>(
            `${base}/certifications/verify/${encodeURIComponent(certificateId)}`,
            { headers }
          );
          if (!cancelled) setCert(res.data?.certification || null);
          return;
        }

        setError('Identifiant de certificat manquant.');
      } catch (e: unknown) {
        if (cancelled) return;
        const msg = axios.isAxiosError(e)
          ? String(e.response?.data?.error || e.response?.data?.message || e.message)
          : e instanceof Error
            ? e.message
            : 'Impossible de charger le certificat.';
        setError(msg);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [certificateId, journeyId]);

  const handleClose = () => navigate('/training?tab=certifications');

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center gap-3 text-gray-600">
        <Loader2 className="w-8 h-8 animate-spin text-harx-500" />
        <span className="font-medium">Chargement du certificat…</span>
      </div>
    );
  }

  if (error || !cert) {
    return (
      <div className="max-w-lg mx-auto mt-12 rounded-2xl border border-red-100 bg-red-50/80 p-8 text-center">
        <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-4" />
        <h1 className="text-lg font-black text-gray-900 mb-2">Certificat introuvable</h1>
        <p className="text-sm text-red-800 mb-6">{error || 'Ce certificat n\'existe pas ou n\'a pas encore été émis.'}</p>
        <button
          type="button"
          onClick={() => navigate('/training')}
          className="inline-flex items-center gap-2 rounded-xl bg-harx-600 text-white px-5 py-2.5 text-xs font-black uppercase tracking-widest hover:bg-harx-700"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour aux formations
        </button>
      </div>
    );
  }

  const completionDate = cert.issuedAt
    ? new Date(cert.issuedAt).toLocaleDateString('fr-FR')
    : new Date().toLocaleDateString('fr-FR');

  const shareUrl = cert.certificateId ? buildCertificationShareUrl(cert.certificateId) : undefined;

  return (
    <CertificationView
      traineeName={cert.traineeName || 'Trainee'}
      trainingTitle={cert.trainingTitle || 'Training'}
      completionDate={completionDate}
      certificateId={cert.certificateId}
      shareUrl={shareUrl}
      onClose={handleClose}
    />
  );
}
