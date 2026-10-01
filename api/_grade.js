// Shared grading for forms that have an answer key. Imported by the public submit
// endpoint, the Sheets writer, and the staff responses table so every surface
// reports identical scores.
//
// Only questions that actually have a correct answer marked are graded, so a form
// without an answer key reports no percentage at all. `q.correct` holds an option
// index (radio/select) or an array of option indexes (checkbox); stored answers
// arrive as option text, so indexes are resolved back to their option text first.

const norm = v => String(v == null ? '' : v).trim().toLowerCase();

export function gradeSubmission(questions, answers) {
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

// A form is a "test" once at least one question has an answer key. Drives whether
// a score column is written at all.
export function isTestForm(questions) {
  return (Array.isArray(questions) ? questions : []).some(
    q => q && q.correct !== undefined && q.correct !== null
  );
}

// Sheet-friendly score cell: "80%" or "8/10 (80%)" so the raw tally survives a
// CSV round-trip. Empty string for forms with no answer key.
export function scoreCell(questions, answers) {
  const { score, maxScore, percent } = gradeSubmission(questions, answers);
  return percent == null ? '' : `${percent}% (${score}/${maxScore})`;
}
