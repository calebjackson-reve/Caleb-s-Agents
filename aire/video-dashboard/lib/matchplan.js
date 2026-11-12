'use strict';
// Match plan: the reference's shot structure as a template of empty slots. A person or the bot
// assigns raw source clips to slots. Nothing is filled in automatically and nothing is made up.
const path = require('path');
const store = require('./store');
const media = require('./media');
const reference = require('./reference');
const { VxError } = store;

const ROLES = ['hook', 'b-roll', 'talking head', 'cta', 'transition', 'product shot', 'text card', 'other'];
const ROLE_RULE = 'Roles are suggestions only, guessed from position and length: first slot = hook, last slot = cta, 4 seconds or longer (or mostly speech, when a transcript exists) = talking head, everything else = b-roll. Change any of them.';
const round3 = (n) => Math.round(n * 1000) / 1000;
const stamp = (t) => `${String(Math.floor(t / 60)).padStart(2, '0')}:${(t % 60).toFixed(2).padStart(5, '0')}`;

const planFile = (job) => path.join(store.jobDir(job), 'match-plan.json');

function overlap(a0, a1, b0, b1) {
  return Math.max(0, Math.min(a1, b1) - Math.max(a0, b0));
}

function suggestRole(shot, count, b) {
  if (shot.n === 1) return 'hook';
  if (shot.n === count && count > 1) return 'cta';
  const segs = (b.transcript && b.transcript.segments) || [];
  const speech = segs.reduce((n, s) => n + overlap(shot.start, shot.end, s.start, s.end), 0);
  if (shot.duration >= 4 || (segs.length && speech / shot.duration >= 0.5)) return 'talking head';
  return 'b-roll';
}

function slotNotes(shot, b) {
  const notes = [`Reference shot ${shot.n}: ${stamp(shot.start)} to ${stamp(shot.end)} (${shot.duration}s).`];
  if (shot.n === 1) notes.push(`Hook length in the reference is ${b.pacing.hook_seconds}s (${b.pacing.hook_basis}).`);
  if (b.audio && b.audio.available) {
    if (shot.n > 1 && b.audio.onsets.some((t) => Math.abs(t - shot.start) <= 0.15)) notes.push('The cut into this shot lands on an audio onset.');
    const quiet = b.audio.silences.reduce((n, s) => n + overlap(shot.start, shot.end, s.start, s.end), 0);
    if (quiet / shot.duration >= 0.6) notes.push('Mostly silent in the reference.');
  }
  const said = ((b.transcript && b.transcript.segments) || []).filter((s) => overlap(shot.start, shot.end, s.start, s.end) > 0).map((s) => s.text.trim()).join(' ');
  if (said) notes.push(`Reference speech here: "${said.slice(0, 200)}"`);
  const frames = ((b.on_screen_text && b.on_screen_text.frames) || []).filter((f) => f.needs_review && f.t >= shot.start && f.t < shot.end);
  if (frames.length) notes.push(`${frames.length} frame${frames.length > 1 ? 's' : ''} flagged to check for on-screen text.`);
  return notes;
}

function summarize(plan) {
  const assigned = plan.slots.filter((s) => s.assignment);
  plan.summary = {
    slot_count: plan.slots.length,
    assigned_count: assigned.length,
    unassigned_slots: plan.slots.filter((s) => !s.assignment).map((s) => s.n),
    reference_seconds: round3(plan.slots.reduce((n, s) => n + s.duration, 0)),
    assigned_seconds: round3(assigned.reduce((n, s) => n + (s.assignment.out - s.assignment.in), 0)),
  };
  return plan;
}

function getPlan(job) {
  store.requireJob(job);
  const plan = store.readJson(planFile(job), null);
  if (!plan) throw new VxError(`No match plan on ${job} yet. Create one from a reference breakdown.`, 404);
  return summarize(plan);
}

function savePlan(plan) {
  plan.updated = store.now();
  store.writeJson(planFile(plan.job), summarize(plan));
  return plan;
}

