/**
 * Claude Service
 * Manages interactions with the Claude API via Anthropic Direct SDK or AWS Bedrock
 */
import AnthropicBedrock from "@anthropic-ai/bedrock-sdk";
import Anthropic from "@anthropic-ai/sdk";
import AppConfig from "./config.server";
import systemPrompts from "../prompts/prompts.json";

/**
 * Creates a Claude service instance using Anthropic Direct SDK or AWS Bedrock
 * @returns {Object} Claude service with methods for interacting with Claude API
 */
export function createClaudeService() {
  let anthropic;
  let modelName = AppConfig.api.defaultModel;

  if (process.env.CLAUDE_API_KEY) {
    console.log("Initializing Direct Anthropic API Client...");
    anthropic = new Anthropic({
      apiKey: process.env.CLAUDE_API_KEY,
    });
    // Check if the default model is AWS Bedrock specific. If so, switch to direct Anthropic equivalent.
    if (modelName.startsWith("us.anthropic.") || modelName.includes("bedrock")) {
      modelName = "claude-3-5-sonnet-latest";
    }
  } else {
    console.log("Initializing AWS Bedrock Client...");
    anthropic = new AnthropicBedrock({
      awsRegion: process.env.AWS_REGION || "us-east-1",
    });
  }

  /**
   * Streams a conversation with Claude
   * @param {Object} params - Stream parameters
   * @param {Array} params.messages - Conversation history
   * @param {string} params.promptType - The type of system prompt to use
   * @param {Array} params.tools - Available tools for Claude
   * @param {Object} streamHandlers - Stream event handlers
   * @param {Function} streamHandlers.onText - Handles text chunks
   * @param {Function} streamHandlers.onMessage - Handles complete messages
   * @param {Function} streamHandlers.onToolUse - Handles tool use requests
   * @returns {Promise<Object>} The final message
   */
  const streamConversation = async ({
    messages,
    promptType = AppConfig.api.defaultPromptType,
    tools
  }, streamHandlers) => {
    // Get system prompt from configuration or use default
    const systemInstruction = getSystemPrompt(promptType);

    // Create stream
    const stream = await anthropic.messages.stream({
      model: modelName,
      max_tokens: AppConfig.api.maxTokens,
      system: systemInstruction,
      messages,
      tools: tools && tools.length > 0 ? tools : undefined
    });

    // Set up event handlers
    if (streamHandlers.onText) {
      stream.on('text', streamHandlers.onText);
    }

    if (streamHandlers.onMessage) {
      stream.on('message', streamHandlers.onMessage);
    }

    if (streamHandlers.onContentBlock) {
      stream.on('contentBlock', streamHandlers.onContentBlock);
    }

    // Wait for final message
    const finalMessage = await stream.finalMessage();

    // Process tool use requests
    if (streamHandlers.onToolUse && finalMessage.content) {
      for (const content of finalMessage.content) {
        if (content.type === "tool_use") {
          await streamHandlers.onToolUse(content);
        }
      }
    }

    return finalMessage;
  };

  /**
   * Gets the system prompt content for a given prompt type
   * @param {string} promptType - The prompt type to retrieve
   * @returns {string} The system prompt content
   */
  const getSystemPrompt = (promptType) => {
    return systemPrompts.systemPrompts[promptType]?.content ||
      systemPrompts.systemPrompts[AppConfig.api.defaultPromptType].content;
  };

  return {
    streamConversation,
    getSystemPrompt
  };
}

export default {
  createClaudeService
};
