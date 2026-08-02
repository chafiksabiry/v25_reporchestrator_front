import { supabase } from './client';

export const createProfile = async (profileData) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No authenticated user');

    // Create main profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .insert({
        user_id: user.id,
        name: profileData.personalInfo.name,
        location: profileData.personalInfo.location,
        email: profileData.personalInfo.email,
        phone: profileData.personalInfo.phone,
        years_experience: profileData.professionalSummary.yearsOfExperience,
        current_role: profileData.professionalSummary.currentRole
      })
      .select()
      .single();

    if (profileError) throw profileError;

    // Insert languages
    if (profileData.personalInfo.languages?.length > 0) {
      const { error: languagesError } = await supabase
        .from('languages')
        .insert(
          profileData.personalInfo.languages.map(lang => ({
            profile_id: profile.id,
            language: lang.language,
            proficiency: lang.proficiency
          }))
        );
      if (languagesError) throw languagesError;
    }

    // Insert industries
    if (profileData.professionalSummary.industries?.length > 0) {
      const { error: industriesError } = await supabase
        .from('industries')
        .insert(
          profileData.professionalSummary.industries.map(industry => ({
            profile_id: profile.id,
            name: industry
          }))
        );
      if (industriesError) throw industriesError;
    }

    // Insert notable companies
    if (profileData.professionalSummary.notableCompanies?.length > 0) {
      const { error: companiesError } = await supabase
        .from('companies')
        .insert(
          profileData.professionalSummary.notableCompanies.map(company => ({
            profile_id: profile.id,
            name: company,
            is_notable: true
          }))
        );
      if (companiesError) throw companiesError;
    }

    // Insert experiences
    if (profileData.experience?.length > 0) {
      for (const exp of profileData.experience) {
        const { data: experience, error: expError } = await supabase
          .from('experiences')
          .insert({
            profile_id: profile.id,
            title: exp.title,
            company: exp.company,
            start_date: exp.startDate,
            end_date: exp.endDate,
            current: !exp.endDate
          })
          .select()
          .single();

        if (expError) throw expError;

        // Insert responsibilities
        if (exp.responsibilities?.length > 0) {
          const { error: respError } = await supabase
            .from('responsibilities')
            .insert(
              exp.responsibilities.map(resp => ({
                experience_id: experience.id,
                description: resp
              }))
            );
          if (respError) throw respError;
        }

        // Insert achievements
        if (exp.achievements?.length > 0) {
          const { error: achieveError } = await supabase
            .from('achievements')
            .insert(
              exp.achievements.map(achieve => ({
                experience_id: experience.id,
                description: achieve
              }))
            );
          if (achieveError) throw achieveError;
        }
      }
    }

    // Insert skills
    const allSkills = [
      ...profileData.skills.technical.map(skill => ({
        ...skill,
        category: 'technical'
      })),
      ...profileData.skills.professional.map(skill => ({
        ...skill,
        category: 'professional'
      })),
      ...profileData.skills.soft.map(skill => ({
        ...skill,
        category: 'soft'
      }))
    ];

    if (allSkills.length > 0) {
      const { error: skillsError } = await supabase
        .from('skills')
        .insert(
          allSkills.map(skill => ({
            profile_id: profile.id,
            name: typeof skill === 'string' ? skill : skill.skill,
            category: skill.category,
            level: typeof skill === 'string' ? 0 : skill.level,
            context: skill.context || null
          }))
        );
      if (skillsError) throw skillsError;
    }

    return profile;
  } catch (error) {
    console.error('Error creating profile:', error);
    throw error;
  }
};

