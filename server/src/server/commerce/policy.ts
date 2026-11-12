import { Logger } from "../observability/logger";

const log = new Logger("AgentActionPolicy");

export type ActionSecurityTier =
  | "READ_ONLY"
  | "LOW_RISK_VALIDATED"
  | "FINANCIAL_USER_AUTH"
  | "FINANCIAL_SERVER_ONLY";

export interface ActionDefinition {
  name: string;
  tier: ActionSecurityTier;
  description: string;
  requiresUserConfirmation: boolean;
  canAiExecuteDirectly: boolean;
}

export const ACTION_DEFINITIONS: Record<string, ActionDefinition> = {
  SEARCH_PRODUCTS: {
    name: "SEARCH_PRODUCTS",
    tier: "READ_ONLY",
    description: "Search product catalog with keyword, category, and price filters",
    requiresUserConfirmation: false,
    canAiExecuteDirectly: true,
  },
  VIEW_PRODUCT: {
    name: "VIEW_PRODUCT",
    tier: "READ_ONLY",
    description: "Retrieve detailed product specifications and inventory availability",
    requiresUserConfirmation: false,
    canAiExecuteDirectly: true,
  },
  COMPARE_PRODUCTS: {
    name: "COMPARE_PRODUCTS",
    tier: "READ_ONLY",
    description: "Compare features, pricing, and ratings across candidate products",
    requiresUserConfirmation: false,
    canAiExecuteDirectly: true,
  },
  ORDER_STATUS: {
    name: "ORDER_STATUS",
    tier: "READ_ONLY",
    description: "Look up factual order and payment status from database records",
    requiresUserConfirmation: false,
    canAiExecuteDirectly: true,
  },
  CREATE_PROPOSAL: {
    name: "CREATE_PROPOSAL",
    tier: "LOW_RISK_VALIDATED",
    description: "Generate an intermediate commerce proposal in PENDING_CONFIRMATION state",
    requiresUserConfirmation: false,
    canAiExecuteDirectly: true,
  },
  CONFIRM_PAYMENT: {
    name: "CONFIRM_PAYMENT",
    tier: "FINANCIAL_USER_AUTH",
    description: "Confirm proposal and authorize checkout; requires explicit human confirmation",
    requiresUserConfirmation: true,
    canAiExecuteDirectly: false, // AI CANNOT AUTHORIZE PAYMENTS!
  },
  CREATE_PAYPAL_ORDER: {
    name: "CREATE_PAYPAL_ORDER",
    tier: "FINANCIAL_SERVER_ONLY",
    description: "Invoke PayPal v2/checkout/orders API; strictly server-only",
    requiresUserConfirmation: true,
    canAiExecuteDirectly: false, // AI CANNOT CALL PAYPAL DIRECTLY!
  },
  CAPTURE_PAYMENT: {
    name: "CAPTURE_PAYMENT",
    tier: "FINANCIAL_SERVER_ONLY",
    description: "Capture authorized funds via PayPal API; strictly server-only",
    requiresUserConfirmation: true,
    canAiExecuteDirectly: false, // AI CANNOT CAPTURE MONEY!
  },
  REFUND_PAYMENT: {
    name: "REFUND_PAYMENT",
    tier: "FINANCIAL_SERVER_ONLY",
    description: "Issue refund on captured transaction; strictly merchant/server-only",
    requiresUserConfirmation: true,
    canAiExecuteDirectly: false, // AI CANNOT REFUND MONEY!
  },
  INQUIRE_INFO: {
    name: "INQUIRE_INFO",
    tier: "READ_ONLY",
    description: "Provide informational guidance or clarify user commerce preferences",
    requiresUserConfirmation: false,
    canAiExecuteDirectly: true,
  },
  REFUND_POLICY_INFO: {
    name: "REFUND_POLICY_INFO",
    tier: "READ_ONLY",
    description: "Explain merchant refund policy and contact procedures",
    requiresUserConfirmation: false,
    canAiExecuteDirectly: true,
  },
  CANCEL_ORDER_INFO: {
    name: "CANCEL_ORDER_INFO",
    tier: "READ_ONLY",
    description: "Explain merchant order cancellation procedures",
    requiresUserConfirmation: false,
    canAiExecuteDirectly: true,
  },
  REJECT: {
    name: "REJECT",
    tier: "READ_ONLY",
    description: "Reject prompt due to security policy or injection violation",
    requiresUserConfirmation: false,
    canAiExecuteDirectly: true,
  },
};

export class AgentActionPolicy {
  /**
   * Evaluates whether an action requested by the AI or agent can be executed directly.
   * Throws an error if the action is unauthorized or violates security boundaries.
   */
  public static authorizeAction(
    actionName: string,
    caller: "ai_agent" | "human_user" | "server_payment_engine"
  ): { authorized: boolean; reason?: string } {
    const action = ACTION_DEFINITIONS[actionName.toUpperCase()];
    if (!action) {
      log.warn("Blocked unknown action attempt", { actionName, caller });
      return { authorized: false, reason: `Unknown action '${actionName}' is not recognized in policy registry.` };
    }

    if (caller === "ai_agent") {
      if (!action.canAiExecuteDirectly) {
        log.warn("Blocked AI unauthorized action attempt", { actionName, tier: action.tier });
        return {
          authorized: false,
          reason: `SECURITY POLICY VIOLATION: AI Agent is strictly prohibited from executing action '${actionName}' (Tier: ${action.tier}). AI proposes; server validates; user authorizes; PayPal executes.`,
        };
      }
    }

    if (caller === "human_user") {
      if (action.tier === "FINANCIAL_SERVER_ONLY") {
        return {
          authorized: false,
          reason: `Action '${actionName}' is reserved exclusively for the server payment rails.`,
        };
      }
    }

    return { authorized: true };
  }

  public static getActionTier(actionName: string): ActionSecurityTier {
    return ACTION_DEFINITIONS[actionName.toUpperCase()]?.tier || "FINANCIAL_SERVER_ONLY";
  }
}
