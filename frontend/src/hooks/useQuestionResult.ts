import { useEffect, useState } from 'react';
import { getQuestion } from '../api/questions';
import type { Question } from '../types/question';

const POLL_INTERVAL_MS = 1500;

function isTerminal(status: Question['status']): boolean {
  return status !== 'PROCESSING';
}

// Polls a single question until it reaches a terminal status (ANSWERED /
// REFUSED / FAILED).
//
// Why polling and not a websocket: answers are produced by a background worker
// that may run in its own process, so pushing updates would need a cross-process
// bus (e.g. Postgres LISTEN/NOTIFY). Polling matches the job model and is robust.
// The transport is isolated here, so it could be swapped for SSE/sockets later
// without touching the page. A self-scheduling timeout (not setInterval) avoids
// overlapping requests when a poll is slow.
export function useQuestionResult(questionId: string | null): { question: Question | null; error: string | null } {
  const [question, setQuestion] = useState<Question | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setQuestion(null);
    setError(null);
    if (!questionId) return;

    let active = true;
    let timer: number | undefined;

    const poll = async (): Promise<void> => {
      try {
        const next = await getQuestion(questionId);
        if (!active) return;
        setQuestion(next);
        setError(null);
        if (!isTerminal(next.status)) {
          timer = window.setTimeout(poll, POLL_INTERVAL_MS);
        }
      } catch (err) {
        if (!active) return;
        // A transient failure shouldn't abandon an in-flight answer — surface it
        // but keep polling.
        setError(err instanceof Error ? err.message : 'Failed to load the answer.');
        timer = window.setTimeout(poll, POLL_INTERVAL_MS);
      }
    };

    void poll();
    return () => {
      active = false;
      if (timer) window.clearTimeout(timer);
    };
  }, [questionId]);

  return { question, error };
}
