import { useEffect } from 'react';
import { useAgent } from '../contexts/AgentContext';
import { TransactionGoal, ReadinessSignal, TransactionIntelligence, Recommendation } from '../types';

export function useTransactionTargeting() {
  const { state, dispatch } = useAgent();

  // Predefined transaction goals based on call context
  const TRANSACTION_GOALS: TransactionGoal[] = [
    {
      id: 'close-sale',
      type: 'sale',
      title: 'Close Investment Sale',
      description: 'Convert prospect to paying customer with investment product',
      priority: 'high',
      targetValue: 50000,
      requirements: ['Budget qualification', 'Risk tolerance assessment', 'Product fit confirmation'],
      successCriteria: ['Signed agreement', 'Initial deposit', 'Account setup']
    },
    {
      id: 'schedule-appointment',
      type: 'appointment',
      title: 'Schedule Follow-up Meeting',
      description: 'Book qualified prospect for detailed consultation',
      priority: 'medium',
      requirements: ['Interest confirmation', 'Calendar availability', 'Contact information'],
      successCriteria: ['Confirmed appointment', 'Calendar invite sent', 'Preparation materials shared']
    },
    {
      id: 'collect-feedback',
      type: 'feedback',
      title: 'Gather Customer Feedback',
      description: 'Collect detailed feedback on service experience',
      priority: 'medium',
      requirements: ['Service completion', 'Customer availability', 'Feedback framework'],
      successCriteria: ['Completed survey', 'Detailed comments', 'Satisfaction rating']
    },
    {
      id: 'confirm-renewal',
      type: 'renewal',
      title: 'Confirm Service Renewal',
      description: 'Secure renewal of existing service contract',
      priority: 'high',
      targetValue: 25000,
      requirements: ['Contract review', 'Satisfaction confirmation', 'Updated terms'],
      successCriteria: ['Signed renewal', 'Payment confirmation', 'Service continuation']
    }
  ];

  // Detect transaction goal based on call context and conversation
  const detectTransactionGoal = (transcript: string, methodology?: any) => {
    const lowerTranscript = transcript.toLowerCase();
    
    // Sales indicators
    if (lowerTranscript.includes('buy') || lowerTranscript.includes('invest') || 
        lowerTranscript.includes('purchase') || methodology?.type === 'sales') {
      return TRANSACTION_GOALS.find(g => g.id === 'close-sale');
    }
    
    // Appointment indicators
    if (lowerTranscript.includes('schedule') || lowerTranscript.includes('meeting') || 
        lowerTranscript.includes('appointment') || lowerTranscript.includes('follow up')) {
      return TRANSACTION_GOALS.find(g => g.id === 'schedule-appointment');
    }
    
    // Renewal indicators
    if (lowerTranscript.includes('renewal') || lowerTranscript.includes('contract') || 
        lowerTranscript.includes('continue') || lowerTranscript.includes('extend')) {
      return TRANSACTION_GOALS.find(g => g.id === 'confirm-renewal');
    }
    
    // Feedback indicators
    if (lowerTranscript.includes('feedback') || lowerTranscript.includes('survey') || 
        lowerTranscript.includes('experience') || lowerTranscript.includes('satisfaction')) {
      return TRANSACTION_GOALS.find(g => g.id === 'collect-feedback');
    }

    // Default to appointment scheduling for unclear cases
    return TRANSACTION_GOALS.find(g => g.id === 'schedule-appointment');
  };

  // Analyze readiness signals from conversation
  const analyzeReadinessSignals = (transcript: any[], personalityProfile?: any) => {
    const signals: ReadinessSignal[] = [];
    const recentEntries = transcript.slice(-5); // Last 5 entries

    recentEntries.forEach(entry => {
      const text = entry.text.toLowerCase();
      const timestamp = entry.timestamp;

      // Positive verbal signals
      if (text.includes('interested') || text.includes('sounds good') || text.includes('yes')) {
        signals.push({
          id: `signal-${Date.now()}-${Math.random()}`,
          type: 'positive',
          category: 'verbal',
          signal: 'Expressed interest or agreement',
          description: `Customer said: "${entry.text}"`,
          weight: 15,
          timestamp
        });
      }

      // Negative verbal signals
      if (text.includes('not sure') || text.includes('maybe later') || text.includes('think about it')) {
        signals.push({
          id: `signal-${Date.now()}-${Math.random()}`,
          type: 'negative',
          category: 'verbal',
          signal: 'Expressed hesitation or delay',
          description: `Customer said: "${entry.text}"`,
          weight: -10,
          timestamp
        });
      }

      // Question signals (neutral to positive)
      if (text.includes('how much') || text.includes('when') || text.includes('what if')) {
        signals.push({
          id: `signal-${Date.now()}-${Math.random()}`,
          type: 'positive',
          category: 'behavioral',
          signal: 'Asked detailed questions',
          description: 'Customer seeking specific information',
          weight: 12,
          timestamp
        });
      }

      // Emotional signals based on sentiment
      if (entry.sentiment === 'positive') {
        signals.push({
          id: `signal-${Date.now()}-${Math.random()}`,
          type: 'positive',
          category: 'emotional',
          signal: 'Positive emotional tone',
          description: 'Customer showing positive sentiment',
          weight: 8,
          timestamp
        });
      } else if (entry.sentiment === 'negative') {
        signals.push({
          id: `signal-${Date.now()}-${Math.random()}`,
          type: 'negative',
          category: 'emotional',
          signal: 'Negative emotional tone',
          description: 'Customer showing negative sentiment',
          weight: -8,
          timestamp
        });
      }

      // Urgency signals
      if (text.includes('soon') || text.includes('quickly') || text.includes('asap')) {
        signals.push({
          id: `signal-${Date.now()}-${Math.random()}`,
          type: 'positive',
          category: 'contextual',
          signal: 'Expressed urgency',
          description: 'Customer indicated time sensitivity',
          weight: 20,
          timestamp
        });
      }
    });

    return signals;
  };

  // Calculate transaction score based on various factors
  const calculateTransactionScore = (
    signals: ReadinessSignal[], 
    barriers: string[], 
    opportunities: string[],
    callDuration: number,
    methodology?: any
  ) => {
    let baseScore = 30; // Starting baseline

    // Add signal weights
    const signalScore = signals.reduce((sum, signal) => sum + signal.weight, 0);
    baseScore += signalScore;

    // Methodology phase bonus
    if (methodology?.currentPhase) {
      const phaseBonus = {
        'attention': 5,
        'interest': 15,
        'desire': 25,
        'action': 35,
        'situation': 10,
        'problem': 20,
        'implication': 30,
        'need-payoff': 40
      };
      baseScore += phaseBonus[methodology.currentPhase.id] || 0;
    }

    // Call duration factor (sweet spot around 10-20 minutes)
    const durationMinutes = callDuration / 60000;
    if (durationMinutes > 5 && durationMinutes < 30) {
      baseScore += Math.min(10, durationMinutes - 5);
    }

    // Barrier penalties
    baseScore -= barriers.length * 5;

    // Opportunity bonuses
    baseScore += opportunities.length * 8;

    // Ensure score stays within 0-100 range
    return Math.max(0, Math.min(100, baseScore));
  };

  // Generate next best actions based on current state
  const generateNextBestActions = (
    score: number, 
    goal?: TransactionGoal, 
    methodology?: any,
    barriers: string[] = [],
    opportunities: string[] = []
  ) => {
    const actions: string[] = [];

    if (!goal) return actions;

    // Score-based actions
    if (score >= 80) {
      actions.push(`Proceed with ${goal.type} - high success probability`);
      actions.push('Present clear call-to-action');
      actions.push('Address any final concerns');
    } else if (score >= 60) {
      actions.push('Build more value before proceeding');
      actions.push('Address remaining objections');
      actions.push('Strengthen emotional connection');
    } else if (score >= 40) {
      actions.push('Focus on needs discovery');
      actions.push('Build rapport and trust');
      actions.push('Identify key pain points');
    } else {
      actions.push('Restart with different approach');
      actions.push('Focus on relationship building');
      actions.push('Consider alternative goals');
    }

    // Methodology-specific actions
    if (methodology?.currentPhase) {
      const phaseActions = {
        'attention': ['Establish credibility', 'Create initial interest'],
        'interest': ['Demonstrate value', 'Ask discovery questions'],
        'desire': ['Create emotional connection', 'Build urgency'],
        'action': ['Present clear next steps', 'Handle final objections']
      };
      
      const currentActions = phaseActions[methodology.currentPhase.id];
      if (currentActions) {
        actions.push(...currentActions);
      }
    }

    // Barrier-specific actions
    if (barriers.includes('Budget concerns')) {
      actions.push('Discuss ROI and value proposition');
    }
    if (barriers.includes('Decision maker not present')) {
      actions.push('Identify and involve decision maker');
    }

    return actions.slice(0, 5); // Limit to top 5 actions
  };

  // Determine optimal timing for transaction attempt
  const determineOptimalTiming = (
    score: number,
    signals: ReadinessSignal[],
    methodology?: any,
    barriers: string[] = []
  ) => {
    const recentPositiveSignals = signals.filter(s => 
      s.type === 'positive' && 
      Date.now() - s.timestamp.getTime() < 120000 // Last 2 minutes
    ).length;

    const recentNegativeSignals = signals.filter(s => 
      s.type === 'negative' && 
      Date.now() - s.timestamp.getTime() < 120000
    ).length;

    // High score and recent positive signals
    if (score >= 75 && recentPositiveSignals > recentNegativeSignals) {
      return {
        shouldProceed: true,
        reason: 'High success probability with recent positive signals'
      };
    }

    // Good score but recent negative signals
    if (score >= 60 && recentNegativeSignals > 0) {
      return {
        shouldProceed: false,
        reason: 'Address recent concerns before proceeding',
        suggestedDelay: 3
      };
    }

    // Methodology-based timing
    if (methodology?.currentPhase?.id === 'action' || methodology?.currentPhase?.id === 'need-payoff') {
      return {
        shouldProceed: score >= 50,
        reason: score >= 50 ? 'In closing phase with adequate score' : 'Score too low for closing phase'
      };
    }

    // Major barriers present
    if (barriers.length > 2) {
      return {
        shouldProceed: false,
        reason: 'Too many barriers - address concerns first',
        suggestedDelay: 5
      };
    }

    // Default logic
    return {
      shouldProceed: score >= 70,
      reason: score >= 70 ? 'Score indicates good timing' : 'Build more value before proceeding'
    };
  };

  // Generate transaction-focused recommendations
  const generateTransactionRecommendations = (intelligence: TransactionIntelligence) => {
    const recommendations: Recommendation[] = [];

    // High-priority timing recommendation
    if (intelligence.optimalTiming.shouldProceed && intelligence.currentScore >= 75) {
      recommendations.push({
        id: `transaction-timing-${Date.now()}`,
        type: 'transaction',
        priority: 'critical',
        title: 'Optimal Transaction Timing',
        message: `Success probability is ${Math.round(intelligence.currentScore)}%. ${intelligence.optimalTiming.reason}`,
        suggestedResponse: intelligence.goal?.type === 'sale' ? 
          "Based on our conversation, I believe this solution is perfect for you. Shall we move forward?" :
          "I think we've covered everything you need. Would you like to proceed with the next step?",
        timestamp: new Date()
      });
    }

    // Barrier-specific recommendations
    intelligence.barriers.forEach(barrier => {
      if (barrier.includes('Budget')) {
        recommendations.push({
          id: `barrier-budget-${Date.now()}`,
          type: 'transaction',
          priority: 'high',
          title: 'Address Budget Concerns',
          message: 'Customer has budget concerns. Focus on ROI and value.',
          suggestedResponse: "I understand budget is important. Let me show you the return on investment you can expect...",
          timestamp: new Date()
        });
      }
    });

    // Opportunity-based recommendations
    intelligence.opportunities.forEach(opportunity => {
      if (opportunity.includes('Urgency')) {
        recommendations.push({
          id: `opportunity-urgency-${Date.now()}`,
          type: 'transaction',
          priority: 'medium',
          title: 'Leverage Urgency',
          message: 'Customer expressed urgency. Use this to accelerate decision.',
          suggestedResponse: "Since timing is important to you, I can expedite the process if we move forward today.",
          timestamp: new Date()
        });
      }
    });

    return recommendations;
  };

  // Main transaction intelligence update
  const updateTransactionIntelligence = () => {
    if (!state.callState.isActive) return;

    const fullTranscript = state.transcript.map(entry => entry.text).join(' ');
    const goal = state.transactionIntelligence.goal || 
                 detectTransactionGoal(fullTranscript, state.callStructureGuidance.currentMethodology);

    const signals = analyzeReadinessSignals(state.transcript, state.personalityProfile);
    
    // Mock barriers and opportunities (in real implementation, these would be AI-detected)
    const barriers = [
      ...(state.transcript.some(t => t.text.toLowerCase().includes('expensive')) ? ['Budget concerns'] : []),
      ...(state.transcript.some(t => t.text.toLowerCase().includes('think about')) ? ['Needs more time'] : []),
      ...(state.transcript.some(t => t.text.toLowerCase().includes('spouse')) ? ['Decision maker not present'] : [])
    ];

    const opportunities = [
      ...(state.transcript.some(t => t.text.toLowerCase().includes('soon')) ? ['Urgency expressed'] : []),
      ...(state.transcript.some(t => t.text.toLowerCase().includes('perfect')) ? ['Strong product fit'] : []),
      ...(state.personalityProfile?.type === 'D' ? ['Direct personality - likes quick decisions'] : [])
    ];

    const score = calculateTransactionScore(
      signals, 
      barriers, 
      opportunities, 
      state.callMetrics.duration,
      state.callStructureGuidance
    );

    const nextBestActions = generateNextBestActions(
      score, 
      goal, 
      state.callStructureGuidance,
      barriers,
      opportunities
    );

    const optimalTiming = determineOptimalTiming(
      score,
      signals,
      state.callStructureGuidance,
      barriers
    );

    const progressToGoal = goal ? Math.min(score, 
      (state.callStructureGuidance.completedObjectives.length / 
       (goal.requirements.length || 1)) * 100
    ) : 0;

    const intelligence: TransactionIntelligence = {
      goal,
      currentScore: score,
      readinessSignals: [...state.transactionIntelligence.readinessSignals, ...signals].slice(-20), // Keep last 20
      barriers,
      opportunities,
      nextBestActions,
      optimalTiming,
      progressToGoal,
      riskFactors: barriers.map(b => `Risk: ${b}`),
      confidenceLevel: Math.min(95, 60 + (state.transcript.length * 2)) // Confidence grows with data
    };

    dispatch({ type: 'UPDATE_TRANSACTION_INTELLIGENCE', intelligence });

    // Generate transaction-focused recommendations
    const recommendations = generateTransactionRecommendations(intelligence);
    recommendations.forEach(rec => {
      dispatch({ type: 'ADD_RECOMMENDATION', recommendation: rec });
    });
  };

  // Set initial transaction goal when call starts
  useEffect(() => {
    if (state.callState.isActive && !state.transactionIntelligence.goal && state.transcript.length > 0) {
      const fullTranscript = state.transcript.map(entry => entry.text).join(' ');
      const detectedGoal = detectTransactionGoal(fullTranscript, state.callStructureGuidance.currentMethodology);
      
      if (detectedGoal) {
        dispatch({ type: 'SET_TRANSACTION_GOAL', goal: detectedGoal });
      }
    }
  }, [state.callState.isActive, state.transcript.length]);

  // Update transaction intelligence periodically
  useEffect(() => {
    if (!state.callState.isActive) return;

    const interval = setInterval(() => {
      updateTransactionIntelligence();
    }, 5000); // Every 5 seconds

    return () => clearInterval(interval);
  }, [state.callState.isActive, state.transcript, state.personalityProfile, state.callStructureGuidance]);

  return {
    transactionGoals: TRANSACTION_GOALS,
    setTransactionGoal: (goal: TransactionGoal) => dispatch({ type: 'SET_TRANSACTION_GOAL', goal }),
    updateTransactionIntelligence
  };
}
