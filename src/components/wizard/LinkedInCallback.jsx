import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import queryString from 'query-string';
import { LinkedInClient } from '../../lib/linkedin/linkedinClient';

function LinkedInCallback() {
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        console.log('LinkedIn callback received:', location.search);
        const { code, state, error: oauthError, error_description } = queryString.parse(location.search);

        if (oauthError) {
          console.error('OAuth error:', { error: oauthError, description: error_description });
          throw new Error(`LinkedIn OAuth error: ${error_description || oauthError}`);
        }

        if (!code) {
          throw new Error('No authorization code received');
        }

        const linkedinClient = new LinkedInClient();
        
        // Validate state to prevent CSRF attacks
        if (!linkedinClient.validateState(state)) {
          throw new Error('Invalid state parameter - possible CSRF attack');
        }

        console.log('Getting access token...');
        const { access_token } = await linkedinClient.getAccessToken(code);
        
        console.log('Getting profile data...');
        const profileData = await linkedinClient.getProfile(access_token);
        const formattedData = linkedinClient.formatProfileData(profileData);

        console.log('Profile data retrieved successfully:', formattedData);

        // Store the profile data and navigate back
        navigate('/', { state: { profileData: formattedData } });
      } catch (err) {
        console.error('LinkedIn callback error:', err);
        setError(err.message || 'Failed to connect with LinkedIn');
      }
    };

    handleCallback();
  }, [location, navigate]);

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-sm p-6 max-w-md w-full">
          <h2 className="text-xl font-bold text-red-600 mb-4">LinkedIn Connection Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <div className="text-sm text-gray-500 mb-4">
            Please make sure:
            <ul className="list-disc pl-5 mt-2">
              <li>You're using a valid LinkedIn account</li>
              <li>You've granted the required permissions</li>
              <li>Your browser isn't blocking third-party cookies</li>
            </ul>
          </div>
          <button
            onClick={() => navigate('/')}
            className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
          >
            Return to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-sm p-6 max-w-md w-full text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Connecting to LinkedIn...</p>
      </div>
    </div>
  );
}

export default LinkedInCallback;