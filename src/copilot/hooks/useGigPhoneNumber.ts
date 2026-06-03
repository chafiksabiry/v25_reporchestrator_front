import { useState, useCallback } from 'react';
import { PhoneNumberService, PhoneNumberResponse, VoiceConfigResponse } from '../services/phoneNumberService';
import { useCallStorage } from './useCallStorage';

interface UseGigPhoneNumberResult {
  checkPhoneNumber: () => Promise<PhoneNumberResponse | null>;
  configureVoiceFeature: (phoneNumber: string) => Promise<boolean>;
  isLoading: boolean;
  error: string | null;
  phoneNumberData: PhoneNumberResponse | null;
}

export const useGigPhoneNumber = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [phoneNumberData, setPhoneNumberData] = useState<PhoneNumberResponse | null>(null);
  const { getGigIdFromCookie } = useCallStorage();

  const checkPhoneNumber = useCallback(async (): Promise<PhoneNumberResponse | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const gigId = getGigIdFromCookie();
      console.log('🔍 Checking gig phone number with gigId:', gigId);
      
      if (!gigId) {
        console.error('❌ No gig ID found in cookies');
        throw new Error('No gig ID found');
      }

      const response = await PhoneNumberService.checkGigPhoneNumber(gigId);
      console.log('✅ Phone number check response:', response);
      
      // If we have an array of numbers, pick one randomly
      if (response.hasNumber && response.numbers && response.numbers.length > 0) {
        const randomIndex = Math.floor(Math.random() * response.numbers.length);
        const randomNum = response.numbers[randomIndex];
        console.log(`🎲 Picked random number at index ${randomIndex}:`, randomNum.phoneNumber);
        
        // Structure the response so the rest of the app just sees 'number'
        const structuredResponse: PhoneNumberResponse = {
          hasNumber: true,
          number: randomNum,
          message: response.message
        };
        setPhoneNumberData(structuredResponse);
        return structuredResponse;
      } else if (response.hasNumber && response.number) {
        // Fallback if the backend somehow returns the old format
        setPhoneNumberData(response);
        return response;
      }
      
      setPhoneNumberData(response);
      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to check phone number';
      setError(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [getGigIdFromCookie]);

  const configureVoiceFeature = useCallback(async (number: PhoneNumberResponse['number']): Promise<boolean> => {
    if (!number || number.status != 'success') {
      console.error('❌ Cannot configure voice: number status is not success');
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await PhoneNumberService.configureVoiceFeature(number.phoneNumber);

      if (response.success) {
        console.log('✅ Voice feature configured successfully');
        return true;
      }

      throw new Error(response.message || 'Failed to configure voice feature');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to configure voice feature';
      setError(errorMessage);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    checkPhoneNumber,
    configureVoiceFeature,
    isLoading,
    error,
    phoneNumberData
  };
};

