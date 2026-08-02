import { useState, useCallback } from 'react';
import { getPersonalityAnalysis } from '../services/callService';

export interface PersonalityProfile {
  primaryType: 'D' | 'I' | 'S' | 'C';
  secondaryType: 'D' | 'I' | 'S' | 'C' | null;
  confidence: number;
  personalityIndicators: string[];
  recommendations: string[];
  approachStrategy: string;
  potentialObjections: string[];
  objectionHandling: string[];
  closingTechniques: string[];
  communicationStyle: string;
  emotionalTriggers: string[];
  riskFactors: string[];
  successIndicators: string[];
  timestamp: string;
}

export interface PersonalityAnalysisResponse {
  success: boolean;
  personalityProfile: PersonalityProfile;
  message: string;
}

export const usePersonalityAnalysis = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [personalityProfile, setPersonalityProfile] = useState<PersonalityProfile | null>(null);

  const analyzePersonality = useCallback(async (
    transcription: string, 
    context?: any[], 
    callDuration?: number
  ) => {
    setLoading(true);
    setError(null);

    try {
      const response: PersonalityAnalysisResponse = await getPersonalityAnalysis(
        transcription, 
        context, 
        callDuration
      );

      if (response.success) {
        setPersonalityProfile(response.personalityProfile);
        return response.personalityProfile;
      } else {
        throw new Error(response.message || 'Failed to analyze personality');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('Personality analysis error:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const clearAnalysis = useCallback(() => {
    setPersonalityProfile(null);
    setError(null);
  }, []);

  const getPersonalityTypeInfo = useCallback((type: 'D' | 'I' | 'S' | 'C') => {
    const typeInfo = {
      D: {
        title: 'Dominant',
        description: 'Direct & Results-focused',
        color: 'text-red-400',
        bgColor: 'bg-red-400/10',
        borderColor: 'border-red-400/30'
      },
      I: {
        title: 'Influential',
        description: 'People & Persuasion',
        color: 'text-yellow-400',
        bgColor: 'bg-yellow-400/10',
        borderColor: 'border-yellow-400/30'
      },
      S: {
        title: 'Steady',
        description: 'Stability & Support',
        color: 'text-green-400',
        bgColor: 'bg-green-400/10',
        borderColor: 'border-green-400/30'
      },
      C: {
        title: 'Conscientious',
        description: 'Quality & Analysis',
        color: 'text-harx-400',
        bgColor: 'bg-harx-400/10',
        borderColor: 'border-harx-400/30'
      }
    };

    return typeInfo[type];
  }, []);

  return {
    loading,
    error,
    personalityProfile,
    analyzePersonality,
    clearAnalysis,
    getPersonalityTypeInfo
  };
}; 
