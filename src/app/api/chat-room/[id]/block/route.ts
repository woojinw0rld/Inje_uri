import { NextRequest } from "next/server";                                                 
import { getAuthUser } from "@/server/lib/auth";
import { ok, fail } from "@/server/lib/response";                                          
import { ERROR } from "@/server/lib/errors";
import * as chatRoomService from "@/server/services/conversation/chatRoom.service";

export async function PATCH(req: NextRequest,{ params }: { params: { id: string } }) {
    const user = await getAuthUser(req);
    if (!user) return fail(ERROR.UNAUTHORIZED, 401);

    const roomId = Number(params.id);
    if (isNaN(roomId)) return fail(ERROR.NOT_FOUND, 404);

    const body = await req.json();
    const { blockedByUserId } = body;

    if (!blockedByUserId) return fail(ERROR.FORBIDDEN, 400);

    const result = await chatRoomService.blockChatRoom(roomId, Number(blockedByUserId));

    if ("error" in result) {
        return fail(result.error!, 404);
    }

    return ok(result);
}