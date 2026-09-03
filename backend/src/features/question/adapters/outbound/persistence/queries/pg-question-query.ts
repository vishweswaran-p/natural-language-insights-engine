import type { Pool } from 'pg';
import type { Question } from '@app/features/question/application/domain/question';
import type { QuestionQuery } from '@app/features/question/application/ports/question.query';
import { QUESTION_COLUMNS, toQuestion } from '@app/features/question/adapters/outbound/persistence/question-row';

// Read adapter for questions (parameterized queries only).
export class PgQuestionQuery implements QuestionQuery {
  constructor(private readonly pool: Pool) {}

  async findById(id: string): Promise<Question | null> {
    const { rows } = await this.pool.query(`SELECT ${QUESTION_COLUMNS} FROM questions WHERE id = $1`, [id]);
    return rows[0] ? toQuestion(rows[0]) : null;
  }

  async list(): Promise<Question[]> {
    const { rows } = await this.pool.query(`SELECT ${QUESTION_COLUMNS} FROM questions ORDER BY created_at DESC`);
    return rows.map(toQuestion);
  }
}
