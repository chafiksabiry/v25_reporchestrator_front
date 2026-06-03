import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import LanguageAssessmentPage from '../components/assessments/pages/LanguageAssessmentPage';
import ContactCenterAssessmentPage from '../components/assessments/pages/ContactCenterAssessmentPage';
import { AssessmentProvider } from '../contexts/AssessmentContext';
import ProtectedRoute from '../components/assessments/ProtectedRoute';
import TopBar from '../components/assessments/TopBar';
import { initializeAuth } from '../utils/assessmentAuthUtils';

export default function AssessmentRoutes() {
  useEffect(() => {
    initializeAuth();
  }, []);

  return (
    <AssessmentProvider>
      <ProtectedRoute>
        <div className="min-h-screen bg-premium-gradient relative overflow-hidden flex flex-col">
          <div className="absolute inset-0 bg-mesh-gradient opacity-60 pointer-events-none" />
          <TopBar />
          <div className="flex-1 relative z-10">
            <Routes>
              <Route path="language" element={<LanguageAssessmentPage />} />
              <Route path="contact-center/:skillId" element={<ContactCenterAssessmentPage />} />
              <Route index element={<Navigate to="language?lang=English&code=en" replace />} />
              <Route path="*" element={<Navigate to="language?lang=English&code=en" replace />} />
            </Routes>
          </div>
        </div>
      </ProtectedRoute>
    </AssessmentProvider>
  );
}
