// Display name -> OpenRouter model id. Only text/chat/code models are routed through OpenRouter.
export const openRouterModelIds: Record<string, string> = {
  "GPT-4o": "openai/gpt-4o",
  "GPT-4o Mini": "openai/gpt-4o-mini",
  "Claude Sonnet 5": "anthropic/claude-sonnet-5",
  "Claude Haiku 4.5": "anthropic/claude-haiku-4.5",
  "DeepSeek R1": "deepseek/deepseek-r1-0528", // deepseek/deepseek-r1 was retired by OpenRouter
  "DeepSeek V3": "deepseek/deepseek-chat",
  "Gemini 2.5 Flash": "google/gemini-2.5-flash",
  "Gemini 2.5 Pro": "google/gemini-2.5-pro",
  "Llama 3.3 70B": "meta-llama/llama-3.3-70b-instruct",
  "Mistral Large": "mistralai/mistral-large",
  "Qwen 2.5 Coder 32B": "qwen/qwen-2.5-coder-32b-instruct",
  "Qwen 2.5 72B": "qwen/qwen-2.5-72b-instruct",
  "Hermes 3 405B": "nousresearch/hermes-3-llama-3.1-405b",
  "Llama 3.1 8B": "meta-llama/llama-3.1-8b-instruct",
  "Gemma 3 12B": "google/gemma-3-12b-it",
};
