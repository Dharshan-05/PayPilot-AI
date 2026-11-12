export interface InjectionCheckResult {
  isSafe: boolean;
  violations: string[];
}

const INJECTION_PATTERNS = [
  { pattern: /ignore\s+(all\s+)?(previous|prior)\s+instructions/i, reason: "Instruction override attempt detected" },
  { pattern: /bypass\s+(?:payment|security|authorization|limit|check|policy|human|user)/i, reason: "Security bypass attempt detected" },
  { pattern: /set\s+(?:the\s+)?(?:product\s+)?price\s+to\s+\$?0/i, reason: "Price manipulation attempt detected" },
  { pattern: /free\s+(order|checkout|item|purchase)/i, reason: "Zero-cost override attempt detected" },
  { pattern: /override\s+(max\s+)?(limit|price|total|amount)/i, reason: "Limit override attempt detected" },
  { pattern: /system\s+prompt\s+(reveal|leak|show|dump)/i, reason: "System prompt extraction attempt detected" },
  { pattern: /(?:reveal|leak|show|dump|give)\s+(?:me\s+)?(?:the\s+)?(?:your\s+)?.*(?:key|secret|credential|token|password)/i, reason: "Credential extraction attempt detected" },
  { pattern: /(?:print|dump|output|export)\s+(?:env|environment|process\.env|\.env)/i, reason: "Environment variable extraction attempt detected" },
  { pattern: /you\s+are\s+now\s+in\s+developer\s+mode/i, reason: "Jailbreak pattern detected" },
  { pattern: /(?:roleplay|act)\s+as\s+(?:an?\s+)?(?:unrestricted|jailbroken|unfiltered|dan)/i, reason: "Roleplay jailbreak attempt detected" },
  { pattern: /execute\s+(capture|payment|capturepayment)/i, reason: "Unauthorized execution attempt detected" },
  { pattern: /capture\s*payment/i, reason: "Direct payment capture attempt detected" },
  { pattern: /(?:without|skip)\s+(?:user\s+)?(confirmation|approval|consent)/i, reason: "Unauthorized bypass of user confirmation detected" },
  { pattern: /(?:pretend|assume|claim|simulate)\s+(?:that\s+)?(?:the\s+)?(?:user|buyer|human)\s+(?:has\s+)?(?:confirmed|authorized|approved)/i, reason: "Simulated human confirmation attempt detected" },
  { pattern: /(?:turn\s*off|disable)\s+(?:safety|guardrails|security|policies|checks)/i, reason: "Security policy deactivation attempt detected" },
  { pattern: /treat\s+me\s+as\s+(?:admin|root|human_user|system)/i, reason: "Caller spoofing attempt detected" },
  { pattern: /grant\s+(admin|root|unlimited)\s+access/i, reason: "Privilege escalation attempt detected" },
  { pattern: /(?:modify|change|set|alter)\s+(?:the\s+)?inventory\s+to\b/i, reason: "Direct inventory manipulation attempt detected" },
];

/**
 * Checks prompt or input for known injection and tampering patterns.
 */
export function checkPromptInjection(input: string): InjectionCheckResult {
  const violations: string[] = [];

  for (const { pattern, reason } of INJECTION_PATTERNS) {
    if (pattern.test(input)) {
      violations.push(reason);
    }
  }

  return {
    isSafe: violations.length === 0,
    violations,
  };
}
