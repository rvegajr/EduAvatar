export type Role = 'admin' | 'instructor' | 'ta' | 'student';

export interface JwtPayload {
  sub: string;
  email: string;
  role: Role;
  institutionId: string;
  iat: number;
  exp: number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LtiLaunchContext {
  userId: string;
  role: Role;
  institutionId: string;
  courseId?: string;
  examId?: string;
  ltiDeploymentId: string;
}
