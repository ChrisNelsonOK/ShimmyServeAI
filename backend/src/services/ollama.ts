import axios from 'axios';
import { logger } from '../utils/logger';

export interface OllamaModel {
  name: string;
  modified_at: string;
  size: number;
  digest: string;
  details: {
    format: string;
    family: string;
    families: string[];
    parameter_size: string;
    quantization_level: string;
  };
}

export interface OllamaGenerateRequest {
  model: string;
  prompt: string;
  system?: string;
  stream?: boolean;
  options?: {
    temperature?: number;
    top_p?: number;
    top_k?: number;
    max_tokens?: number;
  };
}

export interface OllamaGenerateResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
  context?: number[];
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
}

export interface OllamaChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface OllamaChatRequest {
  model: string;
  messages: OllamaChatMessage[];
  stream?: boolean;
  options?: {
    temperature?: number;
    top_p?: number;
    top_k?: number;
    max_tokens?: number;
  };
}

export class OllamaService {
  private baseUrl: string;
  private isAvailable: boolean | null = null;

  constructor(baseUrl: string = 'http://localhost:11434') {
    this.baseUrl = baseUrl;
  }

  async checkAvailability(): Promise<boolean> {
    if (this.isAvailable !== null) {
      return this.isAvailable;
    }

    try {
      const response = await axios.get(`${this.baseUrl}/api/tags`, { 
        timeout: 5000 
      });
      this.isAvailable = true;
      logger.info('ollama', 'Ollama service is available');
      return true;
    } catch (error) {
      this.isAvailable = false;
      logger.warn('ollama', 'Ollama service is not available', { 
        baseUrl: this.baseUrl,
        error: error?.toString() 
      });
      return false;
    }
  }

