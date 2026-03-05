import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('liteapi property preview pagination order', () => {
  const source = readFileSync(resolve(process.cwd(), 'src/server/liteapi.ts'), 'utf8');

  it('paginates filtered property lists instead of slicing supplier-paged subsets', () => {
    expect(source).toContain('const supplierLimit = Math.min(200, page * limit);');
    expect(source).toContain('return toResult(paginate(filteredByAiSearch), degradedReason === null ? null : \'partial\');');
    expect(source).toContain('return toResult(paginate(filteredByCity), degradedReason === null ? null : \'partial\');');
    expect(source).not.toContain('filteredByAiSearch.slice(0, limit)');
    expect(source).not.toContain('filteredByCity.slice(0, limit)');
  });

  it('does not pass offset into fallback rates request body', () => {
    expect(source).toContain('limit: supplierLimit');
    expect(source).not.toContain('limit,\n        offset');
  });
});