function createPlan(job, refName, { force = false } = {}, actor) {
  store.requireJob(job);
  if (!refName) throw new VxError('Say which reference to build the plan from.');
  const b = reference.readBreakdown(job, refName);
  const existing = store.readJson(planFile(job), null);
  if (existing && existing.slots.some((s) => s.assignment) && !force) {
    throw new VxError('This job already has a match plan with assigned slots. Pass force to replace it.', 409);
  }
  const plan = {
    schema: 'vx.match-plan/1', job, reference: refName,
    reference_note: reference.ANALYSIS_ONLY_NOTE,
    role_rule: ROLE_RULE, roles: ROLES, created: store.now(), updated: store.now(),
    reference_specs: { duration: b.specs.duration, aspect: b.specs.aspect, width: b.specs.width, height: b.specs.height },
    slots: b.shots.map((shot) => ({
      n: shot.n, start: shot.start, end: shot.end, duration: shot.duration,
      suggested_role: suggestRole(shot, b.shots.length, b), role: null, role_is_suggestion: true,
      notes: slotNotes(shot, b), user_notes: '', reference_thumb: shot.thumb, assignment: null,
    })),
  };
  savePlan(plan);
  store.logActivity(job, 'match-plan.create', { reference: refName, slots: plan.slots.length, replaced: !!existing }, actor);
  return plan;
}

function findSlot(plan, n) {
  const slot = plan.slots.find((s) => s.n === Number(n));
  if (!slot) throw new VxError(`No slot ${n} in the match plan (it has ${plan.slots.length}).`, 404);
  return slot;
}

function updateSlot(job, n, { role, notes } = {}, actor) {
  const plan = getPlan(job);
  const slot = findSlot(plan, n);
  if (role !== undefined) {
    slot.role = role === null || role === '' ? null : String(role).slice(0, 40);
    slot.role_is_suggestion = slot.role === null;
  }
  if (notes !== undefined) slot.user_notes = String(notes).slice(0, 2000);
  savePlan(plan);
  store.logActivity(job, 'match-plan.slot', { slot: slot.n, role: slot.role, notes: notes !== undefined }, actor);
  return slot;
}

async function assignSlot(job, n, { source, in: inPoint = 0, out: outPoint } = {}, actor) {
  const plan = getPlan(job);
  const slot = findSlot(plan, n);
  if (!source) throw new VxError('Say which source clip to put in this slot.');
  // Only raw footage from source/ can fill a slot. A reference can never be assigned.
  store.locate(job, 'source', source);
  const info = await media.probe(job, 'source', source);
  if (!info.video || info.kind !== 'video') throw new VxError(`${source} is not a video.`);
  const start = Number(inPoint) || 0;
  const end = outPoint === undefined || outPoint === null || outPoint === '' ? Math.min(info.duration, start + slot.duration) : Number(outPoint);
  const range = store.checkRange(start, end, info.duration);
  const length = round3(range.out - range.in);
  const fit = [];
  if (Math.abs(length - slot.duration) > 0.1) fit.push(`Clip is ${length}s but the slot is ${slot.duration}s.`);
  if (info.aspect && plan.reference_specs.aspect && info.aspect !== plan.reference_specs.aspect) fit.push(`Clip is ${info.aspect}, reference is ${plan.reference_specs.aspect}. It will need a crop or reframe.`);
  slot.assignment = { source, in: range.in, out: range.out, duration: length, fit_notes: fit, assigned_at: store.now(), assigned_by: actor || 'unknown' };
  savePlan(plan);
  store.logActivity(job, 'match-plan.assign', { slot: slot.n, source, in: range.in, out: range.out }, actor);
  return slot;
}

function unassignSlot(job, n, actor) {
  const plan = getPlan(job);
  const slot = findSlot(plan, n);
  slot.assignment = null;
  savePlan(plan);
  store.logActivity(job, 'match-plan.unassign', { slot: slot.n }, actor);
  return slot;
}

// What a rough cut would contain right now: assigned slots in order, unassigned ones reported.
function planSegments(job) {
  const plan = getPlan(job);
  const segments = plan.slots.filter((s) => s.assignment).map((s) => ({ folder: 'source', source: s.assignment.source, in: s.assignment.in, out: s.assignment.out, slot: s.n }));
  return { segments, skipped: plan.summary.unassigned_slots, reference: plan.reference };
}

async function queueRoughCut(job, { dest, name } = {}, actor) {
  const queue = require('./queue');
  const params = {};
  if (dest) params.dest = dest;
  if (name) params.name = name;
  return queue.enqueue(job, 'roughcut', params, actor);
}

module.exports = { ROLES, ROLE_RULE, getPlan, createPlan, updateSlot, assignSlot, unassignSlot, planSegments, queueRoughCut };
