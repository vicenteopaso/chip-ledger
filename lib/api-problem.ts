import { z } from "zod";

/** The one error body every endpoint returns (docs/API_PATTERNS.md §3). */
export const ProblemSchema = z.object({
  type: z.string(),
  title: z.string(),
  status: z.number().int(),
  requestId: z.string().optional(),
});

export type Problem = z.infer<typeof ProblemSchema>;

export function problemBody(
  status: number,
  type: string,
  title: string,
  requestId?: string,
): Problem {
  return requestId ? { type, title, status, requestId } : { type, title, status };
}
