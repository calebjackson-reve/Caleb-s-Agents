// calebjackson.org chat: Cloudflare Worker in front of the xAI Grok API.
// Holds the API key, enforces origin and rate limits, streams replies, captures leads.

import { SYSTEM_PROMPT, LEAD_TOOL } from './prompt.js';

const MAX_TURNS = 12;          // messages of history kept per request
const MAX_CHARS = 1500;        // per message from the visitor
const MAX_PER_HOUR = 40;       // messages per IP per hour
const MAX_TOKENS = 400;        // per reply

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin') || '';
    const cors = corsHeaders(origin, env);

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (url.pathname === '/' || url.pathname === '/health') {
      return json({ ok: true, service: 'calebjackson-chat', model: model(env) }, 200, cors);
    }
    if (url.pathname === '/chat' && request.method === 'POST') {
      if (!originAllowed(origin, env)) return json({ error: 'origin not allowed' }, 403, cors);
      return handleChat(request, env, cors);
    }
    return json({ error: 'not found' }, 404, cors);
  }
};

function model(env) { return env.GROK_MODEL || 'grok-4-1-fast-non-reasoning'; }
function baseUrl(env) { return (env.XAI_BASE_URL || 'https://api.x.ai/v1').replace(/\/$/, ''); }

function allowedOrigins(env) {
  return (env.ALLOWED_ORIGINS || 'https://calebjackson.org,https://www.calebjackson.org')
    .split(',').map(s => s.trim()).filter(Boolean);
}
function originAllowed(origin, env) {
  if (!origin) return false;
  return allowedOrigins(env).includes(origin);
}
function corsHeaders(origin, env) {
  const h = {
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin'
  };
  if (originAllowed(origin, env)) h['Access-Control-Allow-Origin'] = origin;
  return h;
}
function json(body, status, headers) {
  return new Response(JSON.stringify(body), { status, headers: { ...headers, 'Content-Type': 'application/json' } });
}

async function rateLimited(request, env) {
  if (!env.RATE) return false;
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const bucket = Math.floor(Date.now() / 3600000);
  const key = `rl:${ip}:${bucket}`;
  const n = parseInt((await env.RATE.get(key)) || '0', 10) + 1;
  await env.RATE.put(key, String(n), { expirationTtl: 3700 });
  return n > MAX_PER_HOUR;
}

