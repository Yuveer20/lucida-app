import type { Assessment, AssessRequest } from '@lucida/shared';
import { PERSONAS } from '../config/personas.js';
import { chunkLesson } from '../chunking/chunkLesson.js';
import { runStudentAgents } from '../agents/studentAgents.js';
import { runExpertAgent, runTeacherAgent } from '../agents/critiqueAgents.js';
import { findDisagreements } from '../agents/disagreement.js';
import { runQaPass } from '../agents/qaPass.js';
import { buildAssessment } from '../aggregation/aggregate.js';

/**
 * The Milestone 1 assessment loop end to end (Technical Design §2).
 *
 *   chunk → student agents → teacher + expert (in parallel)
 *         → disagreement detection → QA pass → aggregate
 *
 * The critique agents depend on the student results (they review the lesson
 * with the simulated classroom's reactions in hand), so they cannot start
 * earlier — but they are independent of each other and run concurrently.
 */
export async function assessLesson(req: AssessRequest): Promise<Assessment> {
  const lessonText = req.lessonText.trim();
  if (!lessonText) throw new Error('Lesson text is empty.');

  const chunks = await chunkLesson(lessonText, {
    gradeLevel: req.gradeLevel,
    subject: req.subject,
  });
  if (chunks.length === 0) throw new Error('Chunking produced no sections.');

  const { results: studentResults } = await runStudentAgents(chunks, PERSONAS);

  const [teacher, expert] = await Promise.all([
    runTeacherAgent(chunks, studentResults),
    runExpertAgent(chunks, studentResults),
  ]);

  const disagreements = findDisagreements(teacher.critiques, expert.critiques);

  // Mutates qaFlag on the critique objects in place, so this must run before
  // the assessment is assembled.
  const qa = await runQaPass(chunks, teacher.critiques, expert.critiques, studentResults);

  return buildAssessment({
    lessonPlanId: `lp-${Date.now().toString(36)}`,
    chunks,
    personas: PERSONAS,
    studentResults,
    teacherCritiques: teacher.critiques,
    expertCritiques: expert.critiques,
    disagreements,
    suggestions: [...teacher.suggestions, ...expert.suggestions],
    teacherRubric: teacher.rubric,
    expertRubric: expert.rubric,
    qa,
  });
}
