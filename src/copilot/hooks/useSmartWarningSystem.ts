import { useEffect, useRef } from 'react';
import { useAgent } from '../contexts/AgentContext';
import { SmartWarning } from '../types';

export function useSmartWarningSystem() {
  const { state, dispatch } = useAgent();
  const lastTranscriptLength = useRef(0);
  const lastAudioLevel = useRef(0);
  const silenceStartTime = useRef<Date | null>(null);
  const lastSpeechTime = useRef<Date>(new Date());

  // Detect friction patterns in conversation
  const detectFriction = (transcript: any[]) => {
    const recentEntries = transcript.slice(-5);
    const frictionIndicators = [
      'i don\'t understand',
      'that doesn\'t make sense',
      'i\'m confused',
      'can you repeat',
      'what do you mean',
      'i\'m not following',
      'this is frustrating',
      'i don\'t get it'
    ];

    const frictionCount = recentEntries.filter(entry => 
      frictionIndicators.some(indicator => 
        entry.text.toLowerCase().includes(indicator)
      )
    ).length;

    if (frictionCount >= 2) {
      return {
        detected: true,
        severity: frictionCount >= 3 ? 'high' : 'medium',
        context: `${frictionCount} friction indicators detected in recent conversation`,
        confidence: Math.min(95, frictionCount * 30)
      };
    }

    // Detect repetitive questions (agent repeating themselves)
    const agentEntries = recentEntries.filter(e => e.participantId.includes('agent'));
    const repeatedQuestions = agentEntries.filter((entry, index) => 
      agentEntries.slice(index + 1).some(laterEntry => 
        entry.text.toLowerCase().includes(laterEntry.text.toLowerCase().substring(0, 20))
      )
    );

    if (repeatedQuestions.length > 0) {
      return {
        detected: true,
        severity: 'medium' as const,
        context: 'Agent repeating questions - possible customer confusion',
        confidence: 75
      };
    }

    return { detected: false };
  };

  // Detect prolonged silence
  const detectSilence = (audioLevel: number, transcript: any[]) => {
    const now = new Date();
    const timeSinceLastSpeech = now.getTime() - lastSpeechTime.current.getTime();

    // Update last speech time if there's audio activity
    if (audioLevel > 10) {
      lastSpeechTime.current = now;
      silenceStartTime.current = null;
      return { detected: false };
    }

    // Start tracking silence
    if (!silenceStartTime.current && audioLevel < 5) {
      silenceStartTime.current = now;
    }

    // Check for prolonged silence
    if (silenceStartTime.current) {
      const silenceDuration = now.getTime() - silenceStartTime.current.getTime();
      
      if (silenceDuration > 15000) { // 15 seconds
        return {
          detected: true,
          severity: silenceDuration > 30000 ? 'high' : 'medium',
          context: `${Math.round(silenceDuration / 1000)} seconds of silence detected`,
          confidence: Math.min(95, (silenceDuration / 1000) * 3)
        };
      }
    }

    return { detected: false };
  };

  // Detect customer confusion
  const detectConfusion = (transcript: any[]) => {
    const recentEntries = transcript.slice(-3);
    const confusionIndicators = [
      'what',
      'huh',
      'sorry',
      'pardon',
      'excuse me',
      'i don\'t know',
      'i\'m not sure',
      'can you explain',
      'i don\'t follow'
    ];

    const questionMarks = recentEntries.filter(entry => 
      entry.text.includes('?') && entry.participantId.includes('customer')
    ).length;

    const confusionWords = recentEntries.filter(entry =>
      confusionIndicators.some(indicator => 
        entry.text.toLowerCase().includes(indicator)
      )
    ).length;

    if (questionMarks >= 2 || confusionWords >= 2) {
      return {
        detected: true,
        severity: (questionMarks + confusionWords) >= 4 ? 'high' : 'medium',
        context: `Customer asking multiple clarifying questions (${questionMarks} questions, ${confusionWords} confusion indicators)`,
        confidence: Math.min(90, (questionMarks + confusionWords) * 20)
      };
    }

    return { detected: false };
  };

  // Detect legal/compliance risks
  const detectLegalRisk = (transcript: any[]) => {
    const recentEntries = transcript.slice(-10);
    const riskTerms = [
      'guarantee',
      'promised',
      'definitely will',
      'no risk',
      'can\'t lose',
      'sure thing',
      'always profitable',
      'never fails',
      'risk-free',
      'certain return'
    ];

    const sensitiveTerms = [
      'personal information',
      'social security',
      'bank account',
      'password',
      'pin number',
      'credit card'
    ];

    const riskDetections = recentEntries.filter(entry =>
      entry.participantId.includes('agent') &&
      riskTerms.some(term => entry.text.toLowerCase().includes(term))
    );

    const sensitiveDetections = recentEntries.filter(entry =>
      sensitiveTerms.some(term => entry.text.toLowerCase().includes(term))
    );

    if (riskDetections.length > 0) {
      return {
        detected: true,
        severity: 'critical' as const,
        context: `Agent used potentially problematic language: "${riskDetections[0].text}"`,
        confidence: 85,
        type: 'compliance_breach' as const
      };
    }

    if (sensitiveDetections.length > 0) {
      return {
        detected: true,
        severity: 'high' as const,
        context: `Sensitive information mentioned in conversation`,
        confidence: 80,
        type: 'legal_risk' as const
      };
    }

    return { detected: false };
  };

  // Detect emotional distress
  const detectEmotionalDistress = (transcript: any[]) => {
    const recentEntries = transcript.slice(-5);
    const distressIndicators = [
      'angry',
      'frustrated',
      'upset',
      'mad',
      'furious',
      'disappointed',
      'terrible',
      'awful',
      'horrible',
      'unacceptable',
      'ridiculous',
      'stupid'
    ];

    const negativeEmotions = recentEntries.filter(entry =>
      entry.participantId.includes('customer') &&
      (entry.sentiment === 'negative' || 
       distressIndicators.some(indicator => 
         entry.text.toLowerCase().includes(indicator)
       ))
    );

    if (negativeEmotions.length >= 2) {
      return {
        detected: true,
        severity: negativeEmotions.length >= 3 ? 'high' : 'medium',
        context: `Customer showing signs of emotional distress (${negativeEmotions.length} negative indicators)`,
        confidence: Math.min(90, negativeEmotions.length * 25)
      };
    }

    return { detected: false };
  };

  // Detect escalation scenarios
  const detectEscalation = (transcript: any[]) => {
    const recentEntries = transcript.slice(-3);
    const escalationTriggers = [
      'manager',
      'supervisor',
      'complaint',
      'lawyer',
      'attorney',
      'sue',
      'legal action',
      'better business bureau',
      'report you',
      'cancel everything',
      'never again',
      'worst service'
    ];

    const escalationDetected = recentEntries.some(entry =>
      entry.participantId.includes('customer') &&
      escalationTriggers.some(trigger => 
        entry.text.toLowerCase().includes(trigger)
      )
    );

    if (escalationDetected) {
      return {
        detected: true,
        severity: 'critical' as const,
        context: 'Customer requesting escalation or expressing intent to escalate',
        confidence: 95
      };
    }

    return { detected: false };
  };

  // Detect technical issues
  const detectTechnicalIssues = (audioLevel: number) => {
    // Simulate technical issue detection based on audio patterns
    if (audioLevel > 90 || (audioLevel > 0 && audioLevel < 5)) {
      return {
        detected: true,
        severity: 'medium' as const,
        context: audioLevel > 90 ? 'Audio level too high - possible feedback' : 'Very low audio level - connection issues',
        confidence: 70
      };
    }

    return { detected: false };
  };

  // Generate smart warning
  const generateWarning = (
    type: SmartWarning['type'],
    severity: SmartWarning['severity'],
    title: string,
    message: string,
    context: string,
    confidence: number,
    source: 'audio' | 'transcript' | 'behavior' | 'timing' | 'compliance',
    suggestedActions: string[] = [],
    escalationRequired: boolean = false
  ): SmartWarning => {
    const impact = {
      transactionRisk: type === 'escalation' ? 90 : type === 'legal_risk' ? 85 : type === 'confusion' ? 60 : 40,
      relationshipRisk: type === 'emotional_distress' ? 80 : type === 'friction' ? 70 : type === 'escalation' ? 95 : 30,
      complianceRisk: type === 'legal_risk' ? 95 : type === 'compliance_breach' ? 100 : 20
    };

    return {
      id: `warning-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      severity,
      title,
      message,
      detectedAt: new Date(),
      triggerData: {
        source,
        confidence,
        context
      },
      suggestedActions,
      escalationRequired,
      resolved: false,
      impact
    };
  };

  // Main warning detection logic
  const runWarningDetection = () => {
    if (!state.callState.isActive || state.warningSystem.systemStatus !== 'active') return;

    const warnings: SmartWarning[] = [];

    // Friction detection
    const frictionResult = detectFriction(state.transcript);
    if (frictionResult.detected) {
      warnings.push(generateWarning(
        'friction',
        frictionResult.severity as any,
        'Conversation Friction Detected',
        'Customer showing signs of confusion or frustration with the conversation flow.',
        frictionResult.context,
        frictionResult.confidence,
        'transcript',
        [
          'Slow down and clarify your last point',
          'Ask if customer needs clarification',
          'Simplify your language and explanations',
          'Check customer understanding before proceeding'
        ]
      ));
    }

    // Silence detection
    const silenceResult = detectSilence(state.audioLevel, state.transcript);
    if (silenceResult.detected) {
      warnings.push(generateWarning(
        'silence',
        silenceResult.severity as any,
        'Prolonged Silence Detected',
        'Extended period of silence may indicate technical issues or customer disengagement.',
        silenceResult.context,
        silenceResult.confidence,
        'audio',
        [
          'Check if customer is still on the line',
          'Ask an engaging question to restart conversation',
          'Verify technical connection',
          'Offer to call back if needed'
        ]
      ));
    }

    // Confusion detection
    const confusionResult = detectConfusion(state.transcript);
    if (confusionResult.detected) {
      warnings.push(generateWarning(
        'confusion',
        confusionResult.severity as any,
        'Customer Confusion Detected',
        'Customer appears confused and is asking multiple clarifying questions.',
        confusionResult.context,
        confusionResult.confidence,
        'transcript',
        [
          'Pause and ask what specifically is unclear',
          'Provide a simple summary of key points',
          'Use analogies or examples to clarify',
          'Offer to send written materials'
        ]
      ));
    }

    // Legal risk detection
    const legalResult = detectLegalRisk(state.transcript);
    if (legalResult.detected) {
      warnings.push(generateWarning(
        legalResult.type || 'legal_risk',
        legalResult.severity as any,
        'Legal/Compliance Risk Detected',
        'Potentially problematic language or sensitive information detected in conversation.',
        legalResult.context,
        legalResult.confidence,
        'compliance',
        [
          'Immediately correct any misleading statements',
          'Provide appropriate disclaimers',
          'Review compliance guidelines',
          'Consider supervisor consultation'
        ],
        true
      ));
    }

    // Emotional distress detection
    const distressResult = detectEmotionalDistress(state.transcript);
    if (distressResult.detected) {
      warnings.push(generateWarning(
        'emotional_distress',
        distressResult.severity as any,
        'Customer Emotional Distress',
        'Customer showing signs of frustration, anger, or emotional distress.',
        distressResult.context,
        distressResult.confidence,
        'behavior',
        [
          'Acknowledge customer feelings with empathy',
          'Lower your tone and speak more slowly',
          'Focus on solutions rather than problems',
          'Consider offering a break or callback'
        ]
      ));
    }

    // Escalation detection
    const escalationResult = detectEscalation(state.transcript);
    if (escalationResult.detected) {
      warnings.push(generateWarning(
        'escalation',
        escalationResult.severity as any,
        'Escalation Request Detected',
        'Customer has requested escalation or expressed intent to escalate the issue.',
        escalationResult.context,
        escalationResult.confidence,
        'transcript',
        [
          'Acknowledge the escalation request immediately',
          'Attempt one final resolution before escalating',
          'Prepare escalation summary for supervisor',
          'Transfer to appropriate escalation queue'
        ],
        true
      ));
    }

    // Technical issues detection
    const technicalResult = detectTechnicalIssues(state.audioLevel);
    if (technicalResult.detected) {
      warnings.push(generateWarning(
        'technical_issue',
        technicalResult.severity as any,
        'Technical Issue Detected',
        'Audio quality issues detected that may impact call quality.',
        technicalResult.context,
        technicalResult.confidence,
        'audio',
        [
          'Check microphone and speaker settings',
          'Ask customer about audio quality',
          'Consider switching to backup connection',
          'Offer to call back on different line'
        ]
      ));
    }

    // Add warnings to state
    warnings.forEach(warning => {
      dispatch({ type: 'ADD_SMART_WARNING', warning });
    });

    // Update system status
    dispatch({
      type: 'UPDATE_WARNING_SYSTEM',
      state: { lastCheck: new Date() }
    });
  };

  // Run detection when transcript changes
  useEffect(() => {
    if (state.transcript.length > lastTranscriptLength.current) {
      lastTranscriptLength.current = state.transcript.length;
      runWarningDetection();
    }
  }, [state.transcript.length]);

  // Run detection when audio level changes significantly
  useEffect(() => {
    const audioLevelDiff = Math.abs(state.audioLevel - lastAudioLevel.current);
    if (audioLevelDiff > 20) {
      lastAudioLevel.current = state.audioLevel;
      runWarningDetection();
    }
  }, [state.audioLevel]);

  // Periodic detection
  useEffect(() => {
    if (!state.callState.isActive) return;

    const interval = setInterval(() => {
      runWarningDetection();
    }, 10000); // Every 10 seconds

    return () => clearInterval(interval);
  }, [state.callState.isActive]);

  return {
    runWarningDetection,
    resolveWarning: (warningId: string) => dispatch({ type: 'RESOLVE_WARNING', warningId }),
    updateSystemSettings: (settings: any) => dispatch({ type: 'UPDATE_WARNING_SYSTEM', state: settings })
  };
}
