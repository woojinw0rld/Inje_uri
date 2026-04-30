import { withAuth } from '@/server/lib/auth';
import { ok } from '@/server/lib/response';
import { getProfileTaxonomy } from '@/server/services/user/user.service';

export const runtime = 'nodejs';

export const GET = withAuth(async () => {
  return ok(await getProfileTaxonomy());
});
