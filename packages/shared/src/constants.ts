export const RUBRIC_MAX_COLUMNS = 5;
export const RUBRIC_MAX_ROWS = 12;

export const DEPTH_MIN = 0;
export const DEPTH_MAX = 10;

export const DEPTH_LABELS: Record<number, string> = {
  0: 'No follow-ups',
  1: 'Minimal',
  2: 'Light',
  3: 'Below average',
  4: 'Slightly moderate',
  5: 'Moderate',
  6: 'Above moderate',
  7: 'Substantial',
  8: 'Heavy',
  9: 'Very deep',
  10: 'Deep, complex follow-ups',
};

export const TIME_REMINDER_INTERVAL_SECONDS = 300; // 5 minutes
export const TIME_REMINDER_FINAL_SECONDS = 120;    // 2 minutes

export const TRANSCRIPT_VIDEO_OFFSET_MS = 2000;

export const JWT_ACCESS_EXPIRES = '15m';
export const JWT_REFRESH_EXPIRES = '7d';

export const LTI_SERVICES = {
  AGS: 'https://purl.imsglobal.org/spec/lti-ags/scope/lineitem',
  AGS_SCORES: 'https://purl.imsglobal.org/spec/lti-ags/scope/score',
  NRPS: 'https://purl.imsglobal.org/spec/lti-nrps/scope/contextmembership.readonly',
  DEEP_LINKING: 'https://purl.imsglobal.org/spec/lti-dl/claim/deep_linking_settings',
} as const;

export const SUPPORTED_LMS_PLATFORMS = [
  'Blackboard',
  'Canvas',
  'Moodle',
  'Brightspace D2L',
] as const;

export const SUPPORTED_MATERIAL_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
] as const;
