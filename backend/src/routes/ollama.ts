import express from 'express';
import { OllamaService } from '../services/ollama';
import { logger } from '../utils/logger';
import { authenticateToken, optionalAuth } from './auth';

const router = express.Router();
const ollamaService = new OllamaService();

// Get Ollama status and overview
router.get('/status', optionalAuth, async (req, res) => {
  try {
    logger.info('ollama', 'Ollama status requested');
    const status = await ollamaService.getStatus();
    
    res.json({
      success: true,
      data: status
    });

  } catch (error) {
    logger.error('ollama', 'Failed to get Ollama status', { error: error?.toString() });
    res.status(500).json({
      error: 'Failed to get Ollama status',
      details: error?.toString()
    });
  }
});

// List available models
router.get('/models', optionalAuth, async (req, res) => {
  try {
    logger.info('ollama', 'Models list requested');
    const models = await ollamaService.listModels();
    
    res.json({
      success: true,
      data: models,
      count: models.length
    });

  } catch (error) {
    logger.error('ollama', 'Failed to list models', { error: error?.toString() });
    res.status(500).json({
      error: 'Failed to list models',
      details: error?.toString()
    });
  }
});

// Get Ollama version
router.get('/version', optionalAuth, async (req, res) => {
  try {
    logger.info('ollama', 'Version requested');
    const version = await ollamaService.getVersion();
    
    res.json({
      success: true,
      data: { version }
    });

  } catch (error) {
    logger.error('ollama', 'Failed to get version', { error: error?.toString() });
    res.status(500).json({
      error: 'Failed to get version',
      details: error?.toString()
    });
  }
});

// Pull a model
router.post('/models/pull', authenticateToken, async (req, res) => {
  try {
    const { modelName } = req.body;
    
    if (!modelName) {
      return res.status(400).json({
        error: 'Model name is required'
      });
    }

    logger.info('ollama', `Pulling model: ${modelName}`);
    const success = await ollamaService.pullModel(modelName);
    
    if (success) {
      res.json({
        success: true,
        message: `Model ${modelName} pulled successfully`
      });
    } else {
      res.status(400).json({
        error: `Failed to pull model ${modelName}`
      });
    }

  } catch (error) {
    logger.error('ollama', 'Failed to pull model', { error: error?.toString() });
    res.status(500).json({
      error: 'Failed to pull model',
      details: error?.toString()
    });
  }
});

// Delete a model
router.delete('/models/:name', authenticateToken, async (req, res) => {
  try {
    const { name } = req.params;
    
    logger.info('ollama', `Deleting model: ${name}`);
    const success = await ollamaService.deleteModel(name);
    
    if (success) {
      res.json({
        success: true,
        message: `Model ${name} deleted successfully`
      });
    } else {
      res.status(400).json({
        error: `Failed to delete model ${name}`
      });
    }

  } catch (error) {
    logger.error('ollama', 'Failed to delete model', { error: error?.toString() });
    res.status(500).json({
      error: 'Failed to delete model',
      details: error?.toString()
    });
  }
});

// Generate text
router.post('/generate', authenticateToken, async (req, res) => {
  try {
    const { model, prompt, system, options = {} } = req.body;
    
    if (!model || !prompt) {
      return res.status(400).json({
        error: 'Model and prompt are required'
      });
    }

    logger.info('ollama', 'Text generation requested', { 
      model, 
      promptLength: prompt.length 
    });
    
    const response = await ollamaService.generate({
      model,
      prompt,
      system,
      options: {
        temperature: options.temperature || 0.7,
        top_p: options.top_p,
        top_k: options.top_k,
        max_tokens: options.max_tokens || 1000
      }
    });
    
    if (response) {
      res.json({
        success: true,
        data: response
      });
    } else {
      res.status(400).json({
        error: 'Failed to generate text'
      });
    }

  } catch (error) {
    logger.error('ollama', 'Failed to generate text', { error: error?.toString() });
    res.status(500).json({
      error: 'Failed to generate text',
      details: error?.toString()
    });
  }
});

// Chat with a model
router.post('/chat', authenticateToken, async (req, res) => {
  try {
    const { model, messages, options = {} } = req.body;
    
    if (!model || !messages || !Array.isArray(messages)) {
      return res.status(400).json({
        error: 'Model and messages array are required'
      });
    }

    logger.info('ollama', 'Chat requested', { 
      model, 
      messageCount: messages.length 
    });
    
    const response = await ollamaService.chat({
      model,
      messages,
      options: {
        temperature: options.temperature || 0.7,
        top_p: options.top_p,
        top_k: options.top_k,
        max_tokens: options.max_tokens || 1000
      }
    });
    
    if (response) {
      res.json({
        success: true,
        data: response
      });
    } else {
      res.status(400).json({
        error: 'Failed to chat with model'
      });
    }

  } catch (error) {
    logger.error('ollama', 'Failed to chat', { error: error?.toString() });
    res.status(500).json({
      error: 'Failed to chat with model',
      details: error?.toString()
    });
  }
});

// Get embeddings
router.post('/embeddings', authenticateToken, async (req, res) => {
  try {
    const { model, prompt } = req.body;
    
    if (!model || !prompt) {
      return res.status(400).json({
        error: 'Model and prompt are required'
      });
    }

    logger.info('ollama', 'Embeddings requested', { model });
    const embeddings = await ollamaService.embeddings(model, prompt);
    
    if (embeddings) {
      res.json({
        success: true,
        data: {
          model,
          prompt,
          embeddings,
          dimensions: embeddings.length
        }
      });
    } else {
      res.status(400).json({
        error: 'Failed to get embeddings'
      });
    }

  } catch (error) {
    logger.error('ollama', 'Failed to get embeddings', { error: error?.toString() });
    res.status(500).json({
      error: 'Failed to get embeddings',
      details: error?.toString()
    });
  }
});

