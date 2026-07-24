import { required } from '../core/runtime';

export interface OpenRouterReceipt {
  requestId: string;
  model: string;
  provider: 'openrouter';
}

export interface OpenRouterEvidence {
  content: string;
  receipt: OpenRouterReceipt;
}

interface OpenRouterResponse {
  id?: unknown;
  model?: unknown;
  choices?: Array<{ message?: { content?: unknown } }>;
  error?: { message?: unknown };
}

export function parseOpenRouterResponse(payload: OpenRouterResponse, configuredModel: string): OpenRouterEvidence {
  const requestId = typeof payload.id === 'string' ? payload.id.trim() : '';
  const model = typeof payload.model === 'string' ? payload.model.trim() : configuredModel;
  const content = typeof payload.choices?.[0]?.message?.content === 'string' ? payload.choices[0].message.content.trim() : '';
  if (!requestId || !model || content.length < 40) throw new Error('OpenRouter returned incomplete evidence');
  return { content, receipt: { requestId, model, provider: 'openrouter' } };
}

export async function generateAssayReadinessEvidence(workflowSummary: string): Promise<OpenRouterEvidence> {
  const apiKey = required('OPENROUTER_API_KEY', 20);
  const model = required('OPENROUTER_MODEL');
  const baseUrl = required('OPENROUTER_BASE_URL');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45_000);
  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost',
        'X-Title': 'TetraScience Runtime Verification',
      },
      body: JSON.stringify({
        model,
        temperature: 0.1,
        messages: [
          {
            role: 'system',
            content: 'You are an assay-operations readiness assistant. Analyze only the deidentified administrative workflow summary. Return concise operational checks, missing evidence, and escalation questions. Never approve, release, reject, diagnose, or modify assay evidence; qualified humans retain every regulated decision.',
          },
          { role: 'user', content: workflowSummary },
        ],
      }),
      signal: controller.signal,
    });
    const payload = await response.json() as OpenRouterResponse;
    if (!response.ok) {
      const providerMessage = typeof payload.error?.message === 'string' ? payload.error.message : `HTTP ${response.status}`;
      throw new Error(`OpenRouter request failed: ${providerMessage}`);
    }
    return parseOpenRouterResponse(payload, model);
  } finally {
    clearTimeout(timeout);
  }
}
