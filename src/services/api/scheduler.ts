import axios from 'axios';
import { TimeSlot } from '../../types/scheduler';

const MATCHING_API_URL = import.meta.env.VITE_MATCHING_API_URL || 'https://v25matchingbackend-production.up.railway.app/api';

export const schedulerApi = {
    /**
     * Get all time slots for an agent, optionally filtered by gig and date
     */
    getTimeSlots: async (agentId?: string, gigId?: string, date?: string): Promise<TimeSlot[]> => {
        try {
            const params: any = {};
            if (agentId) params.agentId = agentId;
            if (gigId) params.gigId = gigId;
            if (date) params.date = date;

            const response = await axios.get(`${MATCHING_API_URL}/time-slots`, { params });
            return response.data;
        } catch (error) {
            console.error('Error fetching time slots:', error);
            throw error;
        }
    },

    /**
     * Create or update a time slot
     */
    upsertTimeSlot: async (slotData: Partial<TimeSlot>): Promise<TimeSlot> => {
        try {
            const response = await axios.post(`${MATCHING_API_URL}/time-slots`, slotData);
            return response.data;
        } catch (error) {
            console.error('Error saving time slot:', error);
            throw error;
        }
    },

    /**
     * Delete a time slot
     */
    deleteTimeSlot: async (id: string): Promise<void> => {
        try {
            await axios.delete(`${MATCHING_API_URL}/time-slots/${id}`);
        } catch (error) {
            console.error('Error deleting time slot:', error);
            throw error;
        }
    },

    /**
     * Cancel a time slot
     */
    cancelTimeSlot: async (id: string): Promise<TimeSlot> => {
        try {
            const response = await axios.patch(`${MATCHING_API_URL}/time-slots/${id}/cancel`);
            return response.data;
        } catch (error) {
            console.error('Error cancelling time slot:', error);
            throw error;
        }
    },

    /**
     * Get all agents associated with a gig
     */
    getGigAgents: async (gigId: string, status?: string): Promise<any[]> => {
        try {
            const params: any = {};
            if (status) params.status = status;
            const response = await axios.get(`${MATCHING_API_URL}/gig-agents/gigs/${gigId}/agents`, { params });
            return response.data;
        } catch (error) {
            console.error('Error fetching gig agents:', error);
            throw error;
        }
    },

    /**
     * Bulk create or update time slots
     */
    bulkUpsertTimeSlots: async (gigId: string, slots: Partial<TimeSlot>[]): Promise<{ message: string; results: any[] }> => {
        try {
            const response = await axios.post(`${MATCHING_API_URL}/slots/bulk-upsert`, {
                gigId,
                slots
            });
            return response.data;
        } catch (error) {
            console.error('Error in bulk upsert:', error);
            throw error;
        }
    },
};
