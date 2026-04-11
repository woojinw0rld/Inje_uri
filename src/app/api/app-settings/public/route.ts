import { ok, toErrorResponse } from '@/lib/server/api/response';
import { prisma } from '@/lib/server/prisma';

export const runtime = 'nodejs';

const DEFAULT_PUBLIC_APP_SETTINGS: Record<string, string> = {
  recommendation_reset_time_kst: '09:00',
  max_profile_images: '6',
  max_chat_rooms: '5',
  story_expiry_hours: '24',
};

export async function GET() {
  try {
    const rows = await prisma.appSetting.findMany({
      orderBy: { key: 'asc' },
    });

    const dbSettings = Object.fromEntries(
      rows.map((row: { key: string; value: string }) => [row.key, row.value]),
    );
    const settings = {
      ...DEFAULT_PUBLIC_APP_SETTINGS,
      ...dbSettings,
    };

    return ok({ settings });
  } catch (error) {
    return toErrorResponse(error);
  }
}
