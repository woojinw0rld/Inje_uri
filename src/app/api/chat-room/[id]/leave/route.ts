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

    const result = await chatRoomService.leaveChatRoom(roomId, user.id);

    if ("error" in result) {
        const err = result.error!;
        if (err === ERROR.FORBIDDEN) return fail(err, 403);
        return fail(err, 404);
    }

    return ok(result);
}