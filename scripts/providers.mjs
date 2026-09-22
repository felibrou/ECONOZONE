// scripts/providers.mjs
// Interface unifiée pour les fournisseurs IA utilisés par L'Essentiel.
//
// Fournisseurs actifs :
// - ChatGPT / OpenAI
// - Gemini / Google
// - Grok / xAI
//
// Claude est volontairement désactivé pour le moment.
//
// Chaque fonction prend :
//   (systemPrompt, userMessage)
// et retourne une chaîne HTML générée par le modèle.


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
      // Modèle économique adapté à une génération éditoriale quotidienne.
      //
      // Alternatives :
      // gpt-5.6-terra -> meilleure qualité, plus cher
      // gpt-5.6-sol   -> qualité maximale, plus cher
      model: 'gpt-5.6-luna',

      instructions: systemPrompt,

      input: userMessage,

      max_output_tokens: 8000
    })
  });

  if (!res.ok) {
    const errorText = await res.text();

    throw new Error(
      `OpenAI API: ${res.status} ${errorText}`
    );
  }

  const data = await res.json();

  // Responses API :
  // on récupère tous les blocs output_text.
  const text =
    data.output
      ?.flatMap(item => item.content || [])
      ?.filter(item => item.type === 'output_text')
      ?.map(item => item.text)
      ?.join('\n')
      ?.trim();

  if (!text) {
    throw new Error(
      'OpenAI API : réponse reçue mais aucun texte exploitable'
    );
  }

  return text;
}


// -----------------------------------------------------------------------------
// GOOGLE GEMINI
// -----------------------------------------------------------------------------

async function callGemini(systemPrompt, userMessage) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error('GEMINI_API_KEY manquante');
  }

  // gemini-2.0-flash est retiré.
  //
  // Choix robuste :
  // gemini-2.5-flash
  //
  // Si ton compte donne accès à Gemini 3.8 Flash,
  // tu pourras ensuite remplacer par :
  // gemini-3.8-flash

  const model = 'gemini-2.5-flash';

  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/` +
    `${model}:generateContent`;

  const res = await fetch(url, {
    method: 'POST',

    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey
    },

    body: JSON.stringify({
      systemInstruction: {
        parts: [
          {
            text: systemPrompt
          }
        ]
      },

      contents: [
        {
          role: 'user',
          parts: [
            {
              text: userMessage
            }
          ]
        }
      ],

      generationConfig: {
        maxOutputTokens: 8000
      }
    })
  });

  if (!res.ok) {
    const errorText = await res.text();

    throw new Error(
      `Gemini API: ${res.status} ${errorText}`
    );
  }

  const data = await res.json();

  const candidate = data.candidates?.[0];

  if (!candidate) {
    throw new Error(
      'Gemini API : aucun candidat retourné'
    );
  }

  const text =
    candidate.content
      ?.parts
      ?.map(part => part.text || '')
      ?.join('\n')
      ?.trim();

  if (!text) {
    throw new Error(
      'Gemini API : réponse reçue mais aucun texte exploitable'
    );
  }

  return text;
}


// -----------------------------------------------------------------------------
// xAI / GROK
// -----------------------------------------------------------------------------

async function callGrok(systemPrompt, userMessage) {
  const apiKey = process.env.XAI_API_KEY;

  if (!apiKey) {
    throw new Error('XAI_API_KEY manquante');
  }

  const res = await fetch(
    'https://api.x.ai/v1/chat/completions',
    {
      method: 'POST',

      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },

      body: JSON.stringify({
        // Modèle xAI actuel.
        model: 'grok-4.7',

        max_tokens: 8000,

        messages: [
          {
            role: 'system',
            content: systemPrompt
          },

          {
            role: 'user',
            content: userMessage
          }
        ]
      })
    }
  );

  if (!res.ok) {
    const errorText = await res.text();

    throw new Error(
      `Grok API: ${res.status} ${errorText}`
    );
  }

  const data = await res.json();

  const text =
    data.choices?.[0]?.message?.content?.trim();

  if (!text) {
    throw new Error(
      'Grok API : réponse reçue mais aucun texte exploitable'
    );
  }

  return text;
}


// -----------------------------------------------------------------------------
// FOURNISSEURS EXPOSÉS AU MOTEUR
// -----------------------------------------------------------------------------

export const PROVIDERS = {

  chatgpt: {
    label: 'ChatGPT (OpenAI)',
    envKey: 'OPENAI_API_KEY',
    call: callOpenAI
  },

  gemini: {
    label: 'Gemini (Google)',
    envKey: 'GEMINI_API_KEY',
    call: callGemini
  },

  grok: {
    label: 'Grok (xAI)',
    envKey: 'XAI_API_KEY',
    call: callGrok
  }

};
