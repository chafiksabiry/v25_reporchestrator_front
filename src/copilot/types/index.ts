export interface Participant {
  id: string;
  name: string;
  role: 'agent' | 'customer';
  avatar?: string;
}

export interface Contact {
  id: string;
  name: string;
  email: string;
  phone: string;
  company?: string;
  title?: string;
  avatar?: string;
  status: 'new' | 'qualified' | 'contacted' | 'interested' | 'negotiating' | 'closed' | 'lost';
  source: 'website' | 'referral' | 'cold_call' | 'social_media' | 'event' | 'partner';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  lastContact?: Date;
  nextFollowUp?: Date;
  notes?: string;
  tags: string[];
  value?: number;
  assignedAgent?: string;
  timezone?: string;
  preferredContactMethod: 'phone' | 'email' | 'text' | 'video';
  socialProfiles?: {
    linkedin?: string;
    twitter?: string;
    facebook?: string;
  };
  customFields?: Record<string, any>;
}

export interface Lead extends Contact {
  Last_Name: string;
  First_Name: any;
  Telephony: any;
  leadScore: number;
  interests: string[];
  painPoints: string[];
  budget?: {
    min: number;
    max: number;
    currency: string;
  };
  timeline?: string;
  decisionMakers: string[];
  competitors?: string[];
  previousInteractions: {
    date: Date;
    type: 'call' | 'email' | 'meeting' | 'demo';
    outcome: string;
    notes: string;
  }[];
}

export interface TranscriptEntry {
  id: string;
  participantId: string;
  text: string;
  timestamp: Date;
  confidence: number;
  sentiment: 'positive' | 'negative' | 'neutral';
  emotion?: string;
}

export interface PersonalityProfile {
  primaryType: 'D' | 'I' | 'S' | 'C';
  secondaryType: 'D' | 'I' | 'S' | 'C' | null;
  confidence: number;
  personalityIndicators: string[];
  recommendations: string[];
  approachStrategy: string;
  potentialObjections: string[];
  objectionHandling: string[];
  closingTechniques: string[];
  communicationStyle: string;
  emotionalTriggers: string[];
  riskFactors: string[];
  successIndicators: string[];
  timestamp: string;
}

export interface Recommendation {
  id: string;
  type: 'strategy' | 'language' | 'action' | 'warning' | 'methodology' | 'transition' | 'transaction';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  suggestedResponse?: string;
  timestamp: Date;
  dismissed?: boolean;
}

export interface CallMetrics {
  duration: number;
  clarity: number;
  empathy: number;
  assertiveness: number;
  efficiency: number;
  overallScore: number;
}

export interface KnowledgeBaseItem {
  id: string;
  title: string;
  content: string;
  category: string;
  relevanceScore: number;
  type: 'faq' | 'procedure' | 'document' | 'template';
}

export interface CallState {
  isActive: boolean;
  isRecording: boolean;
  startTime?: Date;
  participants: Participant[];
  currentPhase: string;
  contact?: Lead;
  recordingUrl?: string | null;
  sid?: string;
}

export interface ComplianceAlert {
  id: string;
  type: 'missing_disclosure' | 'sensitive_term' | 'gdpr_violation' | 'script_deviation';
  severity: 'warning' | 'error' | 'critical';
  message: string;
  suggestion: string;
  timestamp: Date;
}

export interface CallMethodology {
  id: string;
  name: string;
  type: 'sales' | 'support' | 'complaint' | 'escalation';
  phases: MethodologyPhase[];
  description: string;
  triggers: string[];
}

export interface MethodologyPhase {
  id: string;
  name: string;
  description: string;
  objectives: string[];
  keyQuestions: string[];
  suggestedPhrases: string[];
  transitionTriggers: string[];
  duration?: number; // in minutes
  required: boolean;
}

export interface CallStructureGuidance {
  currentMethodology?: CallMethodology;
  currentPhase?: MethodologyPhase;
  phaseProgress: number; // 0-100
  nextPhase?: MethodologyPhase;
  deviationAlerts: string[];
  completedObjectives: string[];
  missedOpportunities: string[];
}

export interface TransactionGoal {
  id: string;
  type: 'sale' | 'appointment' | 'feedback' | 'confirmation' | 'renewal' | 'upsell' | 'referral' | 'demo';
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  targetValue?: number;
  deadline?: Date;
  requirements: string[];
  successCriteria: string[];
}

export interface ReadinessSignal {
  id: string;
  type: 'positive' | 'negative' | 'neutral';
  category: 'verbal' | 'emotional' | 'behavioral' | 'contextual';
  signal: string;
  description: string;
  weight: number; // Impact on transaction score
  timestamp: Date;
}

export interface TransactionIntelligence {
  goal?: TransactionGoal;
  currentScore: number; // 0-100 likelihood of success
  readinessSignals: ReadinessSignal[];
  barriers: string[];
  opportunities: string[];
  nextBestActions: string[];
  optimalTiming: {
    shouldProceed: boolean;
    reason: string;
    suggestedDelay?: number; // minutes
  };
  progressToGoal: number; // 0-100 progress toward transaction
  riskFactors: string[];
  confidenceLevel: number; // 0-100 confidence in score accuracy
}

export interface SmartWarning {
  id: string;
  type: 'friction' | 'silence' | 'confusion' | 'legal_risk' | 'emotional_distress' | 'escalation' | 'technical_issue' | 'compliance_breach';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  detectedAt: Date;
  triggerData: {
    source: 'audio' | 'transcript' | 'behavior' | 'timing' | 'compliance';
    confidence: number;
    context: string;
  };
  suggestedActions: string[];
  autoResolution?: {
    canAutoResolve: boolean;
    action: string;
    requiresConfirmation: boolean;
  };
  escalationRequired: boolean;
  resolved: boolean;
  resolvedAt?: Date;
  impact: {
    transactionRisk: number; // 0-100
    relationshipRisk: number; // 0-100
    complianceRisk: number; // 0-100
  };
}

export interface WarningSystemState {
  activeWarnings: SmartWarning[];
  warningHistory: SmartWarning[];
  systemStatus: 'active' | 'paused' | 'error';
  lastCheck: Date;
  sensitivity: 'low' | 'medium' | 'high';
  autoResolutionEnabled: boolean;
}
