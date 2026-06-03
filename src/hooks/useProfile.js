import { useState, useEffect } from 'react';
import * as profileApi from '../lib/api/profiles';

export const useProfile = (profileId) => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const data = await profileApi.getProfile(profileId);
        setProfile(data);
        setError(null);
      } catch (err) {
        console.error('Error fetching profile:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (profileId) {
      fetchProfile();
    } else {
      setLoading(false);
    }
  }, [profileId]);

  const createProfile = async (profileData) => {
    try {
      setLoading(true);
      const createdProfile = await profileApi.createProfile(profileData);
      setProfile(createdProfile);
      setError(null);
      return createdProfile;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateBasicInfo = async (id, basicInfo) => {
    try {
      setLoading(true);
      const updatedProfile = await profileApi.updateBasicInfo(id, basicInfo);
      setProfile(updatedProfile);
      setError(null);
      return updatedProfile;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateProfileData = async (id, profileData) => {
    try {
      setLoading(true);
      const updatedProfile = await profileApi.updateProfile(id, profileData);
      setProfile(updatedProfile);
      setError(null);
      return updatedProfile;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateExperience = async (id, experience) => {
    try {
      setLoading(true);
      const updatedProfile = await profileApi.updateExperience(id, experience);
      setProfile(updatedProfile);
      setError(null);
      return updatedProfile;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateSkills = async (id, skills) => {
    try {
      setLoading(true);
      const updatedProfile = await profileApi.updateSkills(id, skills);
      setProfile(updatedProfile);
      setError(null);
      return updatedProfile;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateLanguageAssessment = async (id, language, proficiency, results) => {
    try {
      setLoading(true);
      
      const updatedProfile = await profileApi.updateLanguageAssessment(id, {
        language,
        proficiency,
        results
      });
      
      console.log("Updated profile after language assessment:", updatedProfile);
      setProfile(updatedProfile);
      setError(null);
      
      return updatedProfile;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const addAssessment = async (id, assessment) => {
    try {
      setLoading(true);
      const updatedProfile = await profileApi.addAssessment(id, assessment);
      setProfile(updatedProfile);
      setError(null);
      return updatedProfile;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const deleteProfile = async (id) => {
    try {
      setLoading(true);
      await profileApi.deleteProfile(id);
      setProfile(null);
      setError(null);
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Add new function to the hook
  const addContactCenterAssessment = async (id, assessment) => {
    try {
      setLoading(true);
      // Send the assessment data directly since it's already in the correct format
      const updatedProfile = await profileApi.addContactCenterAssessment(id, assessment);
      setProfile(updatedProfile);
      setError(null);
      return updatedProfile;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    profile,
    loading,
    error,
    createProfile,
    updateBasicInfo,
    updateExperience,
    updateSkills,
    updateLanguageAssessment,
    updateProfileData,
    addAssessment,
    deleteProfile,
    addContactCenterAssessment
  };
};

export default useProfile;