function cleanHistory(messages) {
  if (!Array.isArray(messages)) return [];
  return messages
    .filter(m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .map(m => ({ role: m.role, content: m.content.slice(0, MAX_CHARS) }))
    .slice(-MAX_TURNS);
}

async function handleChat(request, env, cors) {
  if (!env.XAI_API_KEY) return json({ error: 'XAI_API_KEY is not set' }, 500, cors);
  if (await rateLimited(request, env)) return json({ error: 'Too many messages. Call (225) 747-0303 and Caleb will pick up.' }, 429, cors);

  let body;
  try { body = await request.json(); } catch { return json({ error: 'bad json' }, 400, cors); }
  const history = cleanHistory(body.messages);
  if (!history.length || history[history.length - 1].role !== 'user') return json({ error: 'last message must be from the visitor' }, 400, cors);
  const session = String(body.session || '').slice(0, 64);

  const messages = [{ role: 'system', content: SYSTEM_PROMPT }, ...history];
  const enc = new TextEncoder();
  const upstream = new AbortController();
  let gone = false;
  request.signal.addEventListener('abort', () => { gone = true; upstream.abort(); });

  // The response body drives the work. If the visitor leaves, cancel() fires and xAI is cut off.
  const stream = new ReadableStream({
    start(controller) {
      const send = async (obj) => { if (!gone) controller.enqueue(enc.encode(`data: ${JSON.stringify(obj)}\n\n`)); };
      (async () => {
        try {
          // Round 1: may answer directly or call capture_lead.
          const first = await streamGrok(env, messages, send, true, upstream.signal);
          if (first.toolCalls.length) {
            const assistantMsg = { role: 'assistant', content: first.text || null, tool_calls: first.toolCalls };
            const toolMsgs = [];
            for (const call of first.toolCalls) {
              let args = {};
              try { args = JSON.parse(call.function.arguments || '{}'); } catch {}
              const result = await saveLead(env, args, history, session, request);
              toolMsgs.push({ role: 'tool', tool_call_id: call.id, content: JSON.stringify(result) });
              await send({ lead: result.ok });
            }
            // Round 2: the model confirms to the visitor.
            await streamGrok(env, [...messages, assistantMsg, ...toolMsgs], send, false, upstream.signal);
          }
          await send({ done: true });
        } catch (err) {
          if (!gone) {
            await send({ error: 'Something broke on our end. Call or text (225) 747-0303 and Caleb will help you directly.', detail: String(err && err.message || err) });
            await send({ done: true });
          }
        } finally {
          try { controller.close(); } catch {}
        }
      })();
    },
    cancel() { gone = true; upstream.abort(); }
  });

  return new Response(stream, {
    headers: { ...cors, 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'X-Accel-Buffering': 'no' }
  });
}

// Streams one chat completion from xAI, forwarding text deltas as they arrive.
// Returns the full text and any tool calls the model made.
async function streamGrok(env, messages, send, allowTools, signal) {
  const payload = {
    model: model(env),
    messages,
    stream: true,
    temperature: 0.4,
    max_tokens: MAX_TOKENS
  };
  if (allowTools) { payload.tools = [LEAD_TOOL]; payload.tool_choice = 'auto'; }

  const res = await fetch(`${baseUrl(env)}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${env.XAI_API_KEY}` },
    body: JSON.stringify(payload),
    signal
  });
  if (!res.ok || !res.body) {
    const t = await res.text().catch(() => '');
    throw new Error(`xAI ${res.status}: ${t.slice(0, 300)}`);
  }

  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = '', text = '';
  const toolCalls = []; // index -> {id, type, function:{name, arguments}}

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let nl;
    while ((nl = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, nl).trim();
      buf = buf.slice(nl + 1);
      if (!line.startsWith('data:')) continue;
      const data = line.slice(5).trim();
      if (data === '[DONE]') continue;
      let chunk;
      try { chunk = JSON.parse(data); } catch { continue; }
      const delta = chunk.choices && chunk.choices[0] && chunk.choices[0].delta;
      if (!delta) continue;
      if (delta.content) { text += delta.content; await send({ delta: delta.content }); }
      if (delta.tool_calls) {
        for (const tc of delta.tool_calls) {
          const i = tc.index || 0;
          toolCalls[i] = toolCalls[i] || { id: tc.id || `call_${i}`, type: 'function', function: { name: '', arguments: '' } };
          if (tc.id) toolCalls[i].id = tc.id;
          if (tc.function && tc.function.name) toolCalls[i].function.name += tc.function.name;
          if (tc.function && tc.function.arguments) toolCalls[i].function.arguments += tc.function.arguments;
        }
      }
    }
  }
  return { text, toolCalls: toolCalls.filter(Boolean) };
}

async function saveLead(env, args, history, session, request) {
  const lead = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    received_at: new Date().toISOString(),
    source: 'calebjackson.org chat',
    name: String(args.name || '').slice(0, 120),
    phone: String(args.phone || '').slice(0, 40),
    email: String(args.email || '').slice(0, 120),
    intent: String(args.intent || 'other').slice(0, 20),
    area: String(args.area || '').slice(0, 120),
    timeline: String(args.timeline || '').slice(0, 120),
    notes: String(args.notes || '').slice(0, 500),
    page: (request.headers.get('Referer') || '').slice(0, 300),
    session,
    transcript: history.map(m => `${m.role === 'user' ? 'Visitor' : 'Assistant'}: ${m.content}`).join('\n').slice(0, 6000)
  };
  if (!lead.name || (!lead.phone && !lead.email)) {
    return { ok: false, reason: 'Need a first name and a phone number or email before saving.' };
  }
  if (env.LEADS) await env.LEADS.put(`lead:${lead.received_at}:${lead.id}`, JSON.stringify(lead));
  if (env.LEAD_WEBHOOK_URL) {
    try {
      await fetch(env.LEAD_WEBHOOK_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(lead) });
    } catch (e) { lead.webhook_error = String(e); }
  }
  return { ok: true, message: 'Saved. Caleb will text them today.' };
}