export const getProfile = async (userId) => {
  try {
    // Get main profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select(`
        *,
        languages (*),
        industries (*),
        companies (*),
        experiences (
          *,
          responsibilities (*),
          achievements (*)
        ),
        skills (*)
      `)
      .eq('user_id', userId)
      .single();

    if (profileError) throw profileError;

    // Transform the data back to the frontend format
    return {
      personalInfo: {
        name: profile.name,
        location: profile.location,
        email: profile.email,
        phone: profile.phone,
        languages: profile.languages.map(lang => ({
          language: lang.language,
          proficiency: lang.proficiency
        }))
      },
      professionalSummary: {
        yearsOfExperience: profile.years_experience,
        currentRole: profile.current_role,
        industries: profile.industries.map(ind => ind.name),
        notableCompanies: profile.companies
          .filter(comp => comp.is_notable)
          .map(comp => comp.name)
      },
      experience: profile.experiences.map(exp => ({
        title: exp.title,
        company: exp.company,
        startDate: exp.start_date,
        endDate: exp.end_date,
        responsibilities: exp.responsibilities.map(resp => resp.description),
        achievements: exp.achievements.map(achieve => achieve.description)
      })),
      skills: {
        technical: profile.skills
          .filter(skill => skill.category === 'technical')
          .map(skill => ({
            skill: skill.name,
            level: skill.level,
            context: skill.context
          })),
        professional: profile.skills
          .filter(skill => skill.category === 'professional')
          .map(skill => ({
            skill: skill.name,
            level: skill.level,
            context: skill.context
          })),
        soft: profile.skills
          .filter(skill => skill.category === 'soft')
          .map(skill => ({
            skill: skill.name,
            level: skill.level,
            context: skill.context
          }))
      }
    };
  } catch (error) {
    console.error('Error getting profile:', error);
    throw error;
  }
};

export const updateProfile = async (profileId, profileData) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No authenticated user');

    // Update main profile
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        name: profileData.personalInfo.name,
        location: profileData.personalInfo.location,
        email: profileData.personalInfo.email,
        phone: profileData.personalInfo.phone,
        years_experience: profileData.professionalSummary.yearsOfExperience,
        current_role: profileData.professionalSummary.currentRole,
        updated_at: new Date().toISOString()
      })
      .eq('id', profileId)
      .eq('user_id', user.id);

    if (profileError) throw profileError;

    // Update languages (delete and insert)
    await supabase
      .from('languages')
      .delete()
      .eq('profile_id', profileId);

    if (profileData.personalInfo.languages?.length > 0) {
      await supabase
        .from('languages')
        .insert(
          profileData.personalInfo.languages.map(lang => ({
            profile_id: profileId,
            language: lang.language,
            proficiency: lang.proficiency
          }))
        );
    }

    // Update industries
    await supabase
      .from('industries')
      .delete()
      .eq('profile_id', profileId);

    if (profileData.professionalSummary.industries?.length > 0) {
      await supabase
        .from('industries')
        .insert(
          profileData.professionalSummary.industries.map(industry => ({
            profile_id: profileId,
            name: industry
          }))
        );
    }

    // Update companies
    await supabase
      .from('companies')
      .delete()
      .eq('profile_id', profileId);

    if (profileData.professionalSummary.notableCompanies?.length > 0) {
      await supabase
        .from('companies')
        .insert(
          profileData.professionalSummary.notableCompanies.map(company => ({
            profile_id: profileId,
            name: company,
            is_notable: true
          }))
        );
    }

    // Update experiences
    await supabase
      .from('experiences')
      .delete()
      .eq('profile_id', profileId);

    if (profileData.experience?.length > 0) {
      for (const exp of profileData.experience) {
        const { data: experience } = await supabase
          .from('experiences')
          .insert({
            profile_id: profileId,
            title: exp.title,
            company: exp.company,
            start_date: exp.startDate,
            end_date: exp.endDate,
            current: !exp.endDate
          })
          .select()
          .single();

        if (exp.responsibilities?.length > 0) {
          await supabase
            .from('responsibilities')
            .insert(
              exp.responsibilities.map(resp => ({
                experience_id: experience.id,
                description: resp
              }))
            );
        }

        if (exp.achievements?.length > 0) {
          await supabase
            .from('achievements')
            .insert(
              exp.achievements.map(achieve => ({
                experience_id: experience.id,
                description: achieve
              }))
            );
        }
      }
    }

    // Update skills
    await supabase
      .from('skills')
      .delete()
      .eq('profile_id', profileId);

    const allSkills = [
      ...profileData.skills.technical.map(skill => ({
        ...skill,
        category: 'technical'
      })),
      ...profileData.skills.professional.map(skill => ({
        ...skill,
        category: 'professional'
      })),
      ...profileData.skills.soft.map(skill => ({
        ...skill,
        category: 'soft'
      }))
    ];

    if (allSkills.length > 0) {
      await supabase
        .from('skills')
        .insert(
          allSkills.map(skill => ({
            profile_id: profileId,
            name: typeof skill === 'string' ? skill : skill.skill,
            category: skill.category,
            level: typeof skill === 'string' ? 0 : skill.level,
            context: skill.context || null
          }))
        );
    }

    return true;
  } catch (error) {
    console.error('Error updating profile:', error);
    throw error;
  }
};

export const deleteProfile = async (profileId) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No authenticated user');

    const { error } = await supabase
      .from('profiles')
      .delete()
      .eq('id', profileId)
      .eq('user_id', user.id);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting profile:', error);
    throw error;
  }
};