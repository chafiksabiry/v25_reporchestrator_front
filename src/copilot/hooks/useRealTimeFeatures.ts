import { useAgent } from '../contexts/AgentContext';
import { Participant, TranscriptEntry, Recommendation } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { processAiAnalysis } from '../services/aiAnalysisBridge';

export function useRealTimeFeatures() {
  const { state, dispatch } = useAgent();

  // Start a call with participants
  const startCall = (participants: Participant[]) => {
    dispatch({
      type: 'START_CALL',
      participants,
      contact: participants.find(p => p.role === 'customer') as any
    });

    // Simulate AI listening activation
    setTimeout(() => {
      dispatch({ type: 'TOGGLE_AI_LISTENING' });
    }, 1000);

    // Start audio level simulation (Disabled in favor of real visualization)
    // startAudioLevelSimulation();

    // Start transcript simulation
    startTranscriptSimulation();

    // Start metrics updates
    startMetricsSimulation();
  };

  // End the current call
  const endCall = () => {
    dispatch({ type: 'END_CALL' });
  };

  // Update call phase
  const updateCallPhase = (phase: any) => {
    dispatch({
      type: 'UPDATE_CALL_STATE',
      callState: { currentPhase: phase }
    });
  };

  // Dismiss a recommendation
  const dismissRecommendation = (id: string) => {
    dispatch({ type: 'DISMISS_RECOMMENDATION', id });
  };

  /* 
  // Simulate audio levels during call
  const startAudioLevelSimulation = () => {
    const interval = setInterval(() => {
      if (!state.callState.isActive) {
        clearInterval(interval);
        return;
      }

      const level = Math.random() * 100;
      dispatch({ type: 'UPDATE_AUDIO_LEVEL', level });
    }, 500);
  };
  */

  // Simulate transcript entries
  const startTranscriptSimulation = () => {
    const sampleTranscripts = [
      { speaker: 'agent', text: 'Hello, thank you for taking my call today.' },
      { speaker: 'customer', text: 'Hi, yes, I have a few minutes.' },
      { speaker: 'agent', text: 'Great! I wanted to discuss some investment opportunities that might interest you.' },
      { speaker: 'customer', text: 'I\'m always interested in learning about new opportunities.' },
      { speaker: 'agent', text: 'Excellent. Can you tell me about your current investment portfolio?' },
      { speaker: 'customer', text: 'I have some stocks and bonds, but I\'m looking to diversify.' }
    ];

    let index = 0;
    const interval = setInterval(() => {
      if (!state.callState.isActive || index >= sampleTranscripts.length) {
        clearInterval(interval);
        return;
      }

      const sample = sampleTranscripts[index];
      const entry: TranscriptEntry = {
        id: uuidv4(),
        participantId: sample.speaker === 'agent' ? 'agent-1' : 'customer-1',
        text: sample.text,
        timestamp: new Date(),
        confidence: 0.95,
        sentiment: Math.random() > 0.7 ? 'positive' : Math.random() > 0.5 ? 'neutral' : 'negative'
      };

      dispatch({ type: 'ADD_TRANSCRIPT_ENTRY', entry });

      // Trigger AI analysis on simulated transcripts to match real call behavior
      processAiAnalysis(sample.text, dispatch);

      index++;
    }, 3000);
  };

  // Simulate metrics updates
  const startMetricsSimulation = () => {
    const interval = setInterval(() => {
      if (!state.callState.isActive) {
        clearInterval(interval);
        return;
      }

      const metrics = {
        clarity: Math.min(100, state.callMetrics.clarity + Math.random() * 5),
        empathy: Math.min(100, state.callMetrics.empathy + Math.random() * 3),
        assertiveness: Math.min(100, state.callMetrics.assertiveness + Math.random() * 4),
        efficiency: Math.min(100, state.callMetrics.efficiency + Math.random() * 2),
        overallScore: 0
      };

      metrics.overallScore = (metrics.clarity + metrics.empathy + metrics.assertiveness + metrics.efficiency) / 4;

      dispatch({ type: 'UPDATE_CALL_METRICS', metrics });

      // Generate recommendations based on metrics
      if (metrics.empathy < 60 && Math.random() > 0.8) {
        const recommendation: Recommendation = {
          id: uuidv4(),
          type: 'strategy',
          priority: 'medium',
          title: 'Increase Empathy',
          message: 'Consider acknowledging the customer\'s concerns more explicitly.',
          suggestedResponse: 'I understand that this is an important decision for you.',
          timestamp: new Date()
        };
        dispatch({ type: 'ADD_RECOMMENDATION', recommendation });
      }
    }, 5000);
  };

  return {
    startCall,
    endCall,
    updateCallPhase,
    dismissRecommendation
  };
}
