/* eslint-disable @typescript-eslint/no-explicit-any */
import type { NextRequest } from 'next/server';
import { ok } from '@/lib/server/api/response';
import { withAuth } from '@/lib/server/auth/middleware';
import { prisma } from '@/lib/server/prisma';

export const runtime = 'nodejs';

export const GET = withAuth(async (_request: NextRequest) => {
  const categories = await prisma.category.findMany({
    orderBy: { category_id: 'asc' },
    include: {
      keywords: {
        orderBy: { sort_order: 'asc' },
      },
    },
  });

  return ok({
    categories: categories.map((category: any) => ({
      id: category.category_id,
      code: category.category_code,
      name: category.name,
      selectionType: category.selection_type,
      maxSelectCount: category.max_select_count,
      keywords: category.keywords.map((keyword: any) => ({
        id: keyword.keyword_id,
        code: keyword.keyword_code,
        label: keyword.label,
        sortOrder: keyword.sort_order,
      })),
    })),
  });
});
