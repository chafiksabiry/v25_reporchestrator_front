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
          2: [0, 1] // First two actions in phase 2 completed (required actions)
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
   * Check if all required actions are completed for a phase
   */
  async areRequiredActionsCompleted(phaseId: number, requiredActionsCount: number): Promise<boolean> {
    try {
      const userData = config.getUserData();
      console.log(`🔍 Checking required actions for phase ${phaseId} for user: ${userData.userId?.substring(0, 8)}...`);
      
      // In a real implementation, this would be an API call
      // For now, we'll use the mock data
      const progress = await this.getUserProgress();
      const completedActions = progress.completedActions[phaseId] || [];
      
      // Check if all required actions are completed (required actions are the first N actions)
      for (let i = 0; i < requiredActionsCount; i++) {
        if (!completedActions.includes(i)) {
          return false;
        }
      }
      
      console.log(`✅ All required actions for phase ${phaseId} are completed`);
      return true;
    } catch (error) {
      console.error(`❌ Error checking required actions for phase ${phaseId}:`, error);
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
   * Get action completion status from the backend
   * This method would call the API to check if specific actions are completed
   * based on user's activity in the system, not manual clicks
   */
  async checkActionCompletionStatus(phaseId: number, actionIndex: number): Promise<boolean> {
    try {
      const userData = config.getUserData();
      console.log(`🔍 Checking automatic completion status for action ${actionIndex} in phase ${phaseId}`);
      
      // Example API call:
      // const response = await fetch(`/api/progress/${userData.userId}/phase/${phaseId}/action/${actionIndex}/status`, {
      //   headers: {
      //     'Authorization': `Bearer ${userData.token}`,
      //     'Agent-ID': userData.agentId
      //   }
      // });
      // 
      // if (!response.ok) {
      //   throw new Error(`Failed to check action status: ${response.status}`);
      // }
      // 
      // const data = await response.json();
      // return data.completed;
      
      // Mock implementation for development
      // In a real implementation, this would check various conditions to determine if an action is completed
      // For example:
      // - Phase 1, Action 0 (Create account): Check if user account exists
      // - Phase 1, Action 1 (Verify email): Check if email is verified
      // - Phase 2, Action 0 (Upload photo): Check if profile has a photo
      
      // Mock logic: Just return data from our mock structure
      const progress = await this.getUserProgress();
      const completedActions = progress.completedActions[phaseId] || [];
      return completedActions.includes(actionIndex);
    } catch (error) {
      console.error(`❌ Error checking action completion status for action ${actionIndex} in phase ${phaseId}:`, error);
      throw error;
    }
  }

  /**
   * Synchronize action completion status with the backend for all actions in a phase
   * This would be called periodically to update the UI based on backend status
   */
  async syncPhaseProgress(phaseId: number, requiredActionsCount: number, optionalActionsCount: number): Promise<Record<number, boolean>> {
    try {
      const userData = config.getUserData();
      console.log(`🔄 Syncing progress for phase ${phaseId} with backend`);
      
      // In a real implementation, this would make a batch API call to get all action statuses at once
      // For our demo, we'll check each action individually
      
      const results: Record<number, boolean> = {};
      const totalActions = requiredActionsCount + optionalActionsCount;
      
      // Check each action's completion status from the backend
      for (let i = 0; i < totalActions; i++) {
        results[i] = await this.checkActionCompletionStatus(phaseId, i);
      }
      
      // Example API call for bulk checking:
      // const response = await fetch(`/api/progress/${userData.userId}/phase/${phaseId}/actions/status`, {
      //   headers: {
      //     'Authorization': `Bearer ${userData.token}`,
      //     'Agent-ID': userData.agentId
      //   }
      // });
      // 
      // if (!response.ok) {
      //   throw new Error(`Failed to sync phase progress: ${response.status}`);
      // }
      // 
      // const data = await response.json();
      // return data.actionStatuses;
      
      console.log(`✅ Phase ${phaseId} progress synced with backend:`, results);
      return results;
    } catch (error) {
      console.error(`❌ Error syncing phase progress for phase ${phaseId}:`, error);
      throw error;
    }
  }

  /**
   * Auto-advance to next phase if all required actions are completed
   */
  async autoAdvancePhaseIfReady(currentPhaseId: number, requiredActionsCount: number): Promise<boolean> {
    try {
      const userData = config.getUserData();
      console.log(`🔍 Checking if phase ${currentPhaseId} can be auto-advanced`);
      
      const canProceed = await this.canProceedToNextPhase(currentPhaseId, requiredActionsCount);
      
      if (canProceed) {
        const nextPhaseId = currentPhaseId + 1;
        console.log(`✅ Auto-advancing to phase ${nextPhaseId}`);
        await this.updatePhaseStatus(nextPhaseId, 'in-progress');
        return true;
      }
      
      return false;
    } catch (error) {
      console.error(`❌ Error auto-advancing phase ${currentPhaseId}:`, error);
      throw error;
    }
  }

  /**
   * Check if the user can proceed to the next phase
   */
  async canProceedToNextPhase(currentPhaseId: number, requiredActionsCount: number): Promise<boolean> {
    try {
      // User can proceed if the current phase is completed or all required actions are completed
      const userProgress = await this.getUserProgress();
      
      if (userProgress.completedPhaseIds.includes(currentPhaseId)) {
        return true;
      }
      
      return await this.areRequiredActionsCompleted(currentPhaseId, requiredActionsCount);
    } catch (error) {
      console.error(`❌ Error checking if user can proceed from phase ${currentPhaseId}:`, error);
      throw error;
    }
  }
}

export default new ProgressService(); 