import { supabase } from '../lib/supabase';
import { Lead, TranscriptEntry, CallMetrics } from '../types';
import { v4 as uuidv4 } from 'uuid';

export class DatabaseService {
  // Contact Management
  static async getContacts(): Promise<Lead[]> {
    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .order('updated_at', { ascending: false });

    if (error) throw error;
    return data?.map(this.mapContactFromDB) || [];
  }

  static async getContact(id: string): Promise<Lead | null> {
    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data ? this.mapContactFromDB(data) : null;
  }

  static async createContact(contact: Partial<Lead>): Promise<Lead> {
    const contactData = {
      id: uuidv4(),
      name: contact.name || '',
      email: contact.email || '',
      phone: contact.phone || '',
      company: contact.company,
      title: contact.title,
      status: contact.status || 'new',
      priority: contact.priority || 'medium',
      lead_score: contact.leadScore || 0,
      value: contact.value,
      tags: contact.tags || [],
      notes: contact.notes
    };

    const { data, error } = await supabase
      .from('contacts')
      .insert(contactData)
      .select()
      .single();

    if (error) throw error;
    return this.mapContactFromDB(data);
  }

  static async updateContact(id: string, updates: Partial<Lead>): Promise<Lead> {
    const { data, error } = await supabase
      .from('contacts')
      .update({
        name: updates.name,
        email: updates.email,
        phone: updates.phone,
        company: updates.company,
        title: updates.title,
        status: updates.status,
        priority: updates.priority,
        lead_score: updates.leadScore,
        value: updates.value,
        tags: updates.tags,
        notes: updates.notes,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return this.mapContactFromDB(data);
  }

  // Call Management
  static async createCall(contactId: string, agentId: string, callType: string = 'outbound') {
    const callData = {
      id: uuidv4(),
      contact_id: contactId,
      agent_id: agentId,
      start_time: new Date().toISOString(),
      status: 'active',
      call_type: callType
    };

    const { data, error } = await supabase
      .from('calls')
      .insert(callData)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async endCall(callId: string, outcome?: string, notes?: string) {
    const endTime = new Date().toISOString();
    const { data: call } = await supabase
      .from('calls')
      .select('start_time')
      .eq('id', callId)
      .single();

    const duration = call ? 
      new Date(endTime).getTime() - new Date(call.start_time).getTime() : 0;

    const { data, error } = await supabase
      .from('calls')
      .update({
        end_time: endTime,
        duration,
        status: 'completed',
        outcome,
        notes
      })
      .eq('id', callId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Transcript Management
  static async saveTranscriptEntry(callId: string, entry: TranscriptEntry) {
    const { data, error } = await supabase
      .from('transcripts')
      .insert({
        id: entry.id,
        call_id: callId,
        participant_id: entry.participantId,
        text: entry.text,
        timestamp: entry.timestamp.toISOString(),
        confidence: entry.confidence,
        sentiment: entry.sentiment,
        emotion: entry.emotion
      });

    if (error) throw error;
    return data;
  }

  static async getCallTranscripts(callId: string): Promise<TranscriptEntry[]> {
    const { data, error } = await supabase
      .from('transcripts')
      .select('*')
      .eq('call_id', callId)
      .order('timestamp', { ascending: true });

    if (error) throw error;
    return data?.map(this.mapTranscriptFromDB) || [];
  }

  // Metrics Management
  static async saveCallMetrics(callId: string, metrics: CallMetrics, personalityType?: string) {
    const { data, error } = await supabase
      .from('call_metrics')
      .insert({
        id: uuidv4(),
        call_id: callId,
        clarity: metrics.clarity,
        empathy: metrics.empathy,
        assertiveness: metrics.assertiveness,
        efficiency: metrics.efficiency,
        overall_score: metrics.overallScore,
        personality_type: personalityType
      });

    if (error) throw error;
    return data;
  }

  // Real-time subscriptions
  static subscribeToCallUpdates(callId: string, callback: (payload: any) => void) {
    return supabase
      .channel(`call-${callId}`)
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'transcripts', filter: `call_id=eq.${callId}` },
        callback
      )
      .subscribe();
  }

  // Helper methods
  private static mapContactFromDB(data: any): Lead {
    return {
      id: data.id,
      name: data.name,
      email: data.email,
      phone: data.phone,
      company: data.company,
      title: data.title,
      status: data.status,
      priority: data.priority,
      leadScore: data.lead_score,
      value: data.value,
      tags: data.tags || [],
      notes: data.notes,
      source: 'database',
      preferredContactMethod: 'phone',
      interests: [],
      painPoints: [],
      decisionMakers: [],
      previousInteractions: []
    };
  }

  private static mapTranscriptFromDB(data: any): TranscriptEntry {
    return {
      id: data.id,
      participantId: data.participant_id,
      text: data.text,
      timestamp: new Date(data.timestamp),
      confidence: data.confidence,
      sentiment: data.sentiment as any,
      emotion: data.emotion
    };
  }
}
