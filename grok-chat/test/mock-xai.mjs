// Stand-in for api.x.ai so the Worker and widget can be tested without a key.
// Streams OpenAI-style SSE. If the latest visitor message holds a phone number,
// it emits a capture_lead tool call; after a tool result it confirms.
import http from 'node:http';

const PORT = Number(process.env.PORT || 9999);

function sse(res, chunks) {
  res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' });
  let i = 0;
  const tick = () => {
    if (i >= chunks.length) { res.write('data: [DONE]\n\n'); res.end(); return; }
    res.write(`data: ${JSON.stringify(chunks[i++])}\n\n`);
    setTimeout(tick, 25);
  };
  tick();
}
const delta = (d, finish = null) => ({ id: 'mock', object: 'chat.completion.chunk', choices: [{ index: 0, delta: d, finish_reason: finish }] });
const words = (s) => s.split(/(?<=\s)/).map(w => delta({ content: w }));

http.createServer((req, res) => {
  if (req.method !== 'POST' || !req.url.endsWith('/chat/completions')) { res.writeHead(404); res.end(); return; }
  if (req.headers.authorization !== 'Bearer test-key') { res.writeHead(401); res.end('bad key'); return; }
  let body = '';
  req.on('data', c => body += c);
  req.on('end', () => {
    const { messages, tools } = JSON.parse(body);
    const last = messages[messages.length - 1];
    if (last.role === 'tool') {
      const r = JSON.parse(last.content);
      return sse(res, [...words(r.ok ? "Got it. Caleb will text you today. If you'd rather call first, he's at (225) 747-0303." : "I still need your first name and a phone number so Caleb can reach you."), delta({}, 'stop')]);
    }
    const text = (last.content || '');
    const phone = text.match(/\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/);
    const name = text.match(/(?:I'm|I am|name is|it's|this is)\s+([A-Z][a-z]+)/);
    if (tools && phone) {
      const args = JSON.stringify({ name: name ? name[1] : 'Visitor', phone: phone[0], intent: 'buy', area: 'Zachary', timeline: 'spring', notes: text.slice(0, 120) });
      return sse(res, [
        delta({ tool_calls: [{ index: 0, id: 'call_1', type: 'function', function: { name: 'capture_lead', arguments: '' } }] }),
        delta({ tool_calls: [{ index: 0, function: { arguments: args.slice(0, 30) } }] }),
        delta({ tool_calls: [{ index: 0, function: { arguments: args.slice(30) } }] }),
        delta({}, 'tool_calls')
      ]);
    }
    const reply = messages.length <= 2
      ? "Happy to help. Caleb Jackson is a REALTOR with Keller Williams First Choice, and Zachary is his home base with 15 closings there. Are you looking to buy, sell, or just getting a feel for the area?"
      : "Spring is a good window. Tell me your first name and the best mobile number, and Caleb will text you today to set up a time.";
    sse(res, [...words(reply), delta({}, 'stop')]);
  });
}).listen(PORT, () => console.log(`mock xAI on http://localhost:${PORT}`));
