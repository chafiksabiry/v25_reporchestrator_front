import React, { useState, useEffect } from 'react';
import { Upload, CheckCircle, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { getAgentId, getAuthToken } from '../../../utils/authUtils';

interface ZohoConfig {
  _id: string;
  userId: string;
  access_token: string;
  refresh_token: string;
  expires_in: number;
  updated_at: string;
  createdAt: string;
  updatedAt: string;
}

export function ImportLeads() {
  const { t } = useTranslation();
  const [zohoConfig, setZohoConfig] = useState<ZohoConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Vérifier si l'utilisateur a une configuration Zoho
  useEffect(() => {
    checkZohoConfig();
  }, []);

  const checkZohoConfig = async () => {
    const userId = getAgentId();
    const token = getAuthToken();

    if (!userId || !token) {
      setLoading(false);
      return;
    }

    try {
      console.log('🔍 Checking Zoho config for user:', userId);
      const response = await fetch(
        `${import.meta.env.VITE_DASH_COMPANY_BACKEND}/zoho-config/user/${userId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Zoho config found:', data);
        setZohoConfig(data.data || data);
      } else if (response.status === 404) {
        console.log('ℹ️ No Zoho config found');
        setZohoConfig(null);
      } else {
        console.error('❌ Error checking Zoho config:', response.status);
        setZohoConfig(null);
      }
    } catch (error) {
      console.error('❌ Error checking Zoho config:', error);
      setZohoConfig(null);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    setActionLoading(true);
    setMessage(null);

    try {
      // Rediriger vers l'endpoint d'authentification Zoho
      const userId = getAgentId();
      const redirectUrl = `${import.meta.env.VITE_DASH_COMPANY_BACKEND}/zoho/auth?userId=${userId}&redirectUrl=${window.location.origin}/company/leads`;

      console.log('🔗 Redirecting to Zoho auth:', redirectUrl);
      window.location.href = redirectUrl;
    } catch (error) {
      console.error('❌ Error connecting to Zoho:', error);
      setMessage({ text: t('importLeads.connectFailed'), type: 'error' });
      setActionLoading(false);
    }
  };

  const handleDisconnect = async () => {
    const userId = getAgentId();
    const token = getAuthToken();

    if (!userId || !token || !zohoConfig) {
      setMessage({ text: t('importLeads.disconnectUnavailable'), type: 'error' });
      return;
    }

    setActionLoading(true);
    setMessage(null);

    try {
      console.log('🔌 Disconnecting Zoho config:', zohoConfig._id);
      const response = await fetch(
        `${import.meta.env.VITE_DASH_COMPANY_BACKEND}/zoho-config/${zohoConfig._id}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        console.log('✅ Zoho config deleted');
        setMessage({ text: t('importLeads.disconnectSuccess'), type: 'success' });
        setZohoConfig(null);
      } else {
        throw new Error('Failed to disconnect');
      }
    } catch (error) {
      console.error('❌ Error disconnecting Zoho:', error);
      setMessage({ text: t('importLeads.disconnectFailed'), type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">{t('importLeads.loading')}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Upload className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">{t('importLeads.title')}</h1>
          </div>
          <p className="text-gray-600">
            {t('importLeads.subtitle')}
          </p>
        </div>

        {/* Message de notification */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${message.type === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
            }`}>
            {message.type === 'success' ? (
              <CheckCircle className="w-5 h-5" />
            ) : (
              <AlertCircle className="w-5 h-5" />
            )}
            <p className="font-medium">{message.text}</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Zoho CRM Integration */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="w-8 h-8" viewBox="0 0 48 48" fill="none">
                  <rect width="48" height="48" rx="8" fill="#E34133" />
                  <path d="M24 12L12 36H36L24 12Z" fill="white" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900">Zoho CRM</h3>
                <p className="text-sm text-gray-600">{t('importLeads.integration')}</p>
              </div>
            </div>

            <p className="text-gray-600 mb-6">
              {t('importLeads.zohoDescription')}
            </p>

            {/* Status */}
            <div className="mb-6">
              {zohoConfig ? (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="w-5 h-5" />
                  <span className="font-medium">{t('importLeads.connected')}</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-orange-600">
                  <AlertCircle className="w-5 h-5" />
                  <span className="font-medium">{t('importLeads.notConnected')}</span>
                </div>
              )}
            </div>

            {/* Action Button */}
            {zohoConfig ? (
              <button
                onClick={handleDisconnect}
                disabled={actionLoading}
                className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${actionLoading
                    ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                    : 'bg-red-600 text-white hover:bg-red-700'
                  }`}
              >
                {actionLoading ? t('importLeads.disconnecting') : t('importLeads.disconnect')}
              </button>
            ) : (
              <button
                onClick={handleConnect}
                disabled={actionLoading}
                className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${actionLoading
                    ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                    : 'bg-green-600 text-white hover:bg-green-700'
                  }`}
              >
                {actionLoading ? t('importLeads.connecting') : t('importLeads.connect')}
              </button>
            )}

            {zohoConfig && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500 mb-1">{t('importLeads.connectedUserId')}</p>
                <p className="text-sm font-mono text-gray-700 truncate">{zohoConfig.userId}</p>
                <p className="text-xs text-gray-500 mt-2">{t('importLeads.lastUpdated')}</p>
                <p className="text-sm text-gray-700">
                  {new Date(zohoConfig.updatedAt).toLocaleString()}
                </p>
              </div>
            )}
          </div>

          {/* File Upload */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Upload className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900">{t('importLeads.fileUpload')}</h3>
                <p className="text-sm text-gray-600">{t('importLeads.fileUploadDesc')}</p>
              </div>
            </div>

            <p className="text-gray-600 mb-6">
              📄 {t('importLeads.supportedFormats')}
            </p>

            <button
              disabled
              title={t('importLeads.comingSoon')}
              className="w-full py-3 px-4 bg-gray-200 text-gray-500 rounded-lg font-medium cursor-not-allowed"
            >
              {t('importLeads.uploadCta')} — {t('importLeads.comingSoon')}
            </button>
          </div>
        </div>

        {/* Channel Filter */}
        <div className="mt-8 bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">{t('importLeads.channelFilter')}</h2>
          <div className="flex gap-4">
            <button
              disabled
              title={t('importLeads.comingSoon')}
              className="px-6 py-2 bg-blue-200 text-blue-500 rounded-lg font-medium cursor-not-allowed"
            >
              🌐 {t('importLeads.allChannels')}
            </button>
            <button
              disabled
              title={t('importLeads.comingSoon')}
              className="px-6 py-2 bg-gray-100 text-gray-400 rounded-lg font-medium cursor-not-allowed"
            >
              📞 {t('importLeads.voiceCalls')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

