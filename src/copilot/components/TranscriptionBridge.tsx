import React, { useEffect, useRef } from 'react';
import { useAgent } from '../contexts/AgentContext';
import { useTranscription } from '../contexts/TranscriptionContext';
import { TranscriptionMessage } from '../services/transcriptionService';
// @ts-ignore
import { v4 as uuidv4 } from 'uuid';
import { processAiAnalysis } from '../services/aiAnalysisBridge';

export const TranscriptionBridge: React.FC = () => {
    const { state, dispatch } = useAgent();
    const { addTranscriptionCallback, removeTranscriptionCallback, isActive } = useTranscription();

    // Store latest transcripts in a ref to avoid recreating the effect/callback on every message
    const transcriptsRef = useRef(state.transcript);
    useEffect(() => {
        transcriptsRef.current = state.transcript;
    }, [state.transcript]);

    useEffect(() => {
        const handleTranscriptionUpdate = async (message: TranscriptionMessage) => {
            // Handle Transcripts
            if (message.type === 'final' || message.type === 'transcript') {
                const transcriptId = uuidv4();
                dispatch({
                    type: 'ADD_TRANSCRIPT_ENTRY',
                    entry: {
                        id: transcriptId,
                        participantId: message.speaker === 'agent' ? 'agent-1' : 'customer-1',
                        text: message.text,
                        timestamp: new Date(message.timestamp),
                        confidence: message.confidence || 1.0,
                        sentiment: 'neutral'
                    }
                });

                // Trigger AI analysis on final transcripts
                processAiAnalysis(message.text, dispatch, transcriptsRef.current);
            } else if (message.type === 'interim' && message.text.trim().length > 40) {
                // Also trigger analysis on long interims to be more proactive
                // We don't dispatch it as an entry yet, but we run the analysis
                processAiAnalysis(message.text, dispatch, transcriptsRef.current);
            }

            // Handle AI Analysis (Phase changes, metrics, etc)
            if (message.type === 'analysis') {
                if (message.current_phase) {
                    // Map backend phase strings to frontend DashboardGrid phases
                    let mappedPhase = state.callState.currentPhase; // Default to current
                    const phaseLower = message.current_phase.toLowerCase();

                    if (phaseLower.includes('intro') || phaseLower.includes('hook') || phaseLower.includes('greeting') || phaseLower.includes('sbam')) {
                        mappedPhase = 'sbam';
                    } else if (phaseLower.includes('legal') || phaseLower.includes('compliance')) {
                        mappedPhase = 'legal';
                    } else if (phaseLower.includes('discovery') || phaseLower.includes('need')) {
                        mappedPhase = 'discovery';
                    } else if (phaseLower.includes('value') || phaseLower.includes('presentation') || phaseLower.includes('pitch')) {
                        mappedPhase = 'value';
                    } else if (phaseLower.includes('objection')) {
                        mappedPhase = 'objections';
                    } else if (phaseLower.includes('closing') || phaseLower.includes('confirmation')) {
                        mappedPhase = 'closing';
                    } else if (phaseLower.includes('post') || phaseLower.includes('follow')) {
                        mappedPhase = 'postcall';
                    } else if (phaseLower.includes('context') || phaseLower.includes('prep')) {
                        mappedPhase = 'context';
                    }

                    dispatch({
                        type: 'UPDATE_CALL_STATE',
                        callState: {
                            currentPhase: mappedPhase as any
                        }
                    });
                }

                // Update AI Metrics if present
                if ((message as any).metrics) {
                    dispatch({
                        type: 'UPDATE_CALL_METRICS',
                        metrics: (message as any).metrics
                    });
                }

                // Handle direct suggestions (if any)
                if (message.next_step_suggestion) {
                    dispatch({
                        type: 'ADD_RECOMMENDATION',
                        recommendation: {
                            id: uuidv4(),
                            type: 'strategy',
                            priority: 'medium',
                            title: 'Next Step Suggestion',
                            message: message.next_step_suggestion,
                            timestamp: new Date()
                        }
                    });
                }
            }
        };

        addTranscriptionCallback(handleTranscriptionUpdate);
        return () => removeTranscriptionCallback(handleTranscriptionUpdate);
    }, [addTranscriptionCallback, removeTranscriptionCallback, dispatch, state.callState.currentPhase]);

    // Handle Active State Sync (Optional, if AgentContext needs to know about Simulation status)
    useEffect(() => {
        if (isActive) {
            // If simulation starts, ensure Agent is in call state (ContactInfo handles this via setCallStatus usually, but good to be safe)
            // But we don't want to create duplicate START_CALL actions if ContactInfo already did it.
            // So leaving this out for now to avoid side effects.
        }
    }, [isActive, dispatch]);

    return null; // Logic only component
};