  async getStatus(): Promise<any> {
    try {
      const available = await this.checkAvailability();
      if (!available) {
        return {
          available: false,
          baseUrl: this.baseUrl,
          error: 'Ollama service not available'
        };
      }

      const [models, version] = await Promise.allSettled([
        this.listModels(),
        this.getVersion()
      ]);

      return {
        available: true,
        baseUrl: this.baseUrl,
        models: models.status === 'fulfilled' ? models.value : [],
        version: version.status === 'fulfilled' ? version.value : 'unknown',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('ollama', 'Failed to get Ollama status', { error: error?.toString() });
      return {
        available: false,
        baseUrl: this.baseUrl,
        error: error?.toString()
      };
    }
  }

  async listModels(): Promise<OllamaModel[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/api/tags`);
      return response.data.models || [];
    } catch (error) {
      logger.error('ollama', 'Failed to list models', { error: error?.toString() });
      return [];
    }
  }

  async getVersion(): Promise<string> {
    try {
      const response = await axios.get(`${this.baseUrl}/api/version`);
      return response.data.version || 'unknown';
    } catch (error) {
      logger.error('ollama', 'Failed to get version', { error: error?.toString() });
      return 'unknown';
    }
  }

  async pullModel(modelName: string): Promise<boolean> {
    try {
      logger.info('ollama', `Starting model pull: ${modelName}`);
      
      const response = await axios.post(`${this.baseUrl}/api/pull`, {
        name: modelName
      }, {
        timeout: 300000 // 5 minutes for model pulls
      });

      logger.info('ollama', `Model pulled successfully: ${modelName}`);
      return true;
    } catch (error) {
      logger.error('ollama', `Failed to pull model: ${modelName}`, { error: error?.toString() });
      return false;
    }
  }

  async deleteModel(modelName: string): Promise<boolean> {
    try {
      await axios.delete(`${this.baseUrl}/api/delete`, {
        data: { name: modelName }
      });
      
      logger.info('ollama', `Model deleted: ${modelName}`);
      return true;
    } catch (error) {
      logger.error('ollama', `Failed to delete model: ${modelName}`, { error: error?.toString() });
      return false;
    }
  }

  async generate(request: OllamaGenerateRequest): Promise<OllamaGenerateResponse | null> {
    try {
      const response = await axios.post(`${this.baseUrl}/api/generate`, request, {
        timeout: 60000 // 1 minute for generation
      });

      logger.info('ollama', 'Text generation completed', { 
        model: request.model,
        promptLength: request.prompt.length,
        responseLength: response.data.response?.length || 0
      });

      return response.data;
    } catch (error) {
      logger.error('ollama', 'Failed to generate text', { 
        model: request.model,
        error: error?.toString() 
      });
      return null;
    }
  }

  async chat(request: OllamaChatRequest): Promise<OllamaGenerateResponse | null> {
    try {
      const response = await axios.post(`${this.baseUrl}/api/chat`, request, {
        timeout: 60000 // 1 minute for chat
      });

      logger.info('ollama', 'Chat completed', { 
        model: request.model,
        messageCount: request.messages.length,
        responseLength: response.data.message?.content?.length || 0
      });

      return response.data;
    } catch (error) {
      logger.error('ollama', 'Failed to chat', { 
        model: request.model,
        error: error?.toString() 
      });
      return null;
    }
  }

  async embeddings(model: string, prompt: string): Promise<number[] | null> {
    try {
      const response = await axios.post(`${this.baseUrl}/api/embeddings`, {
        model,
        prompt
      });

      return response.data.embedding || null;
    } catch (error) {
      logger.error('ollama', 'Failed to get embeddings', { 
        model,
        error: error?.toString() 
      });
      return null;
    }
  }

  async show(modelName: string): Promise<any> {
    try {
      const response = await axios.post(`${this.baseUrl}/api/show`, {
        name: modelName
      });

      return response.data;
    } catch (error) {
      logger.error('ollama', `Failed to show model info: ${modelName}`, { error: error?.toString() });
      return null;
    }
  }

  async copy(source: string, destination: string): Promise<boolean> {
    try {
      await axios.post(`${this.baseUrl}/api/copy`, {
        source,
        destination
      });

      logger.info('ollama', `Model copied: ${source} -> ${destination}`);
      return true;
    } catch (error) {
      logger.error('ollama', `Failed to copy model: ${source} -> ${destination}`, { error: error?.toString() });
      return false;
    }
  }

  // Convenience methods for common use cases
  async askQuestion(model: string, question: string, context?: string): Promise<string | null> {
    try {
      const systemPrompt = context || "You are a helpful AI assistant. Provide clear, accurate, and concise answers.";
      
      const response = await this.generate({
        model,
        prompt: question,
        system: systemPrompt,
        options: {
          temperature: 0.7,
          max_tokens: 1000
        }
      });

      return response?.response || null;
    } catch (error) {
      logger.error('ollama', 'Failed to ask question', { 
        model,
        question: question.substring(0, 100),
        error: error?.toString() 
      });
      return null;
    }
  }

  async summarizeText(model: string, text: string): Promise<string | null> {
    try {
      const prompt = `Please provide a concise summary of the following text:\n\n${text}`;
      
      const response = await this.generate({
        model,
        prompt,
        system: "You are an expert at summarizing text. Provide clear, concise summaries that capture the key points.",
        options: {
          temperature: 0.3,
          max_tokens: 500
        }
      });

      return response?.response || null;
    } catch (error) {
      logger.error('ollama', 'Failed to summarize text', { 
        model,
        textLength: text.length,
        error: error?.toString() 
      });
      return null;
    }
  }

  async analyzeSystem(model: string, systemData: any): Promise<string | null> {
    try {
      const prompt = `Analyze the following system data and provide insights, recommendations, and any issues you notice:\n\n${JSON.stringify(systemData, null, 2)}`;
      
      const response = await this.generate({
        model,
        prompt,
        system: "You are a system administrator and performance analyst. Analyze system data and provide actionable insights.",
        options: {
          temperature: 0.5,
          max_tokens: 1500
        }
      });

      return response?.response || null;
    } catch (error) {
      logger.error('ollama', 'Failed to analyze system', { 
        model,
        error: error?.toString() 
      });
      return null;
    }
  }

  async getAvailableModels(): Promise<string[]> {
    try {
      const models = await this.listModels();
      return models.map(model => model.name);
    } catch (error) {
      logger.error('ollama', 'Failed to get available models', { error: error?.toString() });
      return [];
    }
  }

  async isModelAvailable(modelName: string): Promise<boolean> {
    try {
      const models = await this.getAvailableModels();
      return models.includes(modelName);
    } catch (error) {
      return false;
    }
  }

  async ensureModelAvailable(modelName: string): Promise<boolean> {
    try {
      const isAvailable = await this.isModelAvailable(modelName);
      if (isAvailable) {
        return true;
      }

      logger.info('ollama', `Model ${modelName} not found, attempting to pull...`);
      return await this.pullModel(modelName);
    } catch (error) {
      logger.error('ollama', `Failed to ensure model availability: ${modelName}`, { error: error?.toString() });
      return false;
    }
  }
}