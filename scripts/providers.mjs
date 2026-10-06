// scripts/providers.mjs
//
// Fournisseurs IA utilisés par ECONOZONE.
//
// Rôles :
// - OpenAI : génération automatique de la zone "Matières premières" uniquement.
// - L'Essentiel n'est plus rédigé automatiquement par ce module : la rédaction,
//   la validation et la publication éditoriale sont pilotées depuis ChatGPT puis GitHub.
// - Gemini : fournisseur disponible pour des contrôles indépendants ; les scripts QA
//   l'appellent directement pour conserver une séparation claire entre rédaction et contrôle.
// - Claude : option technique disponible, non appelée automatiquement.
//
// Chaque fonction prend (systemPrompt, userMessage) et retourne une chaîne de texte.


// -----------------------------------------------------------------------------
// OPENAI / CHATGPT
// -----------------------------------------------------------------------------

async function callOpenAI(systemPrompt, userMessage) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error('OPENAI_API_KEY manquante');
  }

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
    })
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

  if (!text) {
    throw new Error('OpenAI API : réponse reçue mais aucun texte exploitable');
  }

  return text;
}


// -----------------------------------------------------------------------------
// GOOGLE GEMINI
// -----------------------------------------------------------------------------

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function callGemini(systemPrompt, userMessage) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error('GEMINI_API_KEY manquante');
  }

  const model = process.env.GEMINI_MODEL || 'gemini-3.6-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  const retryable = new Set([429, 500, 502, 503, 504]);
  const maxAttempts = 4;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    let res;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey
        },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: 'user', parts: [{ text: userMessage }] }],
          generationConfig: { maxOutputTokens: 10000 }
        }),
        signal: AbortSignal.timeout(60000)
      });
    } catch (error) {
      if (attempt === maxAttempts) {
        throw new Error(`Gemini API : erreur réseau après ${maxAttempts} tentatives — ${error.message}`);
      }
      const delay = 2000 * 2 ** (attempt - 1);
      console.warn(`Gemini indisponible (réseau), nouvelle tentative ${attempt + 1}/${maxAttempts} dans ${delay / 1000}s`);
      await sleep(delay);
      continue;
    }

    if (res.ok) {
      const data = await res.json();
      const candidate = data.candidates?.[0];

      if (!candidate) {
        throw new Error('Gemini API : aucun candidat retourné');
      }

      const text = candidate.content?.parts?.map(part => part.text || '')?.join('\n')?.trim();

      if (!text) {
        throw new Error('Gemini API : réponse reçue mais aucun texte exploitable');
      }

      return text;
    }

    const errorText = await res.text();
    if (!retryable.has(res.status) || attempt === maxAttempts) {
      throw new Error(`Gemini API: ${res.status} ${errorText}`);
    }

    const retryAfter = Number(res.headers.get('retry-after'));
    const delay = Number.isFinite(retryAfter) && retryAfter > 0
      ? retryAfter * 1000
      : 2000 * 2 ** (attempt - 1);

    console.warn(`Gemini API ${res.status}, nouvelle tentative ${attempt + 1}/${maxAttempts} dans ${Math.round(delay / 1000)}s`);
    await sleep(delay);
  }

  throw new Error('Gemini API : échec inattendu');
}


// -----------------------------------------------------------------------------
// CLAUDE / ANTHROPIC
//
// Conservé comme option disponible pour le développement/modification du site.
// Non appelé automatiquement dans le pipeline de publication.
// -----------------------------------------------------------------------------

async function callClaude(systemPrompt, userMessage) {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY manquante');
  }

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 10000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }]
    })
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Claude API: ${res.status} ${errorText}`);
  }

  const data = await res.json();
  const text = data.content?.filter(block => block.type === 'text')?.map(block => block.text)?.join('\n')?.trim();

  if (!text) {
    throw new Error('Claude API : réponse reçue mais aucun texte exploitable');
  }

  return text;
}


// -----------------------------------------------------------------------------
// FOURNISSEURS EXPOSÉS AU MOTEUR
// -----------------------------------------------------------------------------

export const PROVIDERS = {
  chatgpt: { label: 'ChatGPT (OpenAI)', envKey: 'OPENAI_API_KEY', call: callOpenAI },
  gemini: { label: 'Gemini (Google)', envKey: 'GEMINI_API_KEY', call: callGemini },
  claude: { label: 'Claude (Anthropic)', envKey: 'ANTHROPIC_API_KEY', call: callClaude }
};
