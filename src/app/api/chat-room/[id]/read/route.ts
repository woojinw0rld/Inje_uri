import { NextRequest } from "next/server";                                                 
import { getAuthUser } from "@/server/lib/auth";
import { ok, fail } from "@/server/lib/response";                                          
import { ERROR } from "@/server/lib/errors";
import * as messageService from "@/server/services/conversation/message.service";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const user = await getAuthUser(req);
    if (!user) return fail(ERROR.UNAUTHORIZED, 401);

    const { id } = await params;
    const roomId = Number(id);
    if (isNaN(roomId)) return fail(ERROR.NOT_FOUND, 404);

    const body = await req.json();
    const { lastReadMessageId } = body;

    if (!lastReadMessageId || isNaN(Number(lastReadMessageId))) {
        return fail(ERROR.INVALID_CURSOR, 400);
    }

    const result = await messageService.markAsRead(roomId, user.id,
    Number(lastReadMessageId));

    if ("error" in result) {
        return fail(result.error!, 403);
    }

    return ok(result);
}