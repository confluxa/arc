export type MessageType = "proposal" | "result" | "note";

export interface ArcMessage {
  id: string;
  task_id: string;
  agent: string;
  type: MessageType;
  content: string;
  timestamp: string;
}

export interface ResolveResult {
  status: "conflict" | "consensus";
  messages: ArcMessage[];
  resolution: string;
}
