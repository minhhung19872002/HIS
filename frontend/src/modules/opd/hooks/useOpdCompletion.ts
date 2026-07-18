import { useState, useCallback, useEffect } from 'react';
import { getCompletionStatus, type ExamCompletionStatus } from '../api/multiSpecialtyExam';

export function useOpdCompletion(examId: string | null) {
  const [completion, setCompletion] = useState<ExamCompletionStatus | null>(null);

  const refreshCompletion = useCallback(async (eid: string) => {
    try {
      const status = await getCompletionStatus(eid);
      setCompletion(status);
    } catch {
      setCompletion(null);
    }
  }, []);

  useEffect(() => {
    if (!examId) { setCompletion(null); return; }
    refreshCompletion(examId);
  }, [examId, refreshCompletion]);

  return { completion, setCompletion, refreshCompletion };
}
