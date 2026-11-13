import { describe, it, expect, beforeAll } from "vitest";
import { catalogService } from "../src/server/commerce/catalog";
import { SearchDocumentNormalizer } from "../src/server/commerce/search/normalizer";
import { MockEmbeddingProvider, cosineSimilarity, normalizeVector } from "../src/server/commerce/search/embedding";

describe("Phase 5 — Semantic Search: Document Normalization & Deterministic Embedding", () => {
  let normalizer: SearchDocumentNormalizer;
  let embeddingProvider: MockEmbeddingProvider;

  beforeAll(async () => {
    await catalogService.ensureCatalogSeeded();
    embeddingProvider = new MockEmbeddingProvider();
    normalizer = new SearchDocumentNormalizer(embeddingProvider);
  });

  it("should normalize an authoritative Prisma Product into a canonical ProductSearchDocument", async () => {
    const product = await catalogService.getProductBySku("PROD-KB-001");
    expect(product).not.toBeNull();

    const doc = await normalizer.normalizeProduct(product!);

    expect(doc.id).toBe(product!.id);
    expect(doc.sku).toBe(product!.sku);
    expect(doc.name).toBe(product!.name);
    expect(doc.category).toBe("keyboards");
    expect(doc.brand).toBeDefined();
    expect(doc.price).toBe(Number(product!.price));
    expect(doc.currency).toBe(product!.currency);
    expect(doc.inventory).toBe(product!.inventory);
    expect(doc.features).toContain("wireless");
    expect(doc.useCases).toContain("coding");
    expect(doc.searchText).toContain(product!.name.toLowerCase());
    expect(doc.searchText).toContain("keyboards");
    expect(doc.embedding).toBeDefined();
    expect(doc.embedding?.length).toBe(64);
  });

  it("should generate deterministic vectors where identical text produces identical embedding", async () => {
    const query = "wireless mechanical keyboard for coding";
    const vec1 = await embeddingProvider.getEmbedding(query);
    const vec2 = await embeddingProvider.getEmbedding(query);

    expect(vec1.length).toBe(64);
    expect(vec2.length).toBe(64);
    expect(vec1).toEqual(vec2);
  });

  it("should ensure vectors are normalized to unit Euclidean length (L2 norm = 1.0)", async () => {
    const vec = await embeddingProvider.getEmbedding("noise-cancelling headphones for travel");
    let sumSq = 0;
    for (const val of vec) {
      sumSq += val * val;
    }
    const norm = Math.sqrt(sumSq);
    expect(norm).toBeCloseTo(1.0, 4);
  });

  it("should exhibit meaningful semantic differentiation between concepts", async () => {
    // Concept A1: Quiet keyboard for programming
    const vecKeyboard1 = await embeddingProvider.getEmbedding("quiet mechanical keyboard for coding");
    // Concept A2: Low-noise typing development keeb
    const vecKeyboard2 = await embeddingProvider.getEmbedding("silent typing keeb for programming");

    // Concept B: Noise-canceling audio headphones for travel
    const vecAudio = await embeddingProvider.getEmbedding("noise-cancelling wireless headphones for travel");

    const keyboardSimilarity = cosineSimilarity(vecKeyboard1, vecKeyboard2);
    const crossCategorySimilarity = cosineSimilarity(vecKeyboard1, vecAudio);

    // Conceptually related phrases should have high cosine similarity (> 0.65)
    expect(keyboardSimilarity).toBeGreaterThan(0.65);

    // Conceptually unrelated phrases should have low cosine similarity (< 0.40)
    expect(crossCategorySimilarity).toBeLessThan(0.40);

    // High similarity must exceed cross-category similarity significantly
    expect(keyboardSimilarity).toBeGreaterThan(crossCategorySimilarity + 0.3);
  });
});
