import axios from 'axios';
import { repApiUrl } from '../../utils/repApiUrl';

// The languages collection (GET /api/languages, /api/languages/:code) lives on
// the reps wizard backend, so we must target VITE_REP_API_URL — not
// VITE_API_URL (registration backend), which 404s.

// Get all languages
export const getAllLanguages = async () => {
  try {
    const response = await axios.get(repApiUrl('/languages'));
    return response.data.data; // Return the languages array
  } catch (error) {
    console.error('Error fetching languages:', error);
    throw new Error('Failed to fetch languages');
  }
};

// Get language by code
export const getLanguageByCode = async (code) => {
  try {
    const response = await axios.get(repApiUrl(`/languages/${code}`));
    return response.data.data; // Return the language object
  } catch (error) {
    console.error('Error fetching language by code:', error);
    throw new Error(`Failed to fetch language with code: ${code}`);
  }
};

// Search languages by name or code
export const searchLanguages = (languages, searchTerm) => {
  if (!searchTerm.trim()) return languages;
  
  const term = searchTerm.toLowerCase();
  return languages.filter(lang => 
    lang.name.toLowerCase().includes(term) ||
    lang.code.toLowerCase().includes(term) ||
    lang.nativeName.toLowerCase().includes(term)
  );
}; 