import { RssItem } from '../types';

// List of CORS proxies to try in order
const PROXIES = [
  (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  (url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
  (url: string) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`
];

const ensureProtocol = (url: string): string => {
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return `https://${url}`;
  }
  return url;
};

export const fetchRssFeed = async (url: string): Promise<RssItem[]> => {
  const targetUrl = ensureProtocol(url.trim());
  let lastError: any;

  for (const createProxyUrl of PROXIES) {
    try {
      const proxyUrl = createProxyUrl(targetUrl);
      // console.log(`Attempting to fetch RSS via proxy: ${proxyUrl}`);
      
      const response = await fetch(proxyUrl);
      if (!response.ok) {
        throw new Error(`Proxy responded with status: ${response.status} ${response.statusText}`);
      }
      
      const text = await response.text();
      
      if (!text || text.trim().length === 0) {
        throw new Error("Received empty response from proxy");
      }

      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(text, "text/xml");
      
      const errorNode = xmlDoc.querySelector("parsererror");
      if (errorNode) {
        throw new Error("XML Parsing failed: Invalid XML returned");
      }

      const items: RssItem[] = [];
      
      // Handle RSS 2.0
      const rssItems = xmlDoc.querySelectorAll("item");
      rssItems.forEach(item => {
        const title = item.querySelector("title")?.textContent || "No Title";
        const link = item.querySelector("link")?.textContent || "";
        const description = item.querySelector("description")?.textContent || "";
        const contentEncoded = item.querySelector("content\\:encoded")?.textContent || "";
        const pubDate = item.querySelector("pubDate")?.textContent || "";

        // Prefer content:encoded if available and longer than description, otherwise description
        const content = (contentEncoded.length > description.length) ? contentEncoded : description;

        items.push({
          title,
          link,
          content: content || title, // Fallback to title if no content
          pubDate,
        });
      });

      // Handle Atom (if RSS 2.0 items are empty, try Atom entries)
      if (items.length === 0) {
        const atomEntries = xmlDoc.querySelectorAll("entry");
        atomEntries.forEach(entry => {
          const title = entry.querySelector("title")?.textContent || "No Title";
          // Atom links are often attributes
          const linkNode = entry.querySelector("link");
          const link = linkNode?.getAttribute("href") || linkNode?.textContent || "";
          
          const summary = entry.querySelector("summary")?.textContent || "";
          const contentTag = entry.querySelector("content")?.textContent || "";
          const content = (contentTag.length > summary.length) ? contentTag : summary;
          
          const pubDate = entry.querySelector("updated")?.textContent || entry.querySelector("published")?.textContent || "";

          items.push({
            title,
            link,
            content: content || title,
            pubDate,
          });
        });
      }

      // If we successfully parsed XML but found no items, try the next proxy
      // (sometimes proxies return HTML error pages that parse as XML but have no items)
      if (items.length === 0) {
        throw new Error("No RSS/Atom items found in the feed");
      }

      // Return top 20 items
      return items.slice(0, 20);

    } catch (error) {
      console.warn(`Fetch failed for proxy option`, error);
      lastError = error;
      // Continue to next proxy in the loop
    }
  }

  // If we get here, all proxies failed
  console.error("All RSS fetch attempts failed.", lastError);
  throw new Error(`Failed to fetch RSS feed. Please check the URL or try again later. Last error: ${lastError?.message}`);
};