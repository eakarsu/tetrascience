import https from 'https';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'anthropic/claude-haiku-4.5';

export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface OpenRouterResponse {
  text: string;
  model: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export async function callOpenRouter(
  messages: Message[],
  systemPrompt?: string
): Promise<OpenRouterResponse> {
  const requestMessages: Message[] = [];

  if (systemPrompt) {
    requestMessages.push({ role: 'system', content: systemPrompt });
  }

  requestMessages.push(...messages);

  const requestBody = JSON.stringify({
    model: OPENROUTER_MODEL,
    messages: requestMessages,
  });

  return new Promise((resolve, reject) => {
    const options: https.RequestOptions = {
      hostname: 'openrouter.ai',
      path: '/api/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'https://tetrascience.local',
        'X-Title': 'TetraScience Scientific Data Cloud',
        'Content-Length': Buffer.byteLength(requestBody),
      },
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk: Buffer) => {
        data += chunk.toString();
      });

      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);

          if (parsed.error) {
            reject(new Error(`OpenRouter API error: ${parsed.error.message || JSON.stringify(parsed.error)}`));
            return;
          }

          const choice = parsed.choices?.[0];
          if (!choice) {
            reject(new Error('No response choices returned from OpenRouter'));
            return;
          }

          resolve({
            text: choice.message?.content || '',
            model: parsed.model || OPENROUTER_MODEL,
            usage: parsed.usage
              ? {
                  prompt_tokens: parsed.usage.prompt_tokens,
                  completion_tokens: parsed.usage.completion_tokens,
                  total_tokens: parsed.usage.total_tokens,
                }
              : undefined,
          });
        } catch (parseError) {
          reject(new Error(`Failed to parse OpenRouter response: ${data}`));
        }
      });
    });

    req.on('error', (error: Error) => {
      reject(new Error(`OpenRouter request failed: ${error.message}`));
    });

    req.write(requestBody);
    req.end();
  });
}

export default callOpenRouter;
