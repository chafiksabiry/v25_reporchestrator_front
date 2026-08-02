import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import ContactCenterAssessment from '../ContactCenterAssessment';
import { useAssessment } from '../../../contexts/AssessmentContext';
import { isAuthenticated, returnToParentApp } from '../../../utils/assessmentAuthUtils';

function ContactCenterAssessmentPage() {
  const { skillId } = useParams();
  const { contactCenterSkills, setCurrentAssessmentType } = useAssessment();

  // Find the skill category based on skillId or query parameter
  const findSkillCategory = () => {
    const queryParams = new URLSearchParams(window.location.search);
    const queryCategory = queryParams.get('cat');

    for (const categoryGroup of contactCenterSkills) {
      const foundSkill = categoryGroup.skills.find(skill => skill.id === skillId);
      if (foundSkill) {
        return {
          category: queryCategory || categoryGroup.category,
          skill: foundSkill
        };
      }
    }

    return {
      category: queryCategory || 'Unknown',
      skill: { id: skillId, name: formatSkillName(skillId) }
    };
  };

  // Helper function to format skill name (copy from ContactCenterAssessment if needed or just use simple logic)
  function formatSkillName(id) {
    if (!id) return 'Unknown';
    return id.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  }

  const { category, skill } = findSkillCategory();

  // Set current assessment type and check authentication
  useEffect(() => {
    setCurrentAssessmentType('contact-center');

    // Check if the user is authenticated
    if (!isAuthenticated() && import.meta.env.VITE_RUN_MODE !== 'standalone') {
      console.warn('No authentication data found. Using demo mode.');
      // You can add logic to redirect to login here if needed
    }
  }, [setCurrentAssessmentType]);

  const handleComplete = (results) => {
    console.log('Assessment completed:', results);

    // Navigate back to parent app after completion
    returnToParentApp();
  };

  return (
    <div className="py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="glass-card rounded-[2.5rem] overflow-hidden transition-all duration-500 hover:shadow-harx-500/20 shadow-2xl">
          <div className="bg-gradient-harx px-10 py-8 flex justify-between items-center relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-16 -mt-16"></div>
            <h1 className="text-3xl font-black text-white tracking-widest uppercase relative z-10">
              {category}: {skill.name} Assessment
            </h1>
              <button
                onClick={returnToParentApp}
                className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-2xl backdrop-blur-md transition-all border border-white/20 font-black uppercase tracking-widest text-[10px] relative z-10 active:scale-95"
              >
                Exit
              </button>
          </div>

          <div className="p-6">
            <ContactCenterAssessment
              skillId={skillId}
              category={category}
              skillName={skill.name}
              onComplete={handleComplete}
              onExit={returnToParentApp}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default ContactCenterAssessmentPage; 

