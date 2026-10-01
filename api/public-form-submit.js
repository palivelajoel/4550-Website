import { d1SelectOne, d1Insert } from './_gateway.js';

const norm = v => String(v == null ? '' : v).trim().toLowerCase();

// Score a submission against the form's answer key. Only questions that actually
// have a correct answer marked are graded, so a form without an answer key reports
// no percentage at all. `correct` holds an option index (radio/select) or an array
// of option indexes (checkbox); public answers arrive as option text.
function gradeSubmission(questions, answers) {
  let score = 0;
  let maxScore = 0;

  for (const q of Array.isArray(questions) ? questions : []) {
    const correct = q.correct;
    if (correct === undefined || correct === null) continue;

    const options = Array.isArray(q.options) ? q.options : [];
    const answer = answers ? answers[q.id] : undefined;
    const blank = answer === undefined || answer === null
      || (Array.isArray(answer) && answer.length === 0)
      || norm(answer) === '';
    if (blank) {
      // A missed required question counts against the score; a skipped optional
      // one is left out of the denominator entirely.
      if (q.required) maxScore++;
      continue;
    }

    const correctTexts = (Array.isArray(correct) ? correct : [correct])
      .map(i => options[Number(i)])
      .filter(t => typeof t === 'string' && t.trim());
    if (correctTexts.length === 0) continue;

    maxScore++;
    if (Array.isArray(answer)) {
      const picked = answer.map(norm);
      if (picked.length === correctTexts.length && correctTexts.every(t => picked.includes(norm(t)))) score++;
    } else if (correctTexts.some(t => norm(t) === norm(answer))) {
      score++;
    }
  }

  return { score, maxScore, percent: maxScore > 0 ? Math.round((score / maxScore) * 100) : null };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { formId, answers } = req.body || {};
    if (!formId || !answers) return res.status(400).json({ error: 'Missing formId or answers' });

    // Verify form exists and is public
    const form = await d1SelectOne('hub_forms', { filters: [{ col: 'id', op: 'eq', value: String(formId) }] });
    if (!form) return res.status(404).json({ error: 'Form not found' });
    if (form.visibility !== 'public') return res.status(403).json({ error: 'This form is not public' });

    const { score, maxScore, percent } = gradeSubmission(form.questions, answers);

    // Insert submission
    const { id } = await d1Insert('hub_form_submissions', { form_id: String(formId), submitted_by: 'public', answers });
    return res.status(200).json({ ok: true, data: [{ id }], score, maxScore, percent });
  } catch (err) {
    console.error('Public form submit error:', err);
    return res.status(500).json({ error: err.message || 'Submit failed' });
  }
}
