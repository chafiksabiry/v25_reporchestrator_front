export class LinkedInClient {
  constructor() {
    this.clientId = import.meta.env.VITE_LINKEDIN_CLIENT_ID;
    this.clientSecret = import.meta.env.VITE_LINKEDIN_CLIENT_SECRET;
    this.redirectUri = import.meta.env.VITE_LINKEDIN_REDIRECT_URI;
    this.scope = 'r_liteprofile r_emailaddress';
    this.baseUrl = 'https://api.linkedin.com/v2';
    
    // Validate required configuration
    if (!this.clientId) throw new Error('LinkedIn Client ID is required');
    if (!this.clientSecret) throw new Error('LinkedIn Client Secret is required');
    if (!this.redirectUri) throw new Error('LinkedIn Redirect URI is required');
  }

  getAuthUrl() {
    const state = this.generateState();
    sessionStorage.setItem('linkedin_oauth_state', state);
    
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      state,
      scope: this.scope
    });

    const authUrl = `https://www.linkedin.com/oauth/v2/authorization?${params.toString()}`;
    console.log('LinkedIn Auth URL:', authUrl);
    return authUrl;
  }

  generateState() {
    const state = Math.random().toString(36).substring(7);
    console.log('Generated state:', state);
    return state;
  }

  validateState(receivedState) {
    const storedState = sessionStorage.getItem('linkedin_oauth_state');
    console.log('Validating state:', { received: receivedState, stored: storedState });
    sessionStorage.removeItem('linkedin_oauth_state');
    return storedState === receivedState;
  }

  async getAccessToken(code) {
    console.log('Getting access token for code:', code);
    try {
      const params = new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: this.clientId,
        client_secret: this.clientSecret,
        redirect_uri: this.redirectUri
      });

      console.log('Token request params:', params.toString());

      const response = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        },
        body: params
      });

      console.log('Token response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('LinkedIn access token error response:', errorText);
        throw new Error(`Failed to get access token: ${response.status} ${response.statusText}\n${errorText}`);
      }

      const data = await response.json();
      console.log('Token response data:', data);

      if (!data.access_token) {
        throw new Error('No access token received in response');
      }

      return data;
    } catch (error) {
      console.error('Access token error:', error);
      throw new Error(`Failed to get access token: ${error.message}`);
    }
  }

  async getProfile(accessToken) {
    console.log('Getting profile with token:', accessToken);
    try {
      // Get basic profile information
      const profileResponse = await fetch(`${this.baseUrl}/me?projection=(id,localizedFirstName,localizedLastName,profilePicture(displayImage~:playableStreams))`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'cache-control': 'no-cache',
          'X-Restli-Protocol-Version': '2.0.0',
          'Accept': 'application/json'
        }
      });

      console.log('Profile response status:', profileResponse.status);

      if (!profileResponse.ok) {
        const error = await profileResponse.text();
        console.error('Profile fetch error response:', error);
        throw new Error(`Failed to fetch profile: ${profileResponse.status} ${profileResponse.statusText}\n${error}`);
      }

      const profile = await profileResponse.json();
      console.log('Profile data:', profile);

      // Get email address
      const emailResponse = await fetch(`${this.baseUrl}/emailAddress?q=members&projection=(elements*(handle~))`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'cache-control': 'no-cache',
          'X-Restli-Protocol-Version': '2.0.0',
          'Accept': 'application/json'
        }
      });

      console.log('Email response status:', emailResponse.status);

      if (!emailResponse.ok) {
        const error = await emailResponse.text();
        console.error('Email fetch error response:', error);
        throw new Error(`Failed to fetch email: ${emailResponse.status} ${emailResponse.statusText}\n${error}`);
      }

      const email = await emailResponse.json();
      console.log('Email data:', email);

      return {
        id: profile.id,
        firstName: profile.localizedFirstName,
        lastName: profile.localizedLastName,
        email: email.elements?.[0]?.['handle~']?.emailAddress,
        pictureUrl: profile.profilePicture?.['displayImage~']?.elements?.[0]?.identifiers?.[0]?.identifier
      };
    } catch (error) {
      console.error('Profile fetch error:', error);
      throw new Error(`Failed to fetch profile: ${error.message}`);
    }
  }

  formatProfileData(profileData) {
    console.log('Formatting profile data:', profileData);
    if (!profileData) {
      throw new Error('No profile data provided');
    }

    return {
      personalInfo: {
        name: profileData.firstName && profileData.lastName 
          ? `${profileData.firstName} ${profileData.lastName}`
          : 'Unknown',
        email: profileData.email || '',
        location: '',
        languages: []
      },
      professionalSummary: {
        yearsOfExperience: '',
        industries: [],
        keyExpertise: [],
        notableCompanies: []
      },
      skills: {
        technical: [],
        professional: [],
        soft: []
      },
      achievements: []
    };
  }
}