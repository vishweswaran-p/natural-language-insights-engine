import type { Job } from '../types/job';
import type { Question } from '../types/question';
import { request } from './client';

// Question endpoints. Asking is asynchronous: POST returns 202 with the created
// question (PROCESSING) and its QUERY job; the answer is fetched by polling
// getQuestion until the status is terminal.

export function askQuestion(datasetId: string, question: string): Promise<{ question: Question; job: Job }> {
  return request(
    '/questions',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ datasetId, question }),
    },
    'Failed to submit the question.',
  );
}

export function getQuestion(id: string): Promise<Question> {
  return request<Question>(`/questions/${id}`, undefined, 'Failed to load the answer.');
}

export async function listQuestions(): Promise<Question[]> {
  const body = await request<{ data: Question[] }>('/questions', undefined, 'Failed to load questions.');
  return body.data;
}