// Show model information
router.get('/models/:name', optionalAuth, async (req, res) => {
  try {
    const { name } = req.params;
    
    logger.info('ollama', `Model info requested: ${name}`);
    const modelInfo = await ollamaService.show(name);
    
    if (modelInfo) {
      res.json({
        success: true,
        data: modelInfo
      });
    } else {
      res.status(404).json({
        error: `Model ${name} not found`
      });
    }

  } catch (error) {
    logger.error('ollama', 'Failed to get model info', { error: error?.toString() });
    res.status(500).json({
      error: 'Failed to get model info',
      details: error?.toString()
    });
  }
});

// Copy a model
router.post('/models/copy', authenticateToken, async (req, res) => {
  try {
    const { source, destination } = req.body;
    
    if (!source || !destination) {
      return res.status(400).json({
        error: 'Source and destination model names are required'
      });
    }

    logger.info('ollama', `Copying model: ${source} -> ${destination}`);
    const success = await ollamaService.copy(source, destination);
    
    if (success) {
      res.json({
        success: true,
        message: `Model copied from ${source} to ${destination}`
      });
    } else {
      res.status(400).json({
        error: `Failed to copy model from ${source} to ${destination}`
      });
    }

  } catch (error) {
    logger.error('ollama', 'Failed to copy model', { error: error?.toString() });
    res.status(500).json({
      error: 'Failed to copy model',
      details: error?.toString()
    });
  }
});

// Convenience endpoints for common use cases

// Ask a question
router.post('/ask', authenticateToken, async (req, res) => {
  try {
    const { model, question, context } = req.body;
    
    if (!model || !question) {
      return res.status(400).json({
        error: 'Model and question are required'
      });
    }

    logger.info('ollama', 'Question asked', { model });
    const answer = await ollamaService.askQuestion(model, question, context);
    
    if (answer) {
      res.json({
        success: true,
        data: {
          model,
          question,
          answer,
          context: context || null
        }
      });
    } else {
      res.status(400).json({
        error: 'Failed to get answer'
      });
    }

  } catch (error) {
    logger.error('ollama', 'Failed to ask question', { error: error?.toString() });
    res.status(500).json({
      error: 'Failed to ask question',
      details: error?.toString()
    });
  }
});

// Summarize text
router.post('/summarize', authenticateToken, async (req, res) => {
  try {
    const { model, text } = req.body;
    
    if (!model || !text) {
      return res.status(400).json({
        error: 'Model and text are required'
      });
    }

    logger.info('ollama', 'Text summarization requested', { 
      model, 
      textLength: text.length 
    });
    
    const summary = await ollamaService.summarizeText(model, text);
    
    if (summary) {
      res.json({
        success: true,
        data: {
          model,
          originalLength: text.length,
          summary,
          summaryLength: summary.length
        }
      });
    } else {
      res.status(400).json({
        error: 'Failed to summarize text'
      });
    }

  } catch (error) {
    logger.error('ollama', 'Failed to summarize text', { error: error?.toString() });
    res.status(500).json({
      error: 'Failed to summarize text',
      details: error?.toString()
    });
  }
});

// Analyze system data
router.post('/analyze-system', authenticateToken, async (req, res) => {
  try {
    const { model, systemData } = req.body;
    
    if (!model || !systemData) {
      return res.status(400).json({
        error: 'Model and system data are required'
      });
    }

    logger.info('ollama', 'System analysis requested', { model });
    const analysis = await ollamaService.analyzeSystem(model, systemData);
    
    if (analysis) {
      res.json({
        success: true,
        data: {
          model,
          analysis,
          systemData: systemData
        }
      });
    } else {
      res.status(400).json({
        error: 'Failed to analyze system data'
      });
    }

  } catch (error) {
    logger.error('ollama', 'Failed to analyze system', { error: error?.toString() });
    res.status(500).json({
      error: 'Failed to analyze system',
      details: error?.toString()
    });
  }
});

// Check if model is available
router.get('/models/:name/available', optionalAuth, async (req, res) => {
  try {
    const { name } = req.params;
    
    const isAvailable = await ollamaService.isModelAvailable(name);
    
    res.json({
      success: true,
      data: {
        model: name,
        available: isAvailable
      }
    });

  } catch (error) {
    logger.error('ollama', 'Failed to check model availability', { error: error?.toString() });
    res.status(500).json({
      error: 'Failed to check model availability',
      details: error?.toString()
    });
  }
});

// Ensure model is available (pull if needed)
router.post('/models/:name/ensure', authenticateToken, async (req, res) => {
  try {
    const { name } = req.params;
    
    logger.info('ollama', `Ensuring model availability: ${name}`);
    const success = await ollamaService.ensureModelAvailable(name);
    
    if (success) {
      res.json({
        success: true,
        message: `Model ${name} is now available`
      });
    } else {
      res.status(400).json({
        error: `Failed to ensure model ${name} availability`
      });
    }

  } catch (error) {
    logger.error('ollama', 'Failed to ensure model availability', { error: error?.toString() });
    res.status(500).json({
      error: 'Failed to ensure model availability',
      details: error?.toString()
    });
  }
});

export { router as ollamaRoutes };