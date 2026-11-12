import { describe, it, expect, beforeAll } from "vitest";
import { catalogService } from "../src/server/commerce/catalog";
import { mockSearchProvider } from "../src/server/commerce/search/mock-provider";

describe("Phase 5 — Semantic Search Retrieval: Hybrid, Synonyms & Typo Tolerance", () => {
  beforeAll(async () => {
    await catalogService.ensureCatalogSeeded();
    const allProducts = await catalogService.searchProducts({ inStockOnly: false, limit: 100 });
    await mockSearchProvider.reindex(allProducts);
  });

  it("should retrieve products via exact and partial lexical keyword match", async () => {
    const res = await mockSearchProvider.search({
      query: "Logitech MX Mechanical",
      mode: "keyword",
      limit: 5,
    });

    expect(res.hits.length).toBeGreaterThan(0);
    expect(res.hits[0].document.name).toContain("Logitech MX Mechanical");
    expect(res.hits[0].lexicalScore).toBeGreaterThan(0.5);
    expect(res.searchMode).toBe("keyword");
  });

  it("should retrieve conceptually relevant products via semantic search even when query words differ from title", async () => {
    // Query does not contain "Keychron" or "Logitech", but asks for "quiet typing for coding"
    const res = await mockSearchProvider.search({
      query: "quiet typing tool for software programming",
      mode: "semantic",
      limit: 5,
    });

    expect(res.hits.length).toBeGreaterThan(0);
    const topCategories = res.hits.map((h) => h.document.category);
    // Should prioritize keyboards and developer software over audio or mice
    expect(topCategories.some((c) => c === "keyboards" || c === "software")).toBe(true);
    expect(res.hits[0].semanticScore).toBeGreaterThan(0.4);
  });

  it("should resolve domain-specific synonyms (keeb -> keyboard, display -> monitor, cordless -> wireless)", async () => {
    const resKeeb = await mockSearchProvider.search({
      query: "keeb for programming",
      mode: "hybrid",
      limit: 5,
    });

    expect(resKeeb.hits.length).toBeGreaterThan(0);
    expect(resKeeb.hits[0].document.category).toBe("keyboards");
    expect(resKeeb.queryAnalysis.detectedSynonyms).toContain("keyboard");

    const resDisplay = await mockSearchProvider.search({
      query: "4k display screen",
      mode: "hybrid",
      limit: 5,
    });

    expect(resDisplay.hits.length).toBeGreaterThan(0);
    expect(resDisplay.hits[0].document.category).toBe("monitors");
    expect(resDisplay.queryAnalysis.detectedSynonyms).toContain("monitor");
  });

  it("should tolerate common typos using Levenshtein distance (keybord, headfone, moniter, wireles)", async () => {
    // 1. "keybord" -> "keyboard"
    const resKeybord = await mockSearchProvider.search({
      query: "wireles keybord",
      mode: "hybrid",
      limit: 5,
    });

    expect(resKeybord.hits.length).toBeGreaterThan(0);
    expect(resKeybord.hits[0].document.category).toBe("keyboards");
    expect(resKeybord.queryAnalysis.correctedTypos["keybord"]).toBe("keyboard");
    expect(resKeybord.queryAnalysis.correctedTypos["wireles"]).toBe("wireless");

    // 2. "headfone" -> "headphone"
    const resHeadfone = await mockSearchProvider.search({
      query: "headfone with anc",
      mode: "hybrid",
      limit: 5,
    });

    expect(resHeadfone.hits.length).toBeGreaterThan(0);
    expect(resHeadfone.hits[0].document.category).toBe("audio");
    expect(resHeadfone.queryAnalysis.correctedTypos["headfone"]).toBe("headphone");

    // 3. "moniter" -> "monitor"
    const resMoniter = await mockSearchProvider.search({
      query: "4k moniter",
      mode: "hybrid",
      limit: 5,
    });

    expect(resMoniter.hits.length).toBeGreaterThan(0);
    expect(resMoniter.hits[0].document.category).toBe("monitors");
    expect(resMoniter.queryAnalysis.correctedTypos["moniter"]).toBe("monitor");
  });

  it("should combine lexical and semantic scores in hybrid mode", async () => {
    const res = await mockSearchProvider.search({
      query: "wireless mechanical keyboard",
      mode: "hybrid",
      limit: 5,
    });

    expect(res.hits.length).toBeGreaterThan(0);
    const topHit = res.hits[0];
    expect(topHit.lexicalScore).toBeGreaterThan(0);
    expect(topHit.semanticScore).toBeGreaterThan(0);
    // Hybrid score is mathematically bounded between 0 and 1
    expect(topHit.score).toBeGreaterThan(0);
    expect(topHit.score).toBeLessThanOrEqual(1.0);
  });
});
