import React, { useEffect, useState } from 'react';
import { CreditCard, Check, X, ArrowLeft, Loader } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getAgentPlan, updateAgentPlan } from '../services/apiConfig';
import config from '../config';
import progressService from '../services/progressService';
import { toast, Toaster } from 'react-hot-toast';

interface Plan {
  id: string;
  name: string;
  price: string;
  isActive: boolean;
  features: string[];
}

function Subscription() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPlan, setCurrentPlan] = useState<any>(null);
  const [activatingPlanId, setActivatingPlanId] = useState<string | null>(null);
  const [isPhaseCompleted, setIsPhaseCompleted] = useState(false);

  const FREEMIUM_PLAN_ID = '6834527a7363ae062887a4ec';
  
  const plans: Plan[] = [
    {
      id: FREEMIUM_PLAN_ID,
      name: 'Freemium',
      price: '$0',
      isActive: true,
      features: [
        'Access to basic REPS platform features',
        'Limited marketplace access',
        'Basic skills assessment',
        'Standard support',
        'Personal profile',
        'Basic wallet functionality'
      ]
    },
    {
      id: 'growth',
      name: 'Growth',
      price: '$29',
      isActive: false,
      features: [
        'Everything in Freemium, plus:',
        'Full marketplace access',
        'Advanced skills assessments',
        'Priority support',
        'Enhanced wallet features',
        'Performance analytics',
        'Custom career tracking'
      ]
    },
    {
      id: 'pro',
      name: 'Pro',
      price: '$79',
      isActive: false,
      features: [
        'Everything in Growth, plus:',
        'Enterprise-level access',
        'Dedicated account manager',
        'Custom integrations',
        'Advanced analytics',
        'Team collaboration tools',
        'API access',
        'White-label options'
      ]
    }
  ];

  useEffect(() => {
    const initializeComponent = async () => {
      try {
        setLoading(true);
        
        // Check if Phase 4 is already completed
        const userProgress = await progressService.getUserProgress();
        const isCompleted = userProgress.completedPhaseIds.includes(4);
        setIsPhaseCompleted(isCompleted);
        console.log('🔍 Phase 4 - Initial status check:', {
          isCompleted,
          currentPhase: userProgress.inProgressPhaseId,
          completedPhases: userProgress.completedPhaseIds
        });

        // Fetch current plan
        const userData = config.getUserData();
        const planData = await getAgentPlan(userData.agentId);
        setCurrentPlan(planData.plan || {});
        console.log('🔍 Phase 4 - Current plan data:', {
          hasPlan: !!planData.plan?._id,
          planId: planData.plan?._id || 'No plan'
        });

        // If not completed, mark the "Review plans" action as completed
        if (!isCompleted) {
          try {
            console.log('📝 Phase 4 - Checking phase status for "Review plans" action');
            
            // Ensure phase is in progress
            if (!userProgress.completedPhaseIds.includes(4) && 
                userProgress.inProgressPhaseId !== 4) {
              console.log('📝 Phase 4 - Setting phase to in-progress');
              await progressService.updatePhaseStatus(4, 'in-progress');
            }
            
            // Mark "Review plans" action as completed (index 0)
            console.log('📝 Phase 4 - Marking "Review plans" action as completed');
            await progressService.syncPhaseProgress(4, 2, 0); // 2 required, 0 optional
            
            // Get updated progress to confirm
            const updatedProgress = await progressService.getUserProgress();
            console.log('✅ Phase 4 - Progress after marking review action:', {
              phase4Actions: updatedProgress.completedActions[4] || [],
              phaseStatus: updatedProgress.completedPhaseIds.includes(4) ? 'completed' : 'in-progress'
            });
          } catch (err) {
            console.error('❌ Phase 4 - Error updating review plans action:', err);
          }
        }
      } catch (err) {
        console.error('❌ Phase 4 - Error in initialization:', err);
        setError('Failed to load subscription information');
      } finally {
        setLoading(false);
      }
    };

    initializeComponent();
  }, []);

  const handlePlanSelection = async (planId: string) => {
    try {
      setActivatingPlanId(planId);
      const userData = config.getUserData();
      
      console.log('📝 Phase 4 - Attempting plan activation:', {
        planId,
        agentId: userData.agentId
      });

      const response = await updateAgentPlan(userData.agentId, planId);
      console.log('🔍 Phase 4 - Plan activation response:', response);

      if (response && response.plan) {
        setCurrentPlan({ _id: planId });
        
        try {
          console.log('📝 Phase 4 - Plan activated, marking phase as completed');
          
          // Get current progress before update
          const beforeProgress = await progressService.getUserProgress();
          console.log('🔍 Phase 4 - Progress before completion:', {
            completedActions: beforeProgress.completedActions[4] || [],
            phaseStatus: beforeProgress.completedPhaseIds.includes(4) ? 'completed' : 'in-progress'
          });

          // Mark the phase as completed since both actions are now done
          await progressService.updatePhaseStatus(4, 'completed');
          setIsPhaseCompleted(true);

          // Get updated progress to confirm
          const afterProgress = await progressService.getUserProgress();
          console.log('✅ Phase 4 - Final progress after completion:', {
            completedActions: afterProgress.completedActions[4] || [],
            phaseStatus: afterProgress.completedPhaseIds.includes(4) ? 'completed' : 'in-progress',
            allCompletedPhases: afterProgress.completedPhaseIds
          });

          // Show success message
          toast.success('Freemium plan activated successfully!');

          // Navigate back to dashboard after a short delay
          setTimeout(() => {
            console.log('➡️ Phase 4 - Navigating back to dashboard');
            navigate('/');
          }, 1500);

        } catch (err) {
          console.error('❌ Phase 4 - Error marking phase as completed:', err);
          // Don't show error toast here as the plan was successfully activated
          // Just log the error for debugging
        }
      } else {
        console.warn('⚠️ Phase 4 - Plan activation response invalid:', response);
        toast.error('Error activating plan. Please try again.');
      }
    } catch (err) {
      console.error('❌ Phase 4 - Error in plan activation:', err);
      toast.error('Failed to activate plan. Please try again.');
      setError('Failed to activate plan. Please try again.');
    } finally {
      setActivatingPlanId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <Toaster position="top-right" />
      
      <button 
        onClick={() => navigate('/')}
        className="flex items-center text-gray-600 hover:text-gray-900 mb-4 transition-colors"
      >
        <ArrowLeft className="w-5 h-5 mr-2" />
        Back to Dashboard
      </button>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-md">
          {error}
        </div>
      )}

      <div className="bg-white shadow-sm rounded-lg p-6">
        <div className="flex items-center mb-6">
          <CreditCard className="w-8 h-8 text-blue-600 mr-3" />
          <h2 className="text-2xl font-bold text-gray-900">Choose Your Plan</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan, index) => {
            const isCurrentPlan = currentPlan?._id === plan.id;
            const isActivating = activatingPlanId === plan.id;
            
            return (
              <div 
                key={index} 
                className={`border rounded-lg p-6 ${
                  plan.isActive 
                    ? 'bg-blue-50 border-blue-200' 
                    : 'bg-gray-50 border-gray-200 opacity-75'
                }`}
              >
                <div className="text-center mb-6">
                  <h3 className="text-xl font-semibold">{plan.name}</h3>
                  <div className="mt-2">
                    <span className="text-3xl font-bold text-blue-600">{plan.price}</span>
                    <span className="text-gray-600">/month</span>
                  </div>
                </div>

                <div className="space-y-3 mb-6">
                  {plan.features.map((feature, featureIndex) => (
                    <div key={featureIndex} className="flex items-start">
                      <Check className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700 text-sm">{feature}</span>
                    </div>
                  ))}
                </div>

                <button 
                  onClick={() => plan.isActive && !isCurrentPlan && handlePlanSelection(plan.id)}
                  className={`w-full py-2 px-4 rounded-md transition-colors ${
                    !plan.isActive
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : isCurrentPlan
                      ? 'bg-green-600 text-white cursor-default'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                  disabled={!plan.isActive || isCurrentPlan || isActivating}
                >
                  {isActivating ? (
                    <span className="flex items-center justify-center">
                      <Loader className="w-4 h-4 animate-spin mr-2" />
                      Activating...
                    </span>
                  ) : isCurrentPlan ? (
                    'Already Activated'
                  ) : !plan.isActive ? (
                    'Coming Soon'
                  ) : (
                    'Select Plan'
                  )}
                </button>
                {!plan.isActive && (
                  <p className="text-sm text-gray-500 text-center mt-2">
                    This plan is currently unavailable
                  </p>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-8 bg-gray-50 rounded-lg p-4 text-center text-gray-600 text-sm">
          <p>Need help choosing the right plan? Contact our support team for guidance.</p>
        </div>
      </div>
    </div>
  );
}

export default Subscription;