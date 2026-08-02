import OpenAI from 'openai';

class OpenAIClient {
  constructor() {
    this.client = null;
    this.initializeClient();
  }

  initializeClient() {
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
    if (!apiKey) {
      console.warn('OpenAI API key is missing. Some features will be disabled.');
      return;
    }
    
    try {
      this.client = new OpenAI({
        apiKey,
        dangerouslyAllowBrowser: true
      });
    } catch (error) {
      console.error('Failed to initialize OpenAI client:', error);
    }
  }

  ensureClient() {
    if (!this.client) {
      throw new Error(
        'OpenAI features are not available. Please check your OpenAI API key configuration.'
      );
    }
  }

  async createChatCompletion(messages, options = {}) {
    this.ensureClient();
    
    try {
      const response = await this.client.chat.completions.create({
        model: options.model || "gpt-3.5-turbo",
        messages,
        temperature: options.temperature || 0.7,
        max_tokens: options.max_tokens || 1000,
        ...options
      });

      if (!response?.choices?.[0]?.message?.content) {
        throw new Error('Invalid response from OpenAI API');
      }

      return response.choices[0].message.content;
    } catch (error) {
      console.error('OpenAI API error:', error);
      throw new Error(this.getErrorMessage(error));
    }
  }

  async createJsonChatCompletion(messages, options = {}) {
    this.ensureClient();

    // Ensure the system message contains the word "json" when using JSON response format
    const modifiedMessages = messages.map(msg => {
      if (msg.role === 'system') {
        return {
          ...msg,
          content: `Return response as JSON. ${msg.content}`
        };
      }
      return msg;
    });
    
    try {
      const response = await this.client.chat.completions.create({
        model: options.model || "gpt-3.5-turbo",
        messages: modifiedMessages,
        temperature: options.temperature || 0.3,
        response_format: { type: "json_object" },
        max_tokens: options.max_tokens || 2000,
        ...options
      });

      if (!response?.choices?.[0]?.message?.content) {
        throw new Error('Invalid response from OpenAI API');
      }

      let parsedResponse;
      try {
        parsedResponse = JSON.parse(response.choices[0].message.content);
      } catch (parseError) {
        console.error('Failed to parse JSON response:', parseError);
        throw new Error('Invalid JSON response from OpenAI API');
      }

      if (!parsedResponse || typeof parsedResponse !== 'object') {
        throw new Error('Invalid JSON structure in OpenAI response');
      }

      return parsedResponse;
    } catch (error) {
      if (error.response?.status === 401) {
        throw new Error('Invalid OpenAI API key. Please check your configuration.');
      }
      if (error.response?.status === 429) {
        throw new Error('OpenAI API rate limit exceeded. Please try again in a few moments.');
      }
      if (error.response?.status === 500) {
        throw new Error('OpenAI service error. Please try again later.');
      }
      
      console.error('OpenAI API error:', error);
      throw new Error(this.getErrorMessage(error));
    }
  }

  getErrorMessage(error) {
    // Handle specific OpenAI API errors
    if (error.code === 'invalid_api_key') {
      return 'Invalid OpenAI API key. Please check your configuration.';
    }
    if (error.code === 'insufficient_quota') {
      return 'OpenAI API quota exceeded. Please check your usage limits.';
    }
    if (error.code === 'rate_limit_exceeded') {
      return 'OpenAI API rate limit exceeded. Please try again in a few moments.';
    }
    if (error.code === 'context_length_exceeded') {
      return 'Text is too long for processing. Please try with a shorter text.';
    }
    if (error.message?.includes('JSON')) {
      return 'Failed to process the response format. Please try again.';
    }

    // Handle network and other errors
    if (error.message?.includes('Failed to fetch') || error.message?.includes('Network Error')) {
      return 'Network error. Please check your internet connection.';
    }

    return error.message || 'An unexpected error occurred. Please try again.';
  }

  validateJsonResponse(json, requiredFields = []) {
    if (!json || typeof json !== 'object') {
      throw new Error('Invalid response structure');
    }

    const missingFields = requiredFields.filter(field => !(field in json));
    if (missingFields.length > 0) {
      throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
    }

    // Ensure arrays are properly initialized
    Object.entries(json).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        json[key] = value.filter(item => item !== null && item !== undefined);
      } else if (value === null || value === undefined) {
        if (requiredFields.includes(key)) {
          json[key] = typeof value === 'string' ? '' : [];
        }
      }
    });

    return json;
  }
}

export default new OpenAIClient();