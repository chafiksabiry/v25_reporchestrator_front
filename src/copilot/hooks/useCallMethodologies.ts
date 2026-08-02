import { useEffect } from 'react';
import { useAgent } from '../contexts/AgentContext';
import { CallMethodology, MethodologyPhase, Recommendation } from '../types';

// REPS Call Flow Methodology
const REPS_METHODOLOGY: CallMethodology = {
  id: 'reps-flow',
  name: 'REPS Call Flow',
  type: 'sales',
  description: 'Complete REPS call methodology with 9 structured phases',
  triggers: ['sales', 'outbound', 'lead', 'prospect'],
  phases: [
    {
      id: 'context-preparation',
      name: 'Context & Preparation',
      description: 'Discover client info, set call objective, check script and tools',
      objectives: [
        'Review client information and history',
        'Set clear call objective (sale, support, follow-up)',
        'Prepare scripts and tools',
        'Verify contact information'
      ],
      keyQuestions: [
        'What is the primary objective for this call?',
        'What do we know about this client?',
        'What tools and resources do I need?'
      ],
      suggestedPhrases: [
        'Let me review the client file before we begin',
        'I have all the necessary information prepared',
        'The call objective is clearly defined'
      ],
      transitionTriggers: ['preparation complete', 'call initiated'],
      duration: 2,
      required: true
    },
    {
      id: 'sbam-opening',
      name: 'SBAM & Opening',
      description: 'Smile, greet, thank the person; Introduce yourself; State reason for call; mention recording',
      objectives: [
        'Smile and greet warmly',
        'Thank the person for their time',
        'Introduce yourself professionally',
        'State the reason for the call',
        'Mention call recording for quality'
      ],
      keyQuestions: [
        'How are you doing today?',
        'Do you have a few minutes to speak?',
        'Is this a good time for you?'
      ],
      suggestedPhrases: [
        'Good [morning/afternoon], [Name]. Thank you for taking my call.',
        'My name is [Agent Name] from [Company].',
        'I\'m calling today to discuss [reason].',
        'Please note this call may be recorded for quality purposes.'
      ],
      transitionTriggers: ['greeting acknowledged', 'rapport established'],
      duration: 3,
      required: true
    },
    {
      id: 'legal-compliance',
      name: 'Legal & Compliance',
      description: 'Verify identity if needed; Request consent; Ensure duty of information',
      objectives: [
        'Verify customer identity if required',
        'Request or confirm consent for recording',
        'Confirm consent for commercial offer',
        'Ensure duty of information is respected',
        'Document compliance requirements'
      ],
      keyQuestions: [
        'Can you confirm your full name and date of birth?',
        'Do you consent to this call being recorded?',
        'Are you happy to receive information about our products?'
      ],
      suggestedPhrases: [
        'For security purposes, can you confirm...',
        'Do I have your permission to record this call?',
        'Are you happy to hear about solutions that might help you?',
        'I need to ensure we comply with all regulations.'
      ],
      transitionTriggers: ['identity verified', 'consent obtained'],
      duration: 2,
      required: true
    },
    {
      id: 'need-discovery',
      name: 'Need Discovery',
      description: 'Ask open-ended questions; Listen actively; Suggest reformulations',
      objectives: [
        'Ask open-ended discovery questions',
        'Listen actively to responses',
        'Suggest reformulations for clarity',
        'Identify pain points and needs',
        'Understand current situation'
      ],
      keyQuestions: [
        'Can you tell me about your current situation with [area]?',
        'What challenges are you facing?',
        'What would an ideal solution look like for you?',
        'How is this impacting your [business/life]?'
      ],
      suggestedPhrases: [
        'Help me understand your current situation...',
        'What I\'m hearing is..., is that correct?',
        'So if I understand correctly...',
        'That\'s really interesting, tell me more about...'
      ],
      transitionTriggers: ['needs identified', 'pain points clear'],
      duration: 8,
      required: true
    },
    {
      id: 'value-proposition',
      name: 'Value Proposition',
      description: 'Match needs with solution; Propose offer in clear terms; Justify with client references',
      objectives: [
        'Match identified needs with appropriate solution',
        'Present offer in clear, client-oriented terms',
        'Justify recommendation with client references',
        'Demonstrate clear value and benefits',
        'Connect solution to specific pain points'
      ],
      keyQuestions: [
        'How does this solution address your specific needs?',
        'Can you see how this would solve your [challenge]?',
        'What questions do you have about this approach?'
      ],
      suggestedPhrases: [
        'Based on what you\'ve shared about [need]...',
        'This solution directly addresses your concern about...',
        'Other clients in similar situations have found...',
        'The key benefit for you would be...'
      ],
      transitionTriggers: ['value demonstrated', 'interest expressed'],
      duration: 10,
      required: true
    },
    {
      id: 'documents-quote',
      name: 'Documents / Quote',
      description: 'Send PDF, quote, or link via SMS/Email/WhatsApp; Confirm reception; Guide reading',
      objectives: [
        'Send relevant documents (PDF, quote, links)',
        'Use appropriate channel (SMS/Email/WhatsApp)',
        'Confirm document reception',
        'Guide client through reading if live',
        'Explain key sections and terms'
      ],
      keyQuestions: [
        'What\'s the best way to send this information to you?',
        'Have you received the document I just sent?',
        'Would you like me to walk you through the key points?',
        'Do you have any questions about what you\'re seeing?'
      ],
      suggestedPhrases: [
        'I\'m sending you a detailed proposal now...',
        'You should receive this in the next few moments.',
        'Let me guide you through the main sections...',
        'The key information is on page [X]...'
      ],
      transitionTriggers: ['documents sent', 'content reviewed'],
      duration: 5,
      required: false
    },
    {
      id: 'objection-handling',
      name: 'Objection Handling',
      description: 'Detect objections in real time; Use CRAC method: Understand - Reformulate - Argue - Conclude',
      objectives: [
        'Detect objections in real time',
        'Use CRAC method for handling',
        'Understand the objection fully',
        'Reformulate to confirm understanding',
        'Argue with facts and benefits',
        'Conclude with agreement'
      ],
      keyQuestions: [
        'Help me understand your concern about...',
        'What specifically worries you about this?',
        'If we could address [concern], would you be interested?',
        'What would need to change for this to work for you?'
      ],
      suggestedPhrases: [
        'I understand your concern about...',
        'So what you\'re saying is..., is that right?',
        'Let me address that directly...',
        'Does that resolve your concern?'
      ],
      transitionTriggers: ['objections addressed', 'concerns resolved'],
      duration: 7,
      required: false
    },
    {
      id: 'confirmation-closing',
      name: 'Confirmation & Closing',
      description: 'Summarize agreement; Reconfirm consent or next steps; End on positive note',
      objectives: [
        'Summarize what has been agreed',
        'Reconfirm consent for next steps',
        'Clarify any remaining details',
        'Set clear expectations',
        'End on a positive note'
      ],
      keyQuestions: [
        'So we\'ve agreed on [summary], is that correct?',
        'Are you comfortable moving forward with this?',
        'What questions do you still have?',
        'When would be a good time for the next step?'
      ],
      suggestedPhrases: [
        'So to summarize, we\'ve agreed on...',
        'The next step will be...',
        'You can expect to hear from us...',
        'Thank you for your time and trust today.'
      ],
      transitionTriggers: ['agreement confirmed', 'next steps clear'],
      duration: 5,
      required: true
    },
    {
      id: 'post-call-actions',
      name: 'Post-Call Actions',
      description: 'Tag result; Create follow-up tasks; Document outcomes',
      objectives: [
        'Tag call result (success, failure, callback, undecided)',
        'Create follow-up tasks if needed',
        'Document key outcomes and notes',
        'Update CRM with call details',
        'Schedule any required follow-up'
      ],
      keyQuestions: [
        'What was the outcome of this call?',
        'What follow-up actions are required?',
        'When should the next contact be made?',
        'What information needs to be documented?'
      ],
      suggestedPhrases: [
        'Call completed successfully',
        'Follow-up scheduled for [date]',
        'Customer expressed interest in [solution]',
        'Next action: [specific task]'
      ],
      transitionTriggers: ['call ended', 'documentation complete'],
      duration: 3,
      required: true
    }
  ]
};

