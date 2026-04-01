import type { AgentRole, ArcMessage } from "./types";

const VALID_ROLES: AgentRole[] = ["proposer", "critic", "validator"];

/** Higher score = more influence when ranking competing proposals. */
export const ROLE_WEIGHT: Record<AgentRole, number> = {
  proposer: 1,
  critic: 2,
  validator: 3
};

export function isAgentRole(value: unknown): value is AgentRole {
  return typeof value === "string" && VALID_ROLES.includes(value as AgentRole);
}

export function normalizeRole(role: ArcMessage["role"]): AgentRole {
  if (role === undefined || role === null) return "proposer";
  return isAgentRole(role) ? role : "proposer";
}

export function roleWeight(role: ArcMessage["role"]): number {
  return ROLE_WEIGHT[normalizeRole(role)];
}

/**
 * One line per message, grouped by role weight order (validator → critic → proposer).
 */
export function buildRoleReasoningLines(messages: ArcMessage[]): string[] {
  if (messages.length === 0) return [];

  const ordered = [...messages].sort((a, b) => {
    const wr = roleWeight(b.role) - roleWeight(a.role);
    if (wr !== 0) return wr;
    return a.timestamp.localeCompare(b.timestamp);
  });

  const lines: string[] = ["Role-weighted contributions (validator > critic > proposer):"];

  for (const m of ordered) {
    const role = normalizeRole(m.role);
    const snippet = m.content.length > 120 ? `${m.content.slice(0, 117)}...` : m.content;
    if (role === "proposer") {
      lines.push(`* proposer (${m.agent}) suggested: "${snippet}"`);
    } else if (role === "critic") {
      lines.push(`* critic (${m.agent}) identified: "${snippet}"`);
    } else {
      lines.push(`* validator (${m.agent}) confirmed: "${snippet}"`);
    }
  }

  return lines;
}
