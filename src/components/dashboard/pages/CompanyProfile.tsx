import { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate, useParams, useLocation, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  Building2,
  Calendar,
  Facebook,
  Globe,
  Instagram,
  Linkedin,
  Mail,
  MapPin,
  Phone,
  Target,
  Twitter,
} from 'lucide-react';
import {
  type CompanyProfileData,
  loadCompanyProfileFromStorage,
  persistCompanyProfile,
  getCompanyReturnGig,
  persistCompanyReturnGig,
} from '../../../utils/companyProfileStorage';
import {
  normalizeEntityId,
  fetchGigDetailsPayload,
  fetchCompanyFromGigsListing,
} from '../../../utils/companyProfileLoad';

type CompanyLocationState = {
  company?: CompanyProfileData;
  /** Gig the user came from (explicit back target). */
  fromGigId?: string;
};

export function CompanyProfile() {
  const { companyId } = useParams<{ companyId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [company, setCompany] = useState<CompanyProfileData | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!companyId) return;
    const id: string = companyId;
    let cancelled = false;

    async function resolve() {
      setLoadError(null);
      try {
        const locState = location.state as CompanyLocationState | null;
        const fromState = locState?.company;
        if (fromState && normalizeEntityId(fromState._id) === id) {
          setCompany(fromState);
          persistCompanyProfile(id, fromState);
          return;
        }

        const cached = loadCompanyProfileFromStorage(id);
        if (cached && normalizeEntityId(cached._id) === id) {
          setCompany(cached);
          return;
        }

        setCompany(null);
        setLoading(true);

        const gigId =
          searchParams.get('gigId') ||
          searchParams.get('fromGig') ||
          searchParams.get('returnGig') ||
          null;

        let loaded: CompanyProfileData | null = null;

        if (gigId) {
          try {
            const gig = await fetchGigDetailsPayload(gigId);
            const co = gig.companyId;
            if (co && typeof co === 'object') {
              const cid = normalizeEntityId((co as { _id?: unknown })._id);
              if (cid === id) {
                loaded = co as CompanyProfileData;
                persistCompanyReturnGig(id, gigId);
              }
            }
          } catch {
            /* fallback: listing */
          }
        }

        if (!loaded && !cancelled) {
          try {
            loaded = await fetchCompanyFromGigsListing(id);
          } catch {
            loaded = null;
          }
        }

        if (cancelled) return;

        if (loaded) {
          setCompany(loaded);
          persistCompanyProfile(id, loaded);
          setLoadError(null);
        } else {
          setCompany(null);
          setLoadError(
            'Impossible de charger ce profil. Vérifiez le lien, ou ouvrez l’entreprise depuis une fiche gig ou le marketplace.',
          );
        }
      } finally {
        setLoading(false);
      }
    }

    resolve();
    return () => {
      cancelled = true;
    };
  }, [companyId, location.state, searchParams]);

  const handleBack = useCallback(() => {
    if (!companyId) {
      navigate('/gigs-marketplace');
      return;
    }
    const state = location.state as CompanyLocationState | null;
    const fromQuery =
      searchParams.get('gigId') || searchParams.get('fromGig') || searchParams.get('returnGig');
    const fromGigId = state?.fromGigId || getCompanyReturnGig(companyId) || fromQuery || undefined;
    if (fromGigId) {
      // Replace so we do not push a second "gig" entry on top of "company".
      // Without this, browser Back from the gig page returns to company — it feels like Back is broken.
      navigate(`/gig/${fromGigId}`, { replace: true });
      return;
    }
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate('/gigs-marketplace');
  }, [companyId, location.state, navigate, searchParams]);

  const mapsHref = useMemo(() => {
    const c = company?.contact;
    if (!c) return null;
    if (c.coordinates?.lat != null && c.coordinates?.lng != null) {
      return `https://www.google.com/maps?q=${c.coordinates.lat},${c.coordinates.lng}`;
    }
    if (c.address) return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(c.address)}`;
    if (company?.headquarters) {
      return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(company.headquarters)}`;
    }
    return null;
  }, [company]);

  if (!companyId) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center gap-4 text-slate-600">
        <div className="h-10 w-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-semibold">Chargement du profil…</p>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm max-w-md w-full p-10 text-center">
          <h1 className="text-xl font-black text-slate-900 mb-2">Entreprise introuvable</h1>
          <p className="text-slate-600 text-sm mb-4">
            {loadError ||
              'Ouvrez cette page depuis une fiche gig ou le marketplace, ou vérifiez que l’URL est correcte.'}
          </p>
          <button
            type="button"
            onClick={() => navigate('/gigs-marketplace')}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-black text-sm uppercase tracking-wider hover:opacity-95 transition-opacity"
          >
            Retour au marketplace
          </button>
        </div>
      </div>
    );
  }

  const sm = company.socialMedia || {};

  return (
    <div className="min-h-screen bg-slate-50 pb-12">
      {/* Hero — HARX sans dominante rouge : indigo / violet + léger accent */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-950 to-violet-950 text-white">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.12]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 20% 20%, rgba(236,72,153,0.45), transparent 45%), radial-gradient(circle at 80% 30%, rgba(99,102,241,0.35), transparent 40%)',
          }}
        />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'0.04\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-80" />

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-28">
          <button
            type="button"
            onClick={handleBack}
            className="inline-flex items-center text-white/80 hover:text-white font-bold text-sm mb-8 transition-colors group"
          >
            <ArrowLeft className="w-5 h-5 mr-2 group-hover:-translate-x-1 transition-transform" />
            Retour
          </button>

          <div className="flex flex-col sm:flex-row sm:items-end gap-6">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-white/95 border border-white/30 shadow-xl flex items-center justify-center overflow-hidden shrink-0">
              {company.logo ? (
                <img src={company.logo} alt="" className="w-full h-full object-contain p-2" />
              ) : (
                <span className="text-3xl font-black text-indigo-600">{company.name?.[0] || '?'}</span>
              )}
            </div>
            <div className="flex-1 min-w-0 pb-1">
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white drop-shadow-sm">{company.name}</h1>
              <div className="flex flex-wrap gap-2 mt-4">
                {company.industry && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white/10 border border-white/20 backdrop-blur-sm">
                    <Target className="w-3.5 h-3.5 opacity-90" />
                    {company.industry}
                  </span>
                )}
                {company.founded && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white/10 border border-white/20 backdrop-blur-sm">
                    <Calendar className="w-3.5 h-3.5 opacity-90" />
                    {company.founded}
                  </span>
                )}
                {company.headquarters && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white/10 border border-white/20 backdrop-blur-sm max-w-full">
                    <MapPin className="w-3.5 h-3.5 shrink-0 opacity-90" />
                    <span className="truncate">{company.headquarters}</span>
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 -mt-16 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Sidebar */}
          <aside className="lg:col-span-4 space-y-6">
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6">
              <h2 className="text-sm font-black uppercase tracking-widest text-slate-500 mb-4 flex items-center gap-2">
                <Mail className="w-4 h-4 text-indigo-500" />
                Contact
              </h2>
              <ul className="space-y-3 text-sm">
                {company.contact?.email && (
                  <li className="flex items-start gap-2">
                    <Mail className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                    <a href={`mailto:${company.contact.email}`} className="text-indigo-600 hover:underline break-all font-medium">
                      {company.contact.email}
                    </a>
                  </li>
                )}
                {company.contact?.phone && (
                  <li className="flex items-start gap-2">
                    <Phone className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                    <a href={`tel:${company.contact.phone}`} className="text-slate-800 font-medium hover:text-indigo-600">
                      {company.contact.phone}
                    </a>
                  </li>
                )}
                {company.contact?.website && (
                  <li className="flex items-start gap-2">
                    <Globe className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                    <a
                      href={company.contact.website.startsWith('http') ? company.contact.website : `https://${company.contact.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-600 hover:underline break-all font-medium"
                    >
                      {company.contact.website}
                    </a>
                  </li>
                )}
                {(company.contact?.address || company.headquarters) && (
                  <li className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                    <span className="text-slate-700">{company.contact?.address || company.headquarters}</span>
                  </li>
                )}
              </ul>
              {!company.contact?.email &&
                !company.contact?.phone &&
                !company.contact?.website &&
                !company.contact?.address &&
                !company.headquarters && (
                  <p className="text-sm text-slate-500">Aucune information de contact publiée.</p>
                )}

              {mapsHref && (
                <a
                  href={mapsHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-5 block w-full text-center py-2.5 rounded-xl text-xs font-black uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-100 hover:bg-indigo-100 transition-colors"
                >
                  Voir sur la carte
                </a>
              )}
            </div>

            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6">
              <h2 className="text-sm font-black uppercase tracking-widest text-slate-500 mb-4 flex items-center gap-2">
                <Globe className="w-4 h-4 text-violet-500" />
                Présence en ligne
              </h2>
              <div className="flex flex-wrap gap-2">
                {sm.linkedin && (
                  <a
                    href={sm.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-3 rounded-xl border border-slate-200 text-slate-600 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50/50 transition-colors"
                    aria-label="LinkedIn"
                  >
                    <Linkedin className="w-5 h-5" />
                  </a>
                )}
                {sm.twitter && (
                  <a
                    href={sm.twitter}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-3 rounded-xl border border-slate-200 text-slate-600 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50/50 transition-colors"
                    aria-label="Twitter"
                  >
                    <Twitter className="w-5 h-5" />
                  </a>
                )}
                {sm.facebook && (
                  <a
                    href={sm.facebook}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-3 rounded-xl border border-slate-200 text-slate-600 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50/50 transition-colors"
                    aria-label="Facebook"
                  >
                    <Facebook className="w-5 h-5" />
                  </a>
                )}
                {sm.instagram && (
                  <a
                    href={sm.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-3 rounded-xl border border-slate-200 text-slate-600 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50/50 transition-colors"
                    aria-label="Instagram"
                  >
                    <Instagram className="w-5 h-5" />
                  </a>
                )}
                {!sm.linkedin && !sm.twitter && !sm.facebook && !sm.instagram && (
                  <p className="text-sm text-slate-500">Aucun lien social renseigné.</p>
                )}
              </div>
            </div>
          </aside>

          {/* Main */}
          <div className="lg:col-span-8 space-y-6">
            <section className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-500/25">
                  <Building2 className="w-6 h-6" />
                </div>
                <h2 className="text-xl font-black text-slate-900 tracking-tight">Présentation</h2>
              </div>
              <p className="text-slate-600 leading-relaxed font-medium whitespace-pre-wrap">
                {company.overview || company.companyIntro || 'Aucune description disponible pour cette entreprise.'}
              </p>
            </section>

            {company.mission && (
              <section className="rounded-3xl border border-indigo-100 bg-gradient-to-br from-indigo-50/90 to-violet-50/80 p-8 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2.5 rounded-2xl bg-white border border-indigo-100 text-indigo-600 shadow-sm">
                    <Target className="w-6 h-6" />
                  </div>
                  <h2 className="text-xl font-black text-slate-900 tracking-tight">Notre mission</h2>
                </div>
                <p className="text-slate-700 leading-relaxed font-medium whitespace-pre-wrap">{company.mission}</p>
              </section>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
