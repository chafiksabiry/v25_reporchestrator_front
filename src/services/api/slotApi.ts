import axios from 'axios';

const MATCHING_API_URL = import.meta.env.VITE_MATCHING_API_URL || 'https://v25matchingbackend-production.up.railway.app/api';

export interface Slot {
    _id?: string;
    gigId: string;
    date: string; // yyyy-MM-dd
    startTime: string; // HH:mm
    endTime: string; // HH:mm
    duration: number; // hours
    capacity: number;
    reservedCount: number;
    status: 'available' | 'full' | 'cancelled';
    notes?: string;
}

export interface Reservation {
    _id?: string;
    agentId: string;
    slotId: string;
    gigId: string;
    date: string;
    reservationDate?: string;
    startTime: string;
    endTime: string;
    duration: number;
    status: 'reserved' | 'cancelled';
    notes?: string;
}

export const slotApi = {
    /**
     * Get all slots for a gig, optionally filtered by date
     */
    getSlots: async (gigId?: string, date?: string): Promise<Slot[]> => {
        try {
            const params: any = {};
            if (gigId) params.gigId = gigId;
            if (date) params.date = date;

            const response = await axios.get(`${MATCHING_API_URL}/slots`, { params });
            return response.data;
        } catch (error) {
            console.error('Error fetching slots:', error);
            throw error;
        }
    },

    /**
     * Reserve a slot
     */
    reserveSlot: async (
        slotId: string,
        repId: string,
        notes?: string,
        reservationDate?: string
    ): Promise<{ message: string; reservation: Reservation }> => {
        try {
            const response = await axios.post(`${MATCHING_API_URL}/slots/${slotId}/reserve`, {
                repId,
                notes,
                ...(reservationDate ? { reservationDate } : {})
            });
            return response.data;
        } catch (error: any) {
            console.error('Error reserving slot:', error);
            throw error;
        }
    },

    /**
     * Cancel a reservation
     */
    cancelReservation: async (reservationId: string): Promise<{ message: string; reservation: Reservation }> => {
        try {
            const response = await axios.delete(`${MATCHING_API_URL}/slots/reservations/${reservationId}`);
            return response.data;
        } catch (error) {
            console.error('Error cancelling reservation:', error);
            throw error;
        }
    },

    /**
     * Update reservation notes
     */
    updateReservationNotes: async (reservationId: string, notes: string): Promise<{ message: string; reservation: Reservation }> => {
        try {
            const response = await axios.patch(`${MATCHING_API_URL}/slots/reservations/${reservationId}`, {
                notes
            });
            return response.data;
        } catch (error) {
            console.error('Error updating reservation notes:', error);
            throw error;
        }
    },

    /**
     * Get reservations for a rep
     */
    getReservations: async (repId?: string, gigId?: string): Promise<Reservation[]> => {
        try {
            const params: any = {};
            if (repId) params.repId = repId;
            if (gigId) params.gigId = gigId;

            const response = await axios.get(`${MATCHING_API_URL}/slots/reservations`, { params });
            return response.data;
        } catch (error) {
            console.error('Error fetching reservations:', error);
            throw error;
        }
    }
};
