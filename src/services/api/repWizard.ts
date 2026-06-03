// REP Wizard API service
const REP_WIZARD_API_BASE = import.meta.env.VITE_REP_API_URL;

export interface Timezone {
  _id: string;
  countryCode: string;
  countryName: string;
  zoneName: string;
  gmtOffset: number;
  lastUpdated: string;
  createdAt: string;
  updatedAt: string;
}

export interface TimezoneResponse {
  success: boolean;
  data: Timezone[];
}

class RepWizardApiService {
  private baseURL: string;

  constructor() {
    this.baseURL = REP_WIZARD_API_BASE;
  }

  private async apiCall<T>(endpoint: string, options?: RequestInit): Promise<T> {
    try {
      const url = `${this.baseURL}${endpoint}`;

      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
        ...options,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error(`❌ REP Wizard API Error for ${endpoint}:`, error);
      throw error;
    }
  }

  // Timezone endpoints
  async getTimezones(): Promise<Timezone[]> {
    const response = await this.apiCall<TimezoneResponse>('/api/timezones');
    return response.data;
  }

  async getCountries(): Promise<Timezone[]> {
    const countriesData = await this.getTimezones();
    
    // Remove duplications based on countryCode
    const uniqueCountries = countriesData.filter((country, index, self) => 
      index === self.findIndex(c => c.countryCode === country.countryCode)
    );
    
    // Sort countries alphabetically by name for better UX
    const sortedCountries = uniqueCountries.sort((a, b) => 
      a.countryName.localeCompare(b.countryName)
    );
    
    return sortedCountries;
  }

  async getTimezonesByCountry(countryCode: string): Promise<Timezone[]> {
    const timezones = await this.getTimezones();
    return timezones.filter(tz => tz.countryCode === countryCode.toUpperCase());
  }

  async getTimezoneById(timezoneId: string): Promise<Timezone | null> {
    const timezones = await this.getTimezones();
    return timezones.find(tz => tz._id === timezoneId) || null;
  }

  // Profile endpoints (if we need to call REP Wizard API for profiles too)
  async getProfile(userId: string): Promise<any> {
    return this.apiCall(`/api/profiles/${userId}`);
  }

  async updateProfile(userId: string, profileData: any): Promise<any> {
    return this.apiCall(`/api/profiles/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(profileData),
    });
  }

  // Utility functions
  formatTimezone(timezone: Timezone): string {
    if (!timezone) return '';
    
    const hours = Math.floor(Math.abs(timezone.gmtOffset) / 3600);
    const minutes = Math.floor((Math.abs(timezone.gmtOffset) % 3600) / 60);
    const sign = timezone.gmtOffset >= 0 ? '+' : '-';
    
    const offsetString = `GMT${sign}${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    
    return `${timezone.zoneName} (${offsetString})`;
  }

  getTimezoneDisplayInfo(timezone: Timezone) {
    if (!timezone) return null;
    
    return {
      id: timezone._id,
      countryCode: timezone.countryCode,
      countryName: timezone.countryName,
      zoneName: timezone.zoneName,
      displayName: this.formatTimezone(timezone),
      gmtOffset: timezone.gmtOffset,
      offsetHours: timezone.gmtOffset / 3600
    };
  }
}

export const repWizardApi = new RepWizardApiService(); 