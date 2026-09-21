// scripts/providers.mjs
// Interface unifiée pour appeler différents fournisseurs IA avec le même prompt.
// Chaque fonction prend (systemPrompt, userMessage) et retourne une chaîne de texte.

import { CopilotClient, approveAll, ToolSet } from '@github/copilot-sdk';
import os from 'node:os';

async function callClaude(systemPrompt, userMessage) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY manquante');

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6', // à vérifier/mettre à jour périodiquement
      max_tokens: 4000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }]
    })
  });
  if (!res.ok) throw new Error(`Claude API: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return data.content.filter(b => b.type === 'text').map(b => b.text).join('\n').trim();
}

async function callOpenAI(systemPrompt, userMessage) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY manquante');

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-4o', // à vérifier/mettre à jour périodiquement
      max_tokens: 4000,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ]
    })
  });
  if (!res.ok) throw new Error(`OpenAI API: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return data.choices[0].message.content.trim();
}

async function callGemini(systemPrompt, userMessage) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY manquante');

  const model = 'gemini-2.0-flash'; // à vérifier/mettre à jour périodiquement
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: 'user', parts: [{ text: userMessage }] }]
    })
  });
  if (!res.ok) throw new Error(`Gemini API: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return data.candidates[0].content.parts.map(p => p.text).join('\n').trim();
}

async function callGrok(systemPrompt, userMessage) {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) throw new Error('XAI_API_KEY manquante');

  // L'API xAI (Grok) est compatible avec le format OpenAI
  const res = await fetch('https://api.x.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'grok-2-latest', // à vérifier/mettre à jour périodiquement
      max_tokens: 4000,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ]
    })
  });
  if (!res.ok) throw new Error(`Grok API: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return data.choices[0].message.content.trim();
}

/**
 * Copilot — passe par le vrai package @github/copilot-sdk (npm), vérifié en l'installant
 * et en inspectant son README/types réels (pas deviné).
 *
 * Deux modes, choisis automatiquement selon les secrets disponibles :
 *
 *  1) Natif (facturation Copilot) — si COPILOT_GITHUB_TOKEN est défini.
 *     Utilise un vrai modèle Copilot ("gpt-5") facturé sur votre abonnement Copilot
 *     (quota "premium requests" / Crédits IA). C'est le mode à activer plus tard si
 *     vous prenez un abonnement Copilot dédié à ce projet.
 *
 *  2) BYOK via Claude (par défaut, sans nouveau secret) — si COPILOT_GITHUB_TOKEN
 *     est absent mais ANTHROPIC_API_KEY existe déjà (secret qu'on a de toute façon
 *     pour le fournisseur "claude" ci-dessus). Le prompt passe alors par le moteur
 *     d'orchestration agentique de Copilot (Copilot SDK), mais le modèle qui répond
 *     est Claude — c'est donc "Copilot" comme infrastructure, pas comme modèle.
 *     Pas besoin de compte Copilot pour ce mode.
 *
 * Dans les deux cas, la session est fermée après une seule réponse (pas d'usage
 * des outils/agent — juste la génération de texte, pour rester cohérent avec les
 * quatre autres fournisseurs).
 */
async function callCopilot(systemPrompt, userMessage) {
  const githubToken = process.env.COPILOT_GITHUB_TOKEN;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;

  if (!githubToken && !anthropicKey) {
    throw new Error('COPILOT_GITHUB_TOKEN manquante (mode natif) et ANTHROPIC_API_KEY manquante (mode BYOK) — au moins une des deux est requise');
  }

  const client = new CopilotClient(
    githubToken
      ? { gitHubToken: githubToken }
      : { mode: 'empty', baseDirectory: os.tmpdir() }
  );
  await client.start();

  try {
    const sessionConfig = githubToken
      ? { model: 'gpt-5', onPermissionRequest: approveAll, availableTools: new ToolSet() }
      : {
          model: 'claude-sonnet-4-6',
          onPermissionRequest: approveAll,
          availableTools: new ToolSet(),
          provider: {
            type: 'anthropic',
            baseUrl: 'https://api.anthropic.com',
            apiKey: anthropicKey
          }
        };

    const session = await client.createSession(sessionConfig);

    let fullText = '';
    const done = new Promise((resolve, reject) => {
      session.on('assistant.message', (event) => {
        fullText += event.data.content;
      });
      session.on('session.error', (event) => {
        reject(new Error(event.data?.message || event.data?.error || 'Erreur de session Copilot'));
      });
      session.on('session.idle', () => resolve());
    });

    await session.send({ prompt: `${systemPrompt}\n\n${userMessage}` });
    await done;
    await session.disconnect();

    if (!fullText.trim()) {
      throw new Error('Copilot a terminé la session sans produire de texte (clé API invalide, quota épuisé, ou erreur silencieuse du fournisseur BYOK) — vérifier la clé.');
    }

    return fullText.trim();
  } finally {
    await client.stop();
  }
}

export const PROVIDERS = {
  claude: { label: 'Claude (Anthropic)', envKey: 'ANTHROPIC_API_KEY', call: callClaude },
  chatgpt: { label: 'ChatGPT (OpenAI)', envKey: 'OPENAI_API_KEY', call: callOpenAI },
  gemini: { label: 'Gemini (Google)', envKey: 'GEMINI_API_KEY', call: callGemini },
  grok: { label: 'Grok (xAI)', envKey: 'XAI_API_KEY', call: callGrok },
  copilot: { label: 'Copilot (GitHub, via Copilot SDK)', envKey: 'ANTHROPIC_API_KEY', call: callCopilot }
};
