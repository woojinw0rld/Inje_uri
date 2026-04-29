export const openApiSpec = {
    openapi: "3.0.3",
    info: {
      title: "인제우리 API",
      version: "1.0.0",
      description: "인제우리 채팅 API 문서",
    },
    servers: [
      { url: "http://localhost:3000", description: "로컬 개발 서버" },
    ],
    tags: [
      { name: "채팅방", description: "채팅방 생성, 조회, 상태 전이" },
      { name: "메시지", description: "메시지 전송, 조회, 읽음 처리" },
    ],
    paths: {
      "/api/chat-room": {
        post: {
          tags: ["채팅방"],
          summary: "채팅방 생성",
          description: "호감 수락(B) 또는 피드 댓글 선택(D) 후 채팅방 생성",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["targetUserId", "sourceType"],
                  properties: {
                    targetUserId: { type: "integer", example: 2 },
                    sourceType: {
                      type: "string",
                      enum: ["interest", "comment"],
                      example: "interest",
                    },
                    sourceInterestId: {
                      type: "integer",
                      example: 1,
                      description: "sourceType=interest 일 때 필수",
                    },
                    sourceCommentId: {
                      type: "integer",
                      example: 5,
                      description: "sourceType=comment 일 때 필수",
                    },
                  },
                },
              },
            },
          },
          responses: {
            "201": {
              description: "채팅방 생성 성공",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      chatRoomId: { type: "integer", example: 3 },
                    },
                  },
                },
              },
            },
            "400": { $ref: "#/components/responses/BadRequest" },
            "401": { $ref: "#/components/responses/Unauthorized" },
            "409": {
              description: "중복 채팅방 또는 재매칭 제한",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ErrorResponse" },
                  examples: {
                    duplicate: { value: { error: "DUPLICATE_ACTIVE_ROOM" } },
                    rematch: { value: { error: "REMATCH_TOO_SOON" } },
                  },
                },
              },
            },
          },
        },
        get: {
          tags: ["채팅방"],
          summary: "내 채팅방 목록 조회",
          parameters: [
            {
              name: "tab",
              in: "query",
              schema: {
                type: "string",
                enum: ["all", "unread"],
                default: "all",
              },
              description: "all: 전체, unread: 안 읽은 방만",
            },
          ],
          responses: {
            "200": {
              description: "채팅방 목록 반환",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      rooms: {
                        type: "array",
                        items: { $ref: "#/components/schemas/ChatRoomSummary" },
                      },
                    },
                  },
                },
              },
            },
            "401": { $ref: "#/components/responses/Unauthorized" },
          },
        },
      },

      "/api/chat-room/{id}": {
        get: {
          tags: ["채팅방"],
          summary: "채팅방 단건 조회",
          parameters: [{ $ref: "#/components/parameters/ChatRoomId" }],
          responses: {
            "200": {
              description: "채팅방 상세 반환",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      room: { $ref: "#/components/schemas/ChatRoomDetail" },
                    },
                  },
                },
              },
            },
            "401": { $ref: "#/components/responses/Unauthorized" },
            "403": { $ref: "#/components/responses/Forbidden" },
            "404": { $ref: "#/components/responses/NotFound" },
          },
        },
      },

      "/api/chat-room/{id}/messages": {
        get: {
          tags: ["메시지"],
          summary: "메시지 목록 조회",
          description:
            "cursor 기반 페이지네이션. cursor 없으면 최신 limit건. 조회 시 자동으로 읽음 처리됨.",
          parameters: [
            { $ref: "#/components/parameters/ChatRoomId" },
            {
              name: "cursor",
              in: "query",
              schema: { type: "integer" },
              description: "이 id보다 작은 메시지 조회 (위로 스크롤 시)",
            },
            {
              name: "limit",
              in: "query",
              schema: { type: "integer", default: 30 },
              description: "조회할 메시지 수 (기본 30)",
            },
          ],
          responses: {
            "200": {
              description: "메시지 목록 반환 (id DESC — 클라이언트에서 뒤집어 표시)",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      messages: {
                        type: "array",
                        items: { $ref: "#/components/schemas/Message" },
                      },
                    },
                  },
                },
              },
            },
            "401": { $ref: "#/components/responses/Unauthorized" },
            "403": { $ref: "#/components/responses/Forbidden" },
          },
        },
        post: {
          tags: ["메시지"],
          summary: "메시지 전송",
          parameters: [{ $ref: "#/components/parameters/ChatRoomId" }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["content"],
                  properties: {
                    content: { type: "string", example: "안녕하세요!", minLength: 1 },
                  },
                },
              },
            },
          },
          responses: {
            "201": {
              description: "메시지 전송 성공",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      message: { $ref: "#/components/schemas/MessageFull" },
                    },
                  },
                },
              },
            },
            "400": { $ref: "#/components/responses/BadRequest" },
            "401": { $ref: "#/components/responses/Unauthorized" },
            "403": {
              description: "접근 불가 (만료/차단/나간 방)",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ErrorResponse" },
                  examples: {
                    expired: { value: { error: "ROOM_EXPIRED" } },
                    notActive: { value: { error: "ROOM_NOT_ACTIVE" } },
                    forbidden: { value: { error: "FORBIDDEN" } },
                  },
                },
              },
            },
          },
        },
      },

      "/api/chat-room/{id}/read": {
        post: {
          tags: ["메시지"],
          summary: "읽음 처리",
          description:
            "클라이언트가 화면에서 본 마지막 메시지 id 전달 → last_read_message_id 갱신",
          parameters: [{ $ref: "#/components/parameters/ChatRoomId" }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["lastReadMessageId"],
                  properties: {
                    lastReadMessageId: { type: "integer", example: 42 },
                  },
                },
              },
            },
          },
          responses: {
            "200": {
              description: "읽음 처리 성공",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      success: { type: "boolean", example: true },
                    },
                  },
                },
              },
            },
            "400": { $ref: "#/components/responses/BadRequest" },
            "401": { $ref: "#/components/responses/Unauthorized" },
            "403": { $ref: "#/components/responses/Forbidden" },
          },
        },
      },

      "/api/chat-room/{id}/leave": {
        patch: {
          tags: ["채팅방"],
          summary: "채팅방 나가기",
          description: "left_at 기록. 양쪽 모두 나가면 status=closed 전이.",
          parameters: [{ $ref: "#/components/parameters/ChatRoomId" }],
          responses: {
            "200": {
              description: "나가기 성공",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      success: { type: "boolean", example: true },
                    },
                  },
                },
              },
            },
            "401": { $ref: "#/components/responses/Unauthorized" },
            "403": { $ref: "#/components/responses/Forbidden" },
            "404": { $ref: "#/components/responses/NotFound" },
          },
        },
      },

      "/api/chat-room/{id}/block": {
        patch: {
          tags: ["채팅방"],
          summary: "채팅방 차단 상태 전이",
          description: "D 파트가 차단 완료 후 호출. status=blocked + blocked_by_user_id 기록.",
          parameters: [{ $ref: "#/components/parameters/ChatRoomId" }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["blockedByUserId"],
                  properties: {
                    blockedByUserId: { type: "integer", example: 1 },
                  },
                },
              },
            },
          },
          responses: {
            "200": {
              description: "차단 전이 성공",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      roomStatus: { type: "string", example: "blocked" },
                    },
                  },
                },
              },
            },
            "400": { $ref: "#/components/responses/BadRequest" },
            "401": { $ref: "#/components/responses/Unauthorized" },
            "404": { $ref: "#/components/responses/NotFound" },
          },
        },
      },
    },

    components: {
      parameters: {
        ChatRoomId: {
          name: "id",
          in: "path",
          required: true,
          schema: { type: "integer" },
          description: "채팅방 ID",
        },
      },
      schemas: {
        ErrorResponse: {
          type: "object",
          properties: {
            error: { type: "string", example: "UNAUTHORIZED" },
          },
        },
        UserSummary: {
          type: "object",
          properties: {
            id: { type: "integer" },
            nickname: { type: "string" },
            userProfileImages: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  image_url: { type: "string" },
                },
              },
            },
          },
        },
        Participant: {
          type: "object",
          properties: {
            id: { type: "integer" },
            chat_room_id: { type: "integer" },
            user_id: { type: "integer" },
            joined_at: { type: "string", format: "date-time" },
            last_read_at: { type: "string", format: "date-time", nullable: true },
            last_read_message_id: { type: "integer", nullable: true },
            left_at: { type: "string", format: "date-time", nullable: true },
            user: { $ref: "#/components/schemas/UserSummary" },
          },
        },
        Message: {
          type: "object",
          properties: {
            id: { type: "integer" },
            sender_user_id: { type: "integer" },
            type: { type: "string", enum: ["text", "image", "system"] },
            content: { type: "string" },
            created_at: { type: "string", format: "date-time" },
          },
        },
        MessageFull: {
          type: "object",
          properties: {
            id: { type: "integer" },
            chat_room_id: { type: "integer" },
            sender_user_id: { type: "integer" },
            type: { type: "string", enum: ["text", "image", "system"] },
            content: { type: "string" },
            created_at: { type: "string", format: "date-time" },
            deleted_at: { type: "string", format: "date-time", nullable: true },
          },
        },
        ChatRoomSummary: {
          type: "object",
          description: "채팅방 목록 아이템 (마지막 메시지 포함)",
          properties: {
            id: { type: "integer" },
            source_type: { type: "string", enum: ["interest", "comment"] },
            status: {
              type: "string",
              enum: ["active", "expired", "blocked", "closed"],
            },
            created_at: { type: "string", format: "date-time" },
            expires_at: { type: "string", format: "date-time" },
            participants: {
              type: "array",
              items: { $ref: "#/components/schemas/Participant" },
            },
            messages: {
              type: "array",
              description: "마지막 메시지 1건",
              items: { $ref: "#/components/schemas/Message" },
            },
          },
        },
        ChatRoomDetail: {
          type: "object",
          description: "채팅방 단건 상세 (참여자 포함)",
          properties: {
            id: { type: "integer" },
            source_type: { type: "string", enum: ["interest", "comment"] },
            status: {
              type: "string",
              enum: ["active", "expired", "blocked", "closed"],
            },
            created_by_user_id: { type: "integer" },
            source_interest_id: { type: "integer", nullable: true },
            source_comment_id: { type: "integer", nullable: true },
            created_at: { type: "string", format: "date-time" },
            expires_at: { type: "string", format: "date-time" },
            extended_once: { type: "boolean" },
            blocked_by_user_id: { type: "integer", nullable: true },
            participants: {
              type: "array",
              items: { $ref: "#/components/schemas/Participant" },
            },
          },
        },
      },
      responses: {
        BadRequest: {
          description: "잘못된 요청",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ErrorResponse" },
            },
          },
        },
        Unauthorized: {
          description: "인증 필요",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ErrorResponse" },
              example: { error: "UNAUTHORIZED" },
            },
          },
        },
        Forbidden: {
          description: "접근 권한 없음",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ErrorResponse" },
              example: { error: "FORBIDDEN" },
            },
          },
        },
        NotFound: {
          description: "리소스를 찾을 수 없음",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ErrorResponse" },
              example: { error: "NOT_FOUND" },
            },
          },
        },
      },
    },
  };