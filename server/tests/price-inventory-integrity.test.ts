import { describe, it, expect, beforeAll } from "vitest";
import { catalogService } from "../src/server/commerce/catalog";
import {
  proposalService,
  PriceMismatchError,
  InventoryUnavailableError,
} from "../src/server/commerce/proposal";

describe("Phase 3 — Price Integrity, Inventory Protection & Concurrency", () => {
  let testProductId: string;

  beforeAll(async () => {
    await catalogService.ensureCatalogSeeded();
    const product = await catalogService.getProductBySku("PROD-KB-002");
    testProductId = product!.id;
  });

  it("should reject confirmation when database price changes after proposal creation (Price Integrity)", async () => {
    const proposal = await proposalService.createProposal({
      productId: testProductId,
      quantity: 1,
    });
    expect(Number(proposal.unitAmount)).toBe(69.99);

    // Simulate price increase in database before user confirms
    await catalogService.updateProductPrice(testProductId, 89.99);

    try {
      await expect(
        proposalService.confirmProposal(proposal.id, "human_user")
      ).rejects.toThrow(PriceMismatchError);
    } finally {
      // Revert product price back to original
      await catalogService.updateProductPrice(testProductId, 69.99);
    }
  });

  it("should reject confirmation when inventory becomes unavailable before confirmation", async () => {
    const proposal = await proposalService.createProposal({
      productId: testProductId,
      quantity: 1,
    });

    // Simulate inventory depletion
    await catalogService.updateProductInventory(testProductId, 0, false);

    try {
      await expect(
        proposalService.confirmProposal(proposal.id, "human_user")
      ).rejects.toThrow(InventoryUnavailableError);
    } finally {
      // Revert inventory
      await catalogService.updateProductInventory(testProductId, 30, true);
    }
  });

  it("should handle duplicate confirmation idempotently without double-ordering", async () => {
    const proposal = await proposalService.createProposal({
      productId: testProductId,
      quantity: 1,
    });

    // First confirmation creates PayPal order
    const result1 = await proposalService.confirmProposal(proposal.id, "human_user");
    expect(result1.proposal.status).toBe("CONFIRMED");
    expect(result1.paypalOrderId).toBeDefined();

    // Second confirmation returns existing order safely
    const result2 = await proposalService.confirmProposal(proposal.id, "human_user");
    expect(result2.proposal.status).toBe("CONFIRMED");
    expect(result2.paypalOrderId).toBe(result1.paypalOrderId);
    expect(result2.internalReference).toBe(result1.internalReference);
  });

  it("should resolve simultaneous concurrent confirmations without double charges", async () => {
    const proposal = await proposalService.createProposal({
      productId: testProductId,
      quantity: 1,
    });

    // Fire two confirmation calls simultaneously
    const [first, second] = await Promise.all([
      proposalService.confirmProposal(proposal.id, "human_user"),
      proposalService.confirmProposal(proposal.id, "human_user"),
    ]);

    expect(first.paypalOrderId).toBeDefined();
    expect(second.paypalOrderId).toBeDefined();
    expect(first.paypalOrderId).toBe(second.paypalOrderId);
  });
});
