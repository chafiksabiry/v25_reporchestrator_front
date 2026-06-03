// API service for language-related operations

interface Language {
  _id: string;
  code: string;
  name: string;
  nativeName: string;
  createdAt: string;
  lastUpdated: string;
  updatedAt: string;
  __v: number;
}

interface LanguagesResponse {
  success: boolean;
  data: Language[];
  message: string;
}

export const fetchAllLanguages = async (): Promise<Language[]> => {
  try {
    const response = await fetch(`${import.meta.env.VITE_REP_API_URL}/api/languages`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data: LanguagesResponse = await response.json();
    
    if (!data.success) {
      throw new Error(data.message || 'Failed to fetch languages');
    }
    
    return data.data;
  } catch (error) {
    console.error('Error fetching languages:', error);
    throw error;
  }
};

export type { Language }; 