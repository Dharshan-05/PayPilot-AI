import { describe, it, expect, beforeAll } from "vitest";
import { catalogService } from "../src/server/commerce/catalog";
import { proposalService, ProposalExpiredError } from "../src/server/commerce/proposal";
import { prisma } from "../src/server/db/client";

describe("Phase 3 — Commerce Proposal Lifecycle", () => {
  let testProductId: string;

  beforeAll(async () => {
    await catalogService.ensureCatalogSeeded();
    const product = await catalogService.getProductBySku("PROD-KB-001");
    testProductId = product!.id;
  });

  it("should create a proposal in PENDING_CONFIRMATION state with exact unit and total amount", async () => {
    const proposal = await proposalService.createProposal({
      productId: testProductId,
      quantity: 2,
    });

    expect(proposal.id).toBeDefined();
    expect(proposal.proposalNumber).toMatch(/^PROP-/);
    expect(proposal.status).toBe("PENDING_CONFIRMATION");
    expect(proposal.quantity).toBe(2);
    expect(Number(proposal.unitAmount)).toBe(79.99);
    expect(Number(proposal.totalAmount)).toBe(159.98);
    expect(proposal.expiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  it("should reject confirmation when proposal has expired", async () => {
    const proposal = await proposalService.createProposal({
      productId: testProductId,
      quantity: 1,
    });

    // Manually simulate expiration by setting expiresAt in the past
    await prisma.commerceProposal.update({
      where: { id: proposal.id },
      data: { expiresAt: new Date(Date.now() - 10000) },
    });

    await expect(
      proposalService.confirmProposal(proposal.id, "human_user")
    ).rejects.toThrow(ProposalExpiredError);

    // Verify status updated to EXPIRED in database
    const updated = await proposalService.getProposalById(proposal.id);
    expect(updated?.status).toBe("EXPIRED");
  });

  it("should allow safe cancellation of pending proposal", async () => {
    const proposal = await proposalService.createProposal({
      productId: testProductId,
      quantity: 1,
    });

    const cancelled = await proposalService.cancelProposal(proposal.id);
    expect(cancelled.status).toBe("CANCELLED");
  });
});
