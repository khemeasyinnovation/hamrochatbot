// lib/aiGateway/types.ts
export type AIRequestContext = {
  orgId: string | null;       // owners can use Chat before creating a business
  surface: 'chat' | 'widget';
  sessionId: string;          // chatSessions.id or widgetSessions.id
  userId?: string;            // present for Chat (owner), absent for Widget (anonymous)
  visitorId?: string;         // present for Widget
  task: 'generation' | 'embedding' | 'classification'; // widget router will need 'classification' later, stub it now
};

