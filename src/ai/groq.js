const Groq = require('groq-sdk');

const AVAILABLE_MODELS = {
  'llama-4-scout-17b-16e-instruct': 'Meta Llama 4 Scout (2026)',
  'llama-4-maverick-17b-128e-instruct': 'Meta Llama 4 Maverick (2026)',
  'llama-3.3-70b-versatile': 'Meta Llama 3.3 70B',
  'mixtral-8x7b-32768': 'Mixtral 8x7B',
  'gemma2-9b-it': 'Google Gemma 2 9B',
  'deepseek-r1-distill-llama-70b': 'DeepSeek R1 70B',
  'qwen-2.5-32b': 'Qwen 2.5 32B',
  'llama-3.2-90b-vision-preview': 'Llama 3.2 90B Vision',
};

const SYSTEM_PROMPT = `You are Arynox AI, the intelligent assistant for Arynoxtech Jwellery ERP Management System - the best ever Software Product for Jewellery stores.

You help jewellery shop owners and staff with:
- Stock management queries (gold purity, weight, inventory)
- Sales and purchase advice
- Accounting and financial reports
- Karagir (artisan) management
- Daily operations guidance
- Report generation and analysis
- Business insights and recommendations

Current Date: July 2026
You have access to the latest 2026 AI models via Groq API.

Be concise, professional, and provide actionable insights. Use Indian jewellery industry terminology appropriately.`;

class GroqAI {
  constructor() {
    const Store = require('electron-store');
    const store = new Store();
    const config = store.get('config', {});
    this.apiKey = config.groqApiKey || '';
    this.client = this.apiKey ? new Groq({ apiKey: this.apiKey }) : null;
  }

  setApiKey(key) {
    this.apiKey = key;
    this.client = key ? new Groq({ apiKey: key }) : null;
  }

  getAvailableModels(apiKey) {
    return Object.entries(AVAILABLE_MODELS).map(([id, name]) => ({
      id,
      name,
      description: name
    }));
  }

  async chat(message, history = [], modelId = 'llama-4-scout-17b-16e-instruct') {
    if (!this.client) {
      throw new Error('Groq API key not configured. Go to Settings > AI Configuration to set up.');
    }

    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...history.slice(-20),
      { role: 'user', content: message }
    ];

    const response = await this.client.chat.completions.create({
      model: modelId,
      messages,
      temperature: 0.7,
      max_tokens: 4096,
      top_p: 0.95,
      stream: false,
    });

    return {
      content: response.choices[0]?.message?.content || '',
      model: response.model,
      usage: response.usage,
    };
  }
}

module.exports = GroqAI;
