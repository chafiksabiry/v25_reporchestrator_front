import { v4 as uuidv4 } from 'uuid';
import { getPersonalityAnalysis } from './callService';
import { getAIAssistance } from './aiRecommendations';
import { analyzeCallPhase } from './callPhaseService';
import { AgentAction } from '../contexts/AgentContext';

/**
 * Shared logic to process a transcription text through AI services (DISC, Recommendations & Phases)
 * and dispatch results to the global AgentContext.
 */
export const processAiAnalysis = async (text: string, dispatch: (action: AgentAction) => void, context: any[] = []) => {
    if (!text || text.trim().length < 5) return;

    try {
        // 1. Get AI Assistance (Recommendations & Warnings)
        const assistance = await getAIAssistance(text, context);
        if (assistance.success && assistance.suggestion) {
            // ... (rest of the warning logic remains same)
            const isAutomated = assistance.suggestion.includes('[AUTOMATED]');
            const isWarning = isAutomated ||
                assistance.suggestion.toLowerCase().includes('warning') ||
                assistance.suggestion.toLowerCase().includes('alert');

            if (isWarning) {
                dispatch({
                    type: 'ADD_SMART_WARNING',
                    warning: {
                        id: uuidv4(),
                        type: isAutomated ? 'technical_issue' : 'compliance_breach',
                        severity: isAutomated ? 'critical' : 'high',
                        title: isAutomated ? 'Automated System Detected' : 'AI Security/Compliance Alert',
                        message: assistance.suggestion,
                        detectedAt: new Date(),
                        triggerData: { source: 'transcript', confidence: 0.9, context: text },
                        suggestedActions: isAutomated ? ['End call', 'Leave voicemail'] : ['Acknowledge risk', 'Follow script'],
                        resolved: false,
                        impact: { transactionRisk: isAutomated ? 100 : 40, relationshipRisk: 20, complianceRisk: isAutomated ? 0 : 80 },
                        escalationRequired: isAutomated
                    }
                });
            } else {
                dispatch({
                    type: 'ADD_RECOMMENDATION',
                    recommendation: {
                        id: uuidv4(),
                        type: 'action',
                        priority: 'medium',
                        title: 'AI Suggestion',
                        message: assistance.suggestion,
                        timestamp: new Date()
                    }
                });
            }
        }

        // 2. Get Personality Analysis (DISC)
        const personality = await getPersonalityAnalysis(text);
        if (personality.success && personality.personalityProfile) {
            dispatch({
                type: 'UPDATE_PERSONALITY_PROFILE',
                profile: personality.personalityProfile
            });
        }

        // 3. Get Phase Analysis
        const phaseData = await analyzeCallPhase(text);
        if (phaseData && phaseData.current_phase !== 'Unknown') {
            // Map phase results (using the same logic as TranscriptionBridge or just passing it through)
            // TranscriptionBridge has mapping logic, but the backend already returns descriptive names.
            // Let's dispatch a custom type that can be handled by TranscriptionBridge's callback or directly in Reducer
            dispatch({
                type: 'UPDATE_CALL_STATE',
                callState: {
                    currentPhase: phaseData.current_phase as any
                }
            });

            // Also add phase-based suggestion if present
            if (phaseData.next_step_suggestion) {
                dispatch({
                    type: 'ADD_RECOMMENDATION',
                    recommendation: {
                        id: uuidv4(),
                        type: 'strategy',
                        priority: 'medium',
                        title: `Phase Suggestion: ${phaseData.current_phase}`,
                        message: phaseData.next_step_suggestion,
                        timestamp: new Date()
                    }
                });
            }
        }

    } catch (err) {
        console.error('Error in shared AI analysis bridge:', err);
    }
};

