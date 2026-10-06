// scripts/providers.mjs
// Fournisseur IA unique d'ECONOZONE : OpenAI.

async function callOpenAI(systemPrompt, userMessage) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY manquante');

  const res = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || 'gpt-5.6-luna',
      instructions: systemPrompt,
      input: userMessage,
      max_output_tokens: 10000
    }),
    signal: AbortSignal.timeout(90000)
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`OpenAI API: ${res.status} ${errorText}`);
  }

  const data = await res.json();
  const text = data.output
    ?.flatMap(item => item.content || [])
    ?.filter(item => item.type === 'output_text')
    ?.map(item => item.text)
    ?.join('\n')
    ?.trim();

  if (!text) throw new Error('OpenAI API : réponse reçue mais aucun texte exploitable');
  return text;
}

export const PROVIDERS = {
  chatgpt: { label: 'ChatGPT (OpenAI)', envKey: 'OPENAI_API_KEY', call: callOpenAI }
};
