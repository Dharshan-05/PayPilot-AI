import { PayPalApiError } from "./errors";

export type PaymentState =
  | "CREATED"
  | "APPROVED"
  | "CAPTURE_PENDING"
  | "CAPTURED"
  | "FAILED"
  | "CANCELLED"
  | "REFUNDED";

const VALID_TRANSITIONS: Record<PaymentState, PaymentState[]> = {
  CREATED: ["APPROVED", "CAPTURE_PENDING", "CAPTURED", "CANCELLED", "FAILED"],
  APPROVED: ["CAPTURE_PENDING", "CAPTURED", "CANCELLED", "FAILED"],
  CAPTURE_PENDING: ["CAPTURED", "FAILED"],
  CAPTURED: ["REFUNDED"],
  FAILED: [], // Terminal
  CANCELLED: [], // Terminal
  REFUNDED: [], // Terminal
};

export class PaymentStateMachine {
  /**
   * Checks if a transition from currentState to targetState is valid according to business rules.
   */
  public static canTransition(from: string, to: string): boolean {
    const currentState = from.toUpperCase() as PaymentState;
    const targetState = to.toUpperCase() as PaymentState;

    if (!VALID_TRANSITIONS[currentState]) {
      return false;
    }

    // Disallow self-transition (e.g. CAPTURED -> CAPTURED is prevented)
    if (currentState === targetState) {
      return false;
    }

    return VALID_TRANSITIONS[currentState].includes(targetState);
  }

  /**
   * Asserts that a state transition is valid, throwing an explicit PayPalApiError if not.
   */
  public static assertValidTransition(
    from: string,
    to: string,
    orderReference?: string
  ): void {
    const currentState = from.toUpperCase() as PaymentState;
    const targetState = to.toUpperCase() as PaymentState;

    if (!this.canTransition(currentState, targetState)) {
      const refMsg = orderReference ? ` for order '${orderReference}'` : "";
      throw new PayPalApiError(
        400,
        "INVALID_STATE_TRANSITION",
        `Invalid payment state transition${refMsg}: cannot move from '${currentState}' to '${targetState}'.`,
        `State machine violation: ${currentState} -> ${targetState}`
      );
    }
  }

  /**
   * Determines if a payment state is terminal.
   */
  public static isTerminal(state: string): boolean {
    const s = state.toUpperCase() as PaymentState;
    return ["CAPTURED", "FAILED", "CANCELLED", "REFUNDED"].includes(s);
  }
}
