/**
 * Real-time Web Knowledge & RAG Scraper Service
 * Queries Wikipedia API and DuckDuckGo HTML scraper for grounded context
 */

export interface SearchResultItem {
  title: string;
  snippet: string;
  source: "wikipedia" | "duckduckgo";
}

export class RagService {
  /**
   * Cleans text by stripping HTML tags and decoding common HTML entities
   */
  cleanText(raw: string): string {
    return raw
      .replace(/<[^>]+>/g, "")
      .replace(/&#039;/g, "'")
      .replace(/&#x27;/g, "'")
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&nbsp;/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  /**
   * Search Wikipedia API for topical factual summaries
   */
  async searchWikipedia(query: string, limit = 2): Promise<SearchResultItem[]> {
    try {
      const url = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(
        query
      )}&utf8=&format=json&srlimit=${limit}`;

      const res = await fetch(url, {
        headers: { "User-Agent": "SocraticTutor/2.0 (educational research)" },
        signal: AbortSignal.timeout(3000),
      });

      if (!res.ok) return [];
      const data = (await res.json()) as any;
      const searchItems = data?.query?.search || [];

      return searchItems.map((item: any) => ({
        title: item.title,
        snippet: this.cleanText(item.snippet),
        source: "wikipedia" as const,
      }));
    } catch {
      return [];
    }
  }

  /**
   * Search DuckDuckGo HTML for practical web snippets
   */
  async searchDuckDuckGo(query: string, limit = 3): Promise<SearchResultItem[]> {
    try {
      const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
      const res = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
        signal: AbortSignal.timeout(3500),
      });

      if (!res.ok) return [];
      const html = await res.text();
      const regex = /<a class="result__snippet[^>]*>([\s\S]*?)<\/a>/g;
      const items: SearchResultItem[] = [];

      let match;
      while ((match = regex.exec(html)) !== null && items.length < limit) {
        const snippet = this.cleanText(match[1]);
        if (snippet.length > 20) {
          items.push({
            title: `Web result for ${query}`,
            snippet,
            source: "duckduckgo",
          });
        }
      }
      return items;
    } catch {
      return [];
    }
  }

  /**
   * Primary search method: combines Wikipedia & DDG and formats a compact grounding context
   */
  async search(query: string): Promise<string> {
    if (!query || query.trim().length < 3) return "";

    const [wikiResults, ddgResults] = await Promise.all([
      this.searchWikipedia(query, 2),
      this.searchDuckDuckGo(query, 2),
    ]);

    const combined = [...wikiResults, ...ddgResults];
    if (combined.length === 0) return "";

    return combined
      .map((item, idx) => `[Fact ${idx + 1} - ${item.source}] ${item.title}: ${item.snippet}`)
      .join("\n\n");
  }
}

export const ragService = new RagService();

