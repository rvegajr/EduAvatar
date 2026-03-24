export interface ClientEvents {
  'session:join': { sessionId: string };
  'session:reconnect': { sessionId: string; lastEventId: string };
  'audio:chunk': ArrayBuffer;
  'response:text': { text: string };
  'break:request': Record<string, never>;
  'break:confirm': { confirmed: boolean };
  'timer:toggle': { visible: boolean };
  'lockdown:violation': { type: string; timestamp: number };
}

export interface ServerEvents {
  'question:ask': {
    questionText: string;
    audioUrl?: string;
    isFollowup: boolean;
  };
  'timer:start': {
    maxTimeSeconds: number;
    startedAt: string;
  };
  'time:reminder': {
    remainingSeconds: number;
    message: string;
  };
  'silence:escalate': {
    level: number;
    message: string;
    audioUrl?: string;
  };
  'break:ask_confirm': { message: string };
  'break:approved': { message: string };
  'break:denied': { message: string };
  'session:end': { reason: 'time' | 'completed' | 'terminated' };
  'avatar:viseme': { visemeData: number[] };
  'error': { message: string; code: string };
}