// Additional methodologies for different call types
const METHODOLOGIES: CallMethodology[] = [
  REPS_METHODOLOGY,
  {
    id: 'reps-support',
    name: 'REPS Support Flow',
    type: 'support',
    description: 'REPS methodology adapted for customer support calls',
    triggers: ['support', 'help', 'issue', 'problem', 'technical'],
    phases: [
      {
        id: 'context-preparation',
        name: 'Context & Preparation',
        description: 'Review customer history and prepare support tools',
        objectives: [
          'Review customer account and history',
          'Identify previous support interactions',
          'Prepare diagnostic tools',
          'Set support objective'
        ],
        keyQuestions: [
          'What support tools do I need?',
          'What is the customer\'s history with us?',
          'What similar issues have we resolved?'
        ],
        suggestedPhrases: [
          'Let me review your account details',
          'I can see your previous interactions',
          'I have the right tools ready to help'
        ],
        transitionTriggers: ['preparation complete'],
        duration: 2,
        required: true
      },
      {
        id: 'sbam-opening',
        name: 'SBAM & Opening',
        description: 'Professional greeting and issue acknowledgment',
        objectives: [
          'Greet customer warmly',
          'Thank them for contacting support',
          'Acknowledge their issue',
          'Set expectations for the call'
        ],
        keyQuestions: [
          'How can I help you today?',
          'What issue are you experiencing?',
          'When did this problem start?'
        ],
        suggestedPhrases: [
          'Thank you for contacting support',
          'I\'m here to help resolve your issue',
          'Let\'s get this sorted out for you'
        ],
        transitionTriggers: ['issue acknowledged'],
        duration: 2,
        required: true
      },
      {
        id: 'legal-compliance',
        name: 'Legal & Compliance',
        description: 'Verify identity and obtain consent for support actions',
        objectives: [
          'Verify customer identity',
          'Confirm account access permissions',
          'Obtain consent for support actions'
        ],
        keyQuestions: [
          'Can you confirm your account details?',
          'Do I have permission to access your account?',
          'Are you authorized to make changes?'
        ],
        suggestedPhrases: [
          'For security, I need to verify your identity',
          'Can I access your account to investigate?',
          'I\'ll need your permission to make changes'
        ],
        transitionTriggers: ['identity verified'],
        duration: 2,
        required: true
      },
      {
        id: 'issue-discovery',
        name: 'Issue Discovery',
        description: 'Understand the problem through detailed questioning',
        objectives: [
          'Understand the specific issue',
          'Identify when it started',
          'Determine impact and urgency',
          'Gather technical details'
        ],
        keyQuestions: [
          'Can you describe exactly what\'s happening?',
          'When did you first notice this issue?',
          'What were you trying to do when this occurred?',
          'Have you tried any troubleshooting steps?'
        ],
        suggestedPhrases: [
          'Help me understand the problem...',
          'Walk me through what happened...',
          'Let me make sure I understand...'
        ],
        transitionTriggers: ['issue understood'],
        duration: 8,
        required: true
      },
      {
        id: 'solution-proposal',
        name: 'Solution Proposal',
        description: 'Present solution options and explain the approach',
        objectives: [
          'Present solution options',
          'Explain the recommended approach',
          'Set expectations for resolution',
          'Get customer agreement'
        ],
        keyQuestions: [
          'Does this solution approach make sense?',
          'Are you comfortable with these steps?',
          'Do you have any concerns about this fix?'
        ],
        suggestedPhrases: [
          'Here\'s how we can resolve this...',
          'I recommend we try this approach...',
          'This should fix the issue because...'
        ],
        transitionTriggers: ['solution agreed'],
        duration: 5,
        required: true
      },
      {
        id: 'implementation',
        name: 'Implementation',
        description: 'Execute the solution with customer involvement',
        objectives: [
          'Implement the agreed solution',
          'Guide customer through steps',
          'Test the resolution',
          'Confirm issue is resolved'
        ],
        keyQuestions: [
          'Can you try this now?',
          'Is this working as expected?',
          'Do you see any remaining issues?'
        ],
        suggestedPhrases: [
          'Let\'s implement this solution...',
          'Please try this step...',
          'Can you confirm this is working?'
        ],
        transitionTriggers: ['solution implemented'],
        duration: 10,
        required: true
      },
      {
        id: 'verification-testing',
        name: 'Verification & Testing',
        description: 'Verify the solution works and test edge cases',
        objectives: [
          'Verify solution effectiveness',
          'Test related functionality',
          'Ensure no new issues created',
          'Document the resolution'
        ],
        keyQuestions: [
          'Is everything working correctly now?',
          'Can you test the related features?',
          'Are there any other concerns?'
        ],
        suggestedPhrases: [
          'Let\'s verify this is fully resolved...',
          'Please test this thoroughly...',
          'Everything should be working now'
        ],
        transitionTriggers: ['solution verified'],
        duration: 5,
        required: true
      },
      {
        id: 'closure-satisfaction',
        name: 'Closure & Satisfaction',
        description: 'Confirm resolution and gather feedback',
        objectives: [
          'Confirm complete resolution',
          'Gather satisfaction feedback',
          'Provide additional resources',
          'End positively'
        ],
        keyQuestions: [
          'Is there anything else I can help with?',
          'How would you rate the support today?',
          'Do you have any other questions?'
        ],
        suggestedPhrases: [
          'I\'m glad we could resolve this',
          'Thank you for your patience',
          'Don\'t hesitate to contact us again'
        ],
        transitionTriggers: ['customer satisfied'],
        duration: 3,
        required: true
      },
      {
        id: 'post-call-documentation',
        name: 'Post-Call Documentation',
        description: 'Document resolution and create follow-up tasks',
        objectives: [
          'Document the issue and resolution',
          'Update knowledge base if needed',
          'Create follow-up tasks',
          'Tag call outcome'
        ],
        keyQuestions: [
          'What was the root cause?',
          'Should this be added to the knowledge base?',
          'Is any follow-up required?'
        ],
        suggestedPhrases: [
          'Issue resolved successfully',
          'Solution documented for future reference',
          'Customer satisfied with resolution'
        ],
        transitionTriggers: ['documentation complete'],
        duration: 3,
        required: true
      }
    ]
  }
];

