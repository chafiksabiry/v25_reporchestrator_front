import config from '../config';

// Types
export interface UserProgress {
  completedPhaseIds: number[];
  inProgressPhaseId: number | null;
  completedActions: Record<number, number[]>;
}

/**
 * Service for handling user progress API calls
 */
class ProgressService {
  /**
   * Constructor - logs service initialization
   */
  constructor() {
    const mode = config.isStandalone ? 'Standalone' : 'In-App';
    console.log(`📊 Progress Service initialized (${mode} Mode)`);
  }

  /**
   * Fetch user progress data from the API
   */
  async getUserProgress(): Promise<UserProgress> {
    try {
      const userData = config.getUserData();
      console.log(`📥 Fetching progress data for user: ${userData.userId?.substring(0, 8)}...`);
      
      // For now, we'll return mock data
      // In a real implementation, this would be an API call to the backend
      
      // Example API call:
      // const response = await fetch(`/api/progress/${userData.userId}`, {
      //   headers: {
      //     'Authorization': `Bearer ${userData.token}`,
      //     'Agent-ID': userData.agentId
      //   }
      // });
      // 
      // if (!response.ok) {
      //   throw new Error(`Failed to fetch progress: ${response.status}`);
      // }
      // 
      // return await response.json();
      
      // Mock response for development
      const mockData = {
        completedPhaseIds: [1],
        inProgressPhaseId: 2,
        completedActions: {
          1: [0, 1, 2, 3, 4], // All actions in phase 1 completed
          2: [0, 1] // First two actions in phase 2 completed
        }
      };
      
      console.log('📋 User progress data retrieved:', {
        completedPhases: mockData.completedPhaseIds.length,
        inProgressPhase: mockData.inProgressPhaseId,
        completedActionsCount: Object.values(mockData.completedActions)
          .reduce((total, actions) => total + actions.length, 0)
      });
      
      return mockData;
    } catch (error) {
      console.error('❌ Error fetching user progress:', error);
      throw error;
    }
  }

  /**
   * Update a phase status
   */
  async updatePhaseStatus(phaseId: number, status: 'completed' | 'in-progress'): Promise<void> {
    try {
      const userData = config.getUserData();
      console.log(`📝 Updating phase ${phaseId} status to "${status}" for user: ${userData.userId?.substring(0, 8)}...`);
      
      // Example API call:
      // await fetch(`/api/progress/${userData.userId}/phase/${phaseId}`, {
      //   method: 'PUT',
      //   headers: {
      //     'Content-Type': 'application/json',
      //     'Authorization': `Bearer ${userData.token}`,
      //     'Agent-ID': userData.agentId
      //   },
      //   body: JSON.stringify({ status })
      // });
      
      // Mock implementation - no actual API call
      console.log(`✅ Phase ${phaseId} status updated to "${status}" successfully`);
    } catch (error) {
      console.error(`❌ Error updating phase ${phaseId} status:`, error);
      throw error;
    }
  }

  /**
   * Mark an action as completed
   */
  async completeAction(phaseId: number, actionIndex: number): Promise<void> {
    try {
      const userData = config.getUserData();
      console.log(`📝 Marking action ${actionIndex} in phase ${phaseId} as completed for user: ${userData.userId?.substring(0, 8)}...`);
      
      // Example API call:
      // await fetch(`/api/progress/${userData.userId}/phase/${phaseId}/action/${actionIndex}`, {
      //   method: 'PUT',
      //   headers: {
      //     'Content-Type': 'application/json',
      //     'Authorization': `Bearer ${userData.token}`,
      //     'Agent-ID': userData.agentId
      //   },
      //   body: JSON.stringify({ completed: true })
      // });
      
      // Mock implementation - no actual API call
      console.log(`✅ Action ${actionIndex} in phase ${phaseId} marked as completed successfully`);
    } catch (error) {
      console.error(`❌ Error marking action ${actionIndex} in phase ${phaseId} as completed:`, error);
      throw error;
    }
  }
}

export default new ProgressService(); 