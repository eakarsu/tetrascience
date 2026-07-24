import { parseOpenRouterResponse } from '../../src/services/openrouterEvidence';

test('extracts substantive OpenRouter content with a durable receipt', () => {
  expect(parseOpenRouterResponse({ id: 'request-123', model: 'provider/model', choices: [{ message: { content: 'Review source traceability, exception ownership, and human release controls.' } }] }, 'configured/model')).toEqual({
    content: 'Review source traceability, exception ownership, and human release controls.',
    receipt: { requestId: 'request-123', model: 'provider/model', provider: 'openrouter' },
  });
});

test('rejects missing or trivial provider evidence', () => {
  expect(() => parseOpenRouterResponse({ id: 'request-123', choices: [{ message: { content: 'Too short' } }] }, 'configured/model')).toThrow(/incomplete evidence/);
});
