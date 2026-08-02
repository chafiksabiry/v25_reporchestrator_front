import * as tf from '@tensorflow/tfjs';
import { Rep, Gig, TimeSlot, AIRecommendation, PerformanceMetric, WorkloadPrediction } from '../types/scheduler';

// Simple model for rep-gig matching
let matchingModel: tf.LayersModel | null = null;

// Initialize the TensorFlow.js model
export async function initializeAI() {
    try {
        // Load pre-trained model or create a new one
        try {
            matchingModel = await tf.loadLayersModel('indexeddb://rep-gig-matching-model');
            console.log('Loaded existing model from IndexedDB');
        } catch (e) {
            console.log('Creating new model');
            matchingModel = createMatchingModel();
            await matchingModel.save('indexeddb://rep-gig-matching-model');
        }

        return true;
    } catch (error) {
        console.error('Failed to initialize AI:', error);
        return false;
    }
}

// Create a simple neural network for rep-gig matching
function createMatchingModel(): tf.LayersModel {
    const model = tf.sequential();

    // Input: rep specialties (one-hot) + gig skills (one-hot)
    model.add(tf.layers.dense({
        units: 16,
        activation: 'relu',
        inputShape: [20], // Assuming 10 possible specialties + 10 possible skills
    }));

    model.add(tf.layers.dense({
        units: 8,
        activation: 'relu',
    }));

    // Output: match confidence (0-1)
    model.add(tf.layers.dense({
        units: 1,
        activation: 'sigmoid',
    }));

    model.compile({
        optimizer: 'adam',
        loss: 'binaryCrossentropy',
        metrics: ['accuracy'],
    });

    return model;
}

// Get rep-gig recommendations
export function getGigRecommendations(
    rep: Rep,
    availableGigs: Gig[],
    historicalSlots: TimeSlot[]
): AIRecommendation[] {
    // This is a simplified recommendation algorithm
    // In a real system, this would use the trained model

    const recommendations: AIRecommendation[] = [];

    // Calculate rep's historical gig distribution
    const gigCounts: Record<string, number> = {};
    historicalSlots
        .filter(slot => slot.repId === rep.id && slot.status === 'reserved' && slot.gigId)
        .forEach(slot => {
            if (slot.gigId) {
                gigCounts[slot.gigId] = (gigCounts[slot.gigId] || 0) + 1;
            }
        });

    // Calculate match scores based on specialties and historical data
    availableGigs.forEach(gig => {
        // Calculate specialty match (how many of the rep's specialties match gig skills)
        const skillMatch = gig.skills.filter(skill =>
            rep.specialties.some(specialty =>
                specialty.toLowerCase().includes(skill.toLowerCase()) ||
                skill.toLowerCase().includes(specialty.toLowerCase())
            )
        ).length / Math.max(gig.skills.length, 1);

        // Calculate historical preference
        const historicalPreference = gigCounts[gig.id]
            ? gigCounts[gig.id] / Object.values(gigCounts).reduce((a, b) => a + b, 0)
            : 0;

        // Combine factors for final confidence score
        const confidence = 0.7 * skillMatch + 0.3 * historicalPreference;

        // Generate reason text
        let reason = '';
        if (skillMatch > 0.7) {
            reason = 'Strong skill match with your specialties';
        } else if (historicalPreference > 0.3) {
            reason = 'Based on your previous gig history';
        } else {
            reason = 'New opportunity that might match your skills';
        }

        // Add priority boost
        const priorityBoost = gig.priority === 'high' ? 0.2 : gig.priority === 'medium' ? 0.1 : 0;

        recommendations.push({
            repId: rep.id,
            gigId: gig.id,
            confidence: Math.min(confidence + priorityBoost, 1),
            reason
        });
    });

    // Sort by confidence score
    return recommendations.sort((a, b) => b.confidence - a.confidence);
}

