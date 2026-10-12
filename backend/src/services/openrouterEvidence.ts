import { DomainError } from '../core/domain';

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
  choices?: Array<{ finish_reason?: string; message?: { content?: unknown; refusal?: unknown } }>;
  error?: { message?: unknown };
}

export function parseOpenRouterResponse(payload: OpenRouterResponse, configuredModel: string): OpenRouterEvidence {
  const requestId = typeof payload.id === 'string' ? payload.id.trim() : '';
  const model = typeof payload.model === 'string' ? payload.model.trim() : configuredModel;
  const content = typeof payload.choices?.[0]?.message?.content === 'string' ? payload.choices[0].message.content.trim() : '';
  if (!requestId || !model || content.length < 40) throw new Error('OpenRouter returned incomplete evidence');
  return { content, receipt: { requestId, model, provider: 'openrouter' } };
}

export async function generateAssayReadinessEvidence(workflowSummary: string, signal?: AbortSignal): Promise<OpenRouterEvidence> {
  const apiKey = String(process.env.OPENROUTER_API_KEY || '').trim();
  const model = String(process.env.OPENROUTER_MODEL || '').trim();
  const baseUrl = String(process.env.OPENROUTER_BASE_URL || '').replace(/\/+$/, '');
  if (apiKey.length < 20 || !model || baseUrl !== 'https://openrouter.ai/api/v1') throw new DomainError(503, 'AI_NOT_CONFIGURED', 'Canonical OpenRouter configuration is required');
  signal?.throwIfAborted();
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
      signal: signal ? AbortSignal.any([signal, controller.signal]) : controller.signal,
    });
    const payload = await response.json() as OpenRouterResponse;
    signal?.throwIfAborted();
    const choice = payload?.choices?.[0];
    if (!response.ok || payload?.error || choice?.finish_reason !== 'stop' || choice.message?.refusal || typeof payload?.model !== 'string' || !payload.model.trim()) throw new DomainError(502, 'AI_PROVIDER_INVALID', 'OpenRouter did not return complete advisory evidence');
    return parseOpenRouterResponse(payload, model);
  } catch (error) {
    if (signal?.aborted) throw error;
    if (error instanceof DomainError) throw error;
    throw new DomainError(502, 'AI_PROVIDER_FAILED', 'OpenRouter could not complete the assay operations advisory');
  } finally {
    clearTimeout(timeout);
  }
}
