'use strict';
// Every action the dashboard can do, by name. The HTTP API and the CLI both call this table,
// so the bot and the browser always go through the same code.
const store = require('./store');
const media = require('./media');
const queue = require('./queue');
const reference = require('./reference');
const matchplan = require('./matchplan');
const { VxError } = store;

async function withProbe(job, files) {
  const out = [];
  for (let i = 0; i < files.length; i += 4) {
    out.push(...await Promise.all(files.slice(i, i + 4).map(async (f) => {
      if (!['video', 'audio', 'image'].includes(f.kind)) return f;
      try {
        return { ...f, probe: await media.probe(job, f.folder, f.name) };
      } catch (e) {
        return { ...f, probe: { readable: false, error: e.message } };
      }
    })));
  }
  return out;
}

const truthy = (v) => v === true || v === 1 || v === '1' || v === 'true';

async function jobDetail(job, probe) {
  const meta = store.requireJob(job);
  const files = store.listAllFiles(job);
  if (probe) for (const f of store.FOLDERS) files[f] = await withProbe(job, files[f]);
  let plan = null;
  try {
    const p = matchplan.getPlan(job);
    plan = { reference: p.reference, updated: p.updated, ...p.summary };
  } catch { /* no plan yet */ }
  return {
    ...meta, statuses: store.STATUSES, files, trims: store.listTrims(job), captions: queue.listSrt(job),
    references: reference.listReferences(job), match_plan: plan, renders: queue.list({ job, limit: 25 }),
  };
}

const renderParams = (a) => {
  const p = {};
  for (const k of ['trim', 'trims', 'folder', 'name', 'srt', 'dest']) if (a[k] !== undefined && a[k] !== null && a[k] !== '') p[k] = a[k];
  return p;
};

async function finishRender(rec, wait) {
  if (!truthy(wait)) return rec;
  const done = await queue.waitFor(rec.id);
  return { ...done, log: queue.readLog(done.id) };
}

const actions = {
  'jobs.list': () => store.listJobs(),
  'job.create': (a, actor) => store.createJob(a, actor),
  'job.get': (a) => jobDetail(a.job, truthy(a.probe)),
  'job.update': (a, actor) => store.updateJob(a.job, a, actor),
  'note.add': (a, actor) => store.addNote(a.job, a, actor),
  'note.done': (a, actor) => store.setNoteDone(a.job, a.note, a.done === undefined ? true : truthy(a.done), actor),

  'files.list': async (a) => {
    store.requireJob(a.job);
    if (a.folder) {
      const files = store.listFiles(a.job, a.folder);
      return truthy(a.probe) ? withProbe(a.job, files) : files;
    }
    const all = store.listAllFiles(a.job);
    if (truthy(a.probe)) for (const f of store.FOLDERS) all[f] = await withProbe(a.job, all[f]);
    return all;
  },
  // Import from a path on this machine. No job means the inbox. folder=reference registers a reference.
  'file.import': (a, actor) => {
    if (a.job && a.folder === 'reference') return reference.addFromPath(a.job, a.path, { move: truthy(a.move) }, actor);
    return store.importFile(a.path, { job: a.job || null, folder: a.folder || 'source', move: truthy(a.move) }, actor);
  },
  'file.upload': async (a, actor) => {
    const file = await store.saveUpload(a.stream, { job: a.job || null, folder: a.folder || 'source', name: a.name }, actor);
    if (a.job && a.folder === 'reference') reference.register(a.job, file.name, { type: 'upload' }, actor);
    return file;
  },
  'probe': (a) => {
    if (a.path) return media.probePath(require('path').resolve(String(a.path)));
    if (!a.name) throw new VxError('Say which file to probe (folder and name, or a path).');
    return media.probe(a.job || null, a.job ? a.folder || 'source' : 'inbox', a.name);
  },

  'inbox.list': async (a) => (truthy(a.probe) ? withProbe(null, store.listInbox()) : store.listInbox()),
  'inbox.move': async (a, actor) => {
    const file = await store.moveInboxItem(a.name, { job: a.job, folder: a.folder || 'source' }, actor);
    if (file.folder === 'reference') reference.register(a.job, file.name, { type: 'inbox', name: a.name }, actor);
    return file;
  },

  'trims.list': (a) => store.listTrims(a.job),
  'trim.add': async (a, actor) => {
    store.requireJob(a.job);
    store.locate(a.job, 'source', a.source);
    const info = await media.probe(a.job, 'source', a.source);
    if (!info.readable || !info.duration) throw new VxError(`${a.source} has no duration to trim.`);
    return store.addTrim(a.job, a, info.duration, actor);
  },
  'trim.remove': (a, actor) => store.removeTrim(a.job, a.trim, actor),

  'render.queue': async (a, actor) => finishRender(await queue.enqueue(a.job, a.op, renderParams(a), actor), a.wait),
  'renders.list': (a) => queue.list({ job: a.job || undefined, limit: Number(a.limit) || 100 }),
  'render.get': (a) => ({ ...queue.get(a.id), log: queue.readLog(a.id) }),
  'queue.run': async () => ({ worked: await queue.processQueue() }),

  'activity': (a) => store.readActivity(a.job || null, Number(a.limit) || 200),

  'ref.add': (a, actor) => {
    if (a.url) return reference.addFromUrl(a.job, a.url, actor);
    if (a.path) return reference.addFromPath(a.job, a.path, { move: truthy(a.move) }, actor);
    throw new VxError('Give a file path or a URL for the reference.');
  },
  'ref.list': (a) => reference.listReferences(a.job),
  'ref.breakdown': (a, actor) => reference.runBreakdown(a.job, a.name, actor),
  'ref.get-breakdown': (a) => reference.readBreakdown(a.job, a.name),

  'plan.create': (a, actor) => matchplan.createPlan(a.job, a.reference, { force: truthy(a.force) }, actor),
  'plan.get': (a) => matchplan.getPlan(a.job),
  'plan.slot': (a, actor) => matchplan.updateSlot(a.job, a.slot, { role: a.role, notes: a.notes }, actor),
  'plan.assign': (a, actor) => matchplan.assignSlot(a.job, a.slot, { source: a.source, in: a.in, out: a.out }, actor),
  'plan.unassign': (a, actor) => matchplan.unassignSlot(a.job, a.slot, actor),
  'plan.render': async (a, actor) => finishRender(await matchplan.queueRoughCut(a.job, { dest: a.dest, name: a.name }, actor), a.wait),
};

async function act(name, args = {}, actor) {
  const fn = actions[name];
  if (!fn) throw new VxError(`Unknown action ${name}.`, 404);
  return fn(args || {}, actor);
}

module.exports = { act, actions };