// Predict optimal scheduling times
export function predictOptimalTimes(
    rep: Rep,
    historicalSlots: TimeSlot[]
): { hour: number; score: number }[] {
    // Analyze historical booking patterns
    const hourCounts = Array(24).fill(0);

    historicalSlots
        .filter(slot => slot.repId === rep.id && slot.status === 'reserved')
        .forEach(slot => {
            const hour = parseInt(slot.startTime.split(':')[0]);
            hourCounts[hour]++;
        });

    // Calculate total slots for normalization
    const totalSlots = hourCounts.reduce((sum, count) => sum + count, 0);

    // Generate scores for each hour (0-1)
    return hourCounts.map((count, hour) => {
        // Base score from historical data
        let score = totalSlots > 0 ? count / totalSlots : 0;

        // Boost score for preferred hours if available
        if (rep.preferredHours && hour >= rep.preferredHours.start && hour < rep.preferredHours.end) {
            score += 0.2;
        }

        // Normalize to 0-1 range
        return { hour, score: Math.min(score, 1) };
    });
}

// Calculate rep performance metrics
export function calculatePerformanceMetrics(
    rep: Rep,
    historicalSlots: TimeSlot[]
): PerformanceMetric[] {
    // This would normally use real data from customer feedback, etc.
    // Here we're simulating metrics based on slot data

    const repSlots = historicalSlots.filter(slot =>
        slot.repId === rep.id && slot.status === 'reserved'
    );

    if (repSlots.length === 0) {
        return [
            { repId: rep.id, metric: 'satisfaction', value: 0 },
            { repId: rep.id, metric: 'efficiency', value: 0 },
            { repId: rep.id, metric: 'quality', value: 0 }
        ];
    }

    // Calculate metrics (in a real system, these would come from actual data)

    // Satisfaction: based on gig diversity (more diverse = higher satisfaction)
    const uniqueGigs = new Set(repSlots.map(slot => slot.gigId).filter(Boolean)).size;
    const satisfactionScore = Math.min(uniqueGigs * 20, 100); // 5+ gigs = 100%

    // Efficiency: based on number of slots and notes (more notes = more detailed work)
    const slotsWithNotes = repSlots.filter(slot => slot.notes && slot.notes.length > 0).length;
    const efficiencyScore = Math.min((repSlots.length + slotsWithNotes) * 5, 100);

    // Quality: random for demo purposes (would be based on feedback in real system)
    const qualityScore = Math.floor(70 + Math.random() * 30); // 70-100 range

    return [
        { repId: rep.id, metric: 'satisfaction', value: satisfactionScore },
        { repId: rep.id, metric: 'efficiency', value: efficiencyScore },
        { repId: rep.id, metric: 'quality', value: qualityScore }
    ];
}

// Predict future workload
export function predictWorkload(
    historicalSlots: TimeSlot[],
    daysToPredict: number = 7
): WorkloadPrediction[] {
    const today = new Date();
    const predictions: WorkloadPrediction[] = [];

    // Simple moving average prediction
    for (let i = 0; i < daysToPredict; i++) {
        const predictionDate = new Date(today);
        predictionDate.setDate(predictionDate.getDate() + i);
        const dateString = predictionDate.toISOString().split('T')[0];

        // Get day of week (0-6, where 0 is Sunday)
        const dayOfWeek = predictionDate.getDay();

        // Find historical slots for the same day of week
        const sameWeekdaySlots = historicalSlots.filter(slot => {
            const slotDate = new Date(slot.date);
            return slotDate.getDay() === dayOfWeek && slot.status === 'reserved';
        });

        // Calculate average hours for this weekday
        const totalHours = sameWeekdaySlots.reduce((sum, slot) => sum + slot.duration, 0);
        const avgHours = sameWeekdaySlots.length > 0
            ? totalHours / Math.max(1, sameWeekdaySlots.length / 4) // Assuming 4 weeks of data
            : 8; // Default to 8 hours if no data

        // Add some randomness for realistic predictions
        const randomFactor = 0.9 + Math.random() * 0.2; // 0.9-1.1
        const predictedHours = Math.round(avgHours * randomFactor);

        predictions.push({
            date: dateString,
            predictedHours
        });
    }

    return predictions;
}
