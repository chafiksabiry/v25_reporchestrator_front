// Mock AI service for development
class AIService {
  async generateEmailResponse(context: string): Promise<string> {
    // Mock response
    return `Thank you for reaching out about "${context}". We're here to help...`;
  }

  async analyzeSentiment(text: string): Promise<'positive' | 'neutral' | 'negative'> {
    // Mock sentiment analysis
    const keywords = {
      positive: ['happy', 'great', 'excellent', 'good', 'thanks', 'appreciate'],
      negative: ['bad', 'poor', 'issue', 'problem', 'unhappy', 'disappointed']
    };

    text = text.toLowerCase();
    
    const hasPositive = keywords.positive.some(word => text.includes(word));
    const hasNegative = keywords.negative.some(word => text.includes(word));

    if (hasPositive && !hasNegative) return 'positive';
    if (hasNegative && !hasPositive) return 'negative';
    return 'neutral';
  }

  async suggestQuickResponses(context: string): Promise<string[]> {
    // Mock quick responses
    return [
      `I understand your concern about "${context}". Let me help you with that.`,
      `Thank you for bringing this to our attention. Here's what we can do...`,
      `I'd be happy to assist you with your ${context} inquiry.`
    ];
  }
}

export { AIService }