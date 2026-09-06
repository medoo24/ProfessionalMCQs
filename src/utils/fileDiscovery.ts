// ═══════════════════════════════════════════════════════
// fileDiscovery.ts — Auto-discovery of question bank files
// ═══════════════════════════════════════════════════════

export const DATA_FILE_EXTS = new Set(['json', 'txt', 'tsv', 'csv']);

/**
 * Discover question bank files automatically.
 * Strategy (in order):
 *  1. GitHub Contents API (works on GitHub Pages — zero manifest required)
 *  2. Fetch data/ directory listing (works with Python http.server & our Vite plugin)
 *  3. Fall back to data/manifest.json (for static hosts without directory indexes)
 *  4. Returns null so caller can fall back to AVAILABLE_FILES from config.ts
 */
export async function discoverDataFiles(): Promise<string[] | null> {
  // ── Attempt 1: GitHub Contents API ──
  try {
    const host = window.location.hostname;
    let owner = 'medoo24';
    let repo = 'ProfessionalMCQs';

    if (host.endsWith('.github.io')) {
      owner = host.split('.')[0];
      const parts = window.location.pathname.split('/').filter(Boolean);
      if (parts.length > 0) repo = parts[0];
    }

    if (owner && repo && (host.endsWith('.github.io') || host.includes('github'))) {
      const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/data`);
      if (res.ok) {
        const items = await res.json();
        if (Array.isArray(items) && items.length > 0) {
          const files = items
            .filter((item: any) => item.type === 'file' && DATA_FILE_EXTS.has((item.name.split('.').pop() || '').toLowerCase()))
            .map((item: any) => 'data/' + item.name);
          if (files.length > 0) return files;
        }
      }
    }
  } catch {
    /* GitHub API fallback */
  }

  // ── Attempt 2: parse local HTTP directory listing ──
  try {
    const r = await fetch('data/');
    if (r.ok) {
      const html = await r.text();
      const links = Array.from(html.matchAll(/href="([^"?#]+)"/gi))
        .map(m => m[1])
        .filter(href => {
          if (href.endsWith('/') || href.startsWith('?') || href === '../') return false;
          const ext = (href.split('.').pop() || '').toLowerCase();
          return DATA_FILE_EXTS.has(ext);
        })
        .map(href => 'data/' + (href.split('/').pop() || ''));
      if (links.length > 0) return links;
    }
  } catch {
    /* directory listing not available */
  }

  // ── Attempt 3: manifest.json fallback ──
  try {
    const r = await fetch('data/manifest.json');
    if (r.ok) {
      const j = await r.json();
      if (Array.isArray(j.files) && j.files.length) {
        return j.files.map((f: string) =>
          f.startsWith('data/') || f.startsWith('http') || f.startsWith('/') ? f : 'data/' + f
        );
      }
    }
  } catch {
    /* no manifest */
  }

  return null;
}
