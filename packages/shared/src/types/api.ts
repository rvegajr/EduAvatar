export interface ApiResponse<T = unknown> {
  data: T;
  meta?: PaginationMeta;
}

export interface ApiError {
  statusCode: number;
  message: string;
  error?: string;
}

export interface PaginationMeta {
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
}

export interface PaginationQuery {
  page?: number;
  perPage?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export type Modality = 'avatar' | 'audio' | 'text';
export type SessionStatus = 'not_started' | 'in_progress' | 'paused' | 'completed' | 'terminated' | 'interrupted';
export type GradeStatus = 'draft' | 'finalized' | 'submitted_to_lms';
export type ExamStatus = 'draft' | 'published' | 'archived';
export type EndProcess = 'hard_stop' | 'complete_round';

export interface ExamSettingsDto {
  numStartingQuestions: number;
  maxTimeSeconds: number | null;
  retakesAllowed: number;
  endProcess: EndProcess;
  randomQuestions: boolean;
  depthOfQuestions: number;
  delayResponseSeconds: number;
  idCheckEnabled: boolean;
  browserLockdown: boolean;
  allowBreaks: boolean;
}

export interface GradeSubmission {
  notes: string;
  rubricScores: {
    rubricRowId: string;
    notes: string;
    score: number;
  }[];
}
