// Cloudflare Pages Function — proxy sécurisé vers l'API Anthropic.
// Chemin public automatique : /api/ocr
// La clé reste secrète côté serveur (variable d'environnement ANTHROPIC_API_KEY).

export async function onRequestPost(context) {
  const { request, env } = context;
  try {
    if (!env.ANTHROPIC_API_KEY) {
      return json({ error: { message: "ANTHROPIC_API_KEY non configurée sur le serveur." } }, 500);
    }
    const body = await request.json();

    // Garde-fous anti-abus : on ne laisse passer que ce qui est nécessaire.
    const safe = {
      model: typeof body.model === "string" ? body.model : "claude-sonnet-4-6",
      max_tokens: clamp(parseInt(body.max_tokens) || 1024, 256, 8000),
      messages: Array.isArray(body.messages) ? body.messages : [],
    };

    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(safe),
    });

    const text = await r.text();
    return new Response(text, {
      status: r.status,
      headers: { "content-type": "application/json", "cache-control": "no-store" },
    });
  } catch (e) {
    return json({ error: { message: String((e && e.message) || e) } }, 500);
  }
}

function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }
function json(o, s) {
  return new Response(JSON.stringify(o), { status: s || 200, headers: { "content-type": "application/json" } });
}
