import { describe, it, expect } from "vitest";
import { PaymentStateMachine } from "../src/server/paypal/state-machine";

describe("Payment State Machine Integrity", () => {
  it("should permit valid lifecycle transitions", () => {
    // Normal happy path
    expect(PaymentStateMachine.canTransition("CREATED", "APPROVED")).toBe(true);
    expect(PaymentStateMachine.canTransition("APPROVED", "CAPTURE_PENDING")).toBe(true);
    expect(PaymentStateMachine.canTransition("CAPTURE_PENDING", "CAPTURED")).toBe(true);
    expect(PaymentStateMachine.canTransition("APPROVED", "CAPTURED")).toBe(true); // Direct capture

    // Cancellation and Failure paths
    expect(PaymentStateMachine.canTransition("CREATED", "CANCELLED")).toBe(true);
    expect(PaymentStateMachine.canTransition("CREATED", "FAILED")).toBe(true);
    expect(PaymentStateMachine.canTransition("APPROVED", "CANCELLED")).toBe(true);
    expect(PaymentStateMachine.canTransition("CAPTURE_PENDING", "FAILED")).toBe(true);

    // Refund path
    expect(PaymentStateMachine.canTransition("CAPTURED", "REFUNDED")).toBe(true);
  });

  it("should reject illegal backwards or invalid transitions", () => {
    // Cannot move backwards from CAPTURED to CREATED
    expect(PaymentStateMachine.canTransition("CAPTURED", "CREATED")).toBe(false);
    expect(PaymentStateMachine.canTransition("CAPTURED", "APPROVED")).toBe(false);

    // Cannot self-transition
    expect(PaymentStateMachine.canTransition("CAPTURED", "CAPTURED")).toBe(false);
    expect(PaymentStateMachine.canTransition("CREATED", "CREATED")).toBe(false);

    // Cannot revive terminal states
    expect(PaymentStateMachine.canTransition("FAILED", "CAPTURED")).toBe(false);
    expect(PaymentStateMachine.canTransition("CANCELLED", "CAPTURED")).toBe(false);
    expect(PaymentStateMachine.canTransition("REFUNDED", "CAPTURED")).toBe(false);
  });

  it("should throw explicit PayPalApiError on assertValidTransition failure", () => {
    expect(() => {
      PaymentStateMachine.assertValidTransition("CAPTURED", "CREATED", "ORD-123");
    }).toThrow(/Invalid payment state transition for order 'ORD-123'/);
  });

  it("should correctly identify terminal payment states", () => {
    expect(PaymentStateMachine.isTerminal("CAPTURED")).toBe(true);
    expect(PaymentStateMachine.isTerminal("FAILED")).toBe(true);
    expect(PaymentStateMachine.isTerminal("CANCELLED")).toBe(true);
    expect(PaymentStateMachine.isTerminal("REFUNDED")).toBe(true);

    expect(PaymentStateMachine.isTerminal("CREATED")).toBe(false);
    expect(PaymentStateMachine.isTerminal("APPROVED")).toBe(false);
    expect(PaymentStateMachine.isTerminal("CAPTURE_PENDING")).toBe(false);
  });
});
