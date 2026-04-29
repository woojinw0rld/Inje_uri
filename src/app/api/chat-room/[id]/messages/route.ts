import { NextRequest } from "next/server";                                                 
import { getAuthUser } from "@/server/lib/auth";
import { ok, fail } from "@/server/lib/response";                                          
import { ERROR } from "@/server/lib/errors";
import * as messageService from "@/server/services/conversation/message.service";

export async function GET(req: NextRequest,{ params }: { params: Promise<{ id: string }> }) {
    const user = await getAuthUser(req);
    if (!user) return fail(ERROR.UNAUTHORIZED, 401);

    const { id } = await params;
    const roomId = Number(id);
    if (isNaN(roomId)) return fail(ERROR.NOT_FOUND, 404);

    const { searchParams } = new URL(req.url);
    const cursor = searchParams.get("cursor") ? Number(searchParams.get("cursor")) :
    undefined;
    const limit = searchParams.get("limit") ? Number(searchParams.get("limit")) : 30;

    const result = await messageService.getMessages(roomId, user.id, cursor, limit);

    if ("error" in result) {
        return fail(result.error!, 403);
    }

    return ok(result);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const user = await getAuthUser(req);
    if (!user) return fail(ERROR.UNAUTHORIZED, 401);

    const { id } = await params;
    const roomId = Number(id);
    if (isNaN(roomId)) return fail(ERROR.NOT_FOUND, 404);

    const body = await req.json();
    const { content } = body;

    if (!content || typeof content !== "string" || content.trim() === "") {
        return fail(ERROR.INVALID_CONTENT, 400);
    }

    const result = await messageService.sendMessage(roomId, user.id, content.trim());

    if ("error" in result) {
        const err = result.error!;
        if (err === ERROR.ROOM_EXPIRED) return fail(err, 403);
        if (err === ERROR.ROOM_NOT_ACTIVE) return fail(err, 403);
        if (err === ERROR.FORBIDDEN) return fail(err, 403);
        return fail(err, 404);
    }

    return ok(result, 201);
}