export function useCallMethodologies() {
  const { state, dispatch } = useAgent();

  // Detect call type and methodology based on conversation and context
  const detectCallType = (transcript: string, callContext?: any) => {
    const lowerTranscript = transcript.toLowerCase();
    
    // Support indicators
    const supportKeywords = ['help', 'problem', 'issue', 'not working', 'error', 'technical', 'support', 'broken', 'fix'];
    const supportScore = supportKeywords.filter(keyword => lowerTranscript.includes(keyword)).length;

    // Sales indicators
    const salesKeywords = ['buy', 'purchase', 'invest', 'product', 'price', 'cost', 'interested in', 'looking for', 'quote'];
    const salesScore = salesKeywords.filter(keyword => lowerTranscript.includes(keyword)).length;

    // Determine methodology based on context and keywords
    if (supportScore > salesScore || callContext?.type === 'support') {
      return METHODOLOGIES.find(m => m.id === 'reps-support');
    } else {
      return METHODOLOGIES.find(m => m.id === 'reps-flow'); // Default to main REPS flow
    }
  };

  // Get current methodology
  const getCurrentMethodology = () => {
    return state.callStructureGuidance.currentMethodology;
  };

  // Get current phase progress
  const getPhaseProgress = () => {
    const guidance = state.callStructureGuidance;
    if (!guidance.currentPhase) return 0;

    const completedObjectives = guidance.completedObjectives.filter(obj => 
      guidance.currentPhase!.objectives.includes(obj)
    ).length;
    
    return (completedObjectives / guidance.currentPhase.objectives.length) * 100;
  };

  // Auto-advance through REPS phases based on conversation flow
  const checkPhaseTransition = () => {
    const guidance = state.callStructureGuidance;
    const methodology = guidance.currentMethodology;
    
    if (!methodology || !guidance.currentPhase) return;

    const currentPhaseIndex = methodology.phases.findIndex(p => p.id === guidance.currentPhase!.id);
    const progress = getPhaseProgress();
    
    // Auto-advance logic for REPS flow
    if (progress >= 80 && currentPhaseIndex < methodology.phases.length - 1) {
      const nextPhase = methodology.phases[currentPhaseIndex + 1];
      
      // Check if transition triggers are met
      const shouldTransition = checkTransitionTriggers(guidance.currentPhase, nextPhase);
      
      if (shouldTransition) {
        const updatedGuidance = {
          ...guidance,
          currentPhase: nextPhase,
          nextPhase: currentPhaseIndex + 2 < methodology.phases.length ? 
            methodology.phases[currentPhaseIndex + 2] : undefined,
          phaseProgress: 0
        };
        
        dispatch({ type: 'UPDATE_CALL_STRUCTURE_GUIDANCE', guidance: updatedGuidance });
        
        // Add phase transition recommendation
        dispatch({
          type: 'ADD_RECOMMENDATION',
          recommendation: {
            id: `phase-transition-${Date.now()}`,
            type: 'transition',
            priority: 'medium',
            title: `Moved to ${nextPhase.name} Phase`,
            message: `REPS flow advanced to ${nextPhase.name}. ${nextPhase.description}`,
            timestamp: new Date()
          }
        });
      }
    }
  };

  // Check if transition triggers are met
  const checkTransitionTriggers = (currentPhase: any, nextPhase: any) => {
    const recentTranscript = state.transcript.slice(-3);
    const recentText = recentTranscript.map(t => t.text.toLowerCase()).join(' ');
    
    // Check for specific transition triggers based on phase
    switch (currentPhase.id) {
      case 'context-preparation':
        return state.callState.isActive; // Auto-transition when call starts
        
      case 'sbam-opening':
        return recentText.includes('thank') || recentText.includes('good') || 
               recentTranscript.some(t => t.participantId.includes('customer'));
               
      case 'legal-compliance':
        return recentText.includes('yes') || recentText.includes('confirm') ||
               recentText.includes('agree');
               
      case 'need-discovery':
        return recentText.includes('challenge') || recentText.includes('need') ||
               recentText.includes('problem') || recentText.includes('situation');
               
      case 'value-proposition':
        return recentText.includes('interested') || recentText.includes('sounds good') ||
               recentText.includes('how much') || recentText.includes('tell me more');
               
      case 'documents-quote':
        return recentText.includes('received') || recentText.includes('see it') ||
               recentText.includes('got it');
               
      case 'objection-handling':
        return recentText.includes('understand') || recentText.includes('makes sense') ||
               !recentText.includes('but') && !recentText.includes('however');
               
      case 'confirmation-closing':
        return recentText.includes('agree') || recentText.includes('yes') ||
               recentText.includes('move forward') || recentText.includes('next step');
               
      default:
        return true; // Default to allowing transition
    }
  };

  // Generate REPS-specific recommendations
  const generateREPSRecommendations = () => {
    const guidance = state.callStructureGuidance;
    const methodology = guidance.currentMethodology;
    
    if (!methodology || methodology.id !== 'reps-flow') return;

    const recommendations: Recommendation[] = [];
    const currentPhase = guidance.currentPhase;
    
    if (!currentPhase) return;

    // Phase-specific recommendations
    switch (currentPhase.id) {
      case 'sbam-opening':
        if (!state.transcript.some(t => t.text.toLowerCase().includes('record'))) {
          recommendations.push({
            id: `reps-recording-${Date.now()}`,
            type: 'methodology',
            priority: 'high',
            title: 'REPS: Mention Call Recording',
            message: 'Don\'t forget to mention that the call may be recorded for quality purposes.',
            suggestedResponse: 'Please note this call may be recorded for quality and training purposes.',
            timestamp: new Date()
          });
        }
        break;
        
      case 'legal-compliance':
        if (!state.transcript.some(t => t.text.toLowerCase().includes('consent'))) {
          recommendations.push({
            id: `reps-consent-${Date.now()}`,
            type: 'methodology',
            priority: 'critical',
            title: 'REPS: Obtain Consent',
            message: 'Ensure you have proper consent before proceeding with the offer.',
            suggestedResponse: 'Do I have your permission to share information about solutions that might help you?',
            timestamp: new Date()
          });
        }
        break;
        
      case 'need-discovery':
        const questionCount = state.transcript.filter(t => 
          t.participantId.includes('agent') && t.text.includes('?')
        ).length;
        
        if (questionCount < 3) {
          recommendations.push({
            id: `reps-questions-${Date.now()}`,
            type: 'methodology',
            priority: 'medium',
            title: 'REPS: Ask More Discovery Questions',
            message: 'Use more open-ended questions to fully understand their needs.',
            suggestedResponse: 'Can you tell me more about your current situation with [relevant area]?',
            timestamp: new Date()
          });
        }
        break;
        
      case 'value-proposition':
        if (!state.transcript.some(t => t.text.toLowerCase().includes('based on'))) {
          recommendations.push({
            id: `reps-connection-${Date.now()}`,
            type: 'methodology',
            priority: 'high',
            title: 'REPS: Connect to Discovered Needs',
            message: 'Reference what the customer told you to justify your recommendation.',
            suggestedResponse: 'Based on what you shared about [specific need], this solution would...',
            timestamp: new Date()
          });
        }
        break;
        
      case 'objection-handling':
        recommendations.push({
          id: `reps-crac-${Date.now()}`,
          type: 'methodology',
          priority: 'high',
          title: 'REPS: Use CRAC Method',
          message: 'Remember CRAC: Understand → Reformulate → Argue → Conclude',
          suggestedResponse: 'I understand your concern. So what you\'re saying is... Let me address that...',
          timestamp: new Date()
        });
        break;
    }

    // Add recommendations to state
    recommendations.forEach(rec => {
      dispatch({ type: 'ADD_RECOMMENDATION', recommendation: rec });
    });
  };

  // Monitor for REPS compliance
  const checkREPSCompliance = () => {
    const guidance = state.callStructureGuidance;
    const methodology = guidance.currentMethodology;
    
    if (!methodology || !guidance.currentPhase) return;

    const deviations: string[] = [];
    const currentPhase = guidance.currentPhase;

    // Check phase-specific compliance
    switch (currentPhase.id) {
      case 'legal-compliance':
        if (state.callMetrics.duration > 300000 && // 5 minutes
            !state.transcript.some(t => t.text.toLowerCase().includes('consent'))) {
          deviations.push('Legal compliance phase: Consent not yet obtained');
        }
        break;
        
      case 'need-discovery':
        const discoveryQuestions = state.transcript.filter(t => 
          t.participantId.includes('agent') && 
          t.text.includes('?') &&
          (t.text.toLowerCase().includes('what') || 
           t.text.toLowerCase().includes('how') ||
           t.text.toLowerCase().includes('tell me'))
        ).length;
        
        if (discoveryQuestions < 2 && state.callMetrics.duration > 600000) { // 10 minutes
          deviations.push('Need discovery: Insufficient open-ended questions asked');
        }
        break;
        
      case 'value-proposition':
        if (!state.transcript.some(t => 
          t.participantId.includes('agent') && 
          t.text.toLowerCase().includes('based on')
        )) {
          deviations.push('Value proposition: Not connecting to discovered needs');
        }
        break;
    }

    // Update guidance with deviations
    if (deviations.length > 0) {
      dispatch({
        type: 'UPDATE_CALL_STRUCTURE_GUIDANCE',
        guidance: {
          ...guidance,
          deviationAlerts: [...guidance.deviationAlerts, ...deviations]
        }
      });
    }
  };

  // Initialize REPS methodology when call starts
  useEffect(() => {
    if (state.callState.isActive && !state.callStructureGuidance.currentMethodology) {
      const methodology = METHODOLOGIES.find(m => m.id === 'reps-flow');
      
      if (methodology) {
        const guidance = {
          currentMethodology: methodology,
          currentPhase: methodology.phases[0], // Start with Context & Preparation
          phaseProgress: 0,
          nextPhase: methodology.phases[1],
          deviationAlerts: [],
          completedObjectives: [],
          missedOpportunities: []
        };

        dispatch({ type: 'UPDATE_CALL_STRUCTURE_GUIDANCE', guidance });

        // Add methodology initialization recommendation
        dispatch({
          type: 'ADD_RECOMMENDATION',
          recommendation: {
            id: `reps-init-${Date.now()}`,
            type: 'methodology',
            priority: 'high',
            title: 'REPS Call Flow Activated',
            message: 'Following REPS methodology with 9 structured phases. Starting with Context & Preparation.',
            timestamp: new Date()
          }
        });
      }
    }
  }, [state.callState.isActive]);

  // Monitor REPS flow progression
  useEffect(() => {
    if (!state.callState.isActive || !state.callStructureGuidance.currentMethodology) return;

    const interval = setInterval(() => {
      checkPhaseTransition();
      generateREPSRecommendations();
      checkREPSCompliance();
    }, 10000); // Every 10 seconds

    return () => clearInterval(interval);
  }, [state.callState.isActive, state.callStructureGuidance, state.transcript]);

  return {
    methodologies: METHODOLOGIES,
    getCurrentMethodology,
    getPhaseProgress,
    detectCallType
  };
}
