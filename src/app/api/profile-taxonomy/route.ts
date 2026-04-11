import { ok, toErrorResponse } from '@/lib/server/api/response';
import { prisma } from '@/lib/server/prisma';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { category_id: 'asc' },
      include: {
        keywords: {
          orderBy: { sort_order: 'asc' },
        },
      },
    });

    return ok({
      categories: categories.map((category) => ({
        id: category.category_id,
        code: category.category_code,
        name: category.name,
        selectionType: category.selection_type,
        maxSelectCount: category.max_select_count,
        keywords: category.keywords.map((keyword) => ({
          id: keyword.keyword_id,
          code: keyword.keyword_code,
          label: keyword.label,
          sortOrder: keyword.sort_order,
        })),
      })),
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}

