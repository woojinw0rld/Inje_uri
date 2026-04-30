  export const openApiSpec = {                                                                    
    openapi: "3.0.3",                                                                             
    info: {                                                                                       
      title: "인제우리 API",
      version: "1.0.0",
      description: "인제우리 B파트(추천/호감) + C파트(채팅) + D파트(피드/댓글/신고/차단) API 문서",
    },
    servers: [
      { url: "http://localhost:3000", description: "로컬 개발 서버" },
    ],
    tags: [
      { name: "추천", description: "오늘의 추천 후보 조회/선택/dismiss" },
      { name: "추천 설정", description: "추천 필터(같은 학과 제외, 같은 학번 감소, 선호 연령) 조회/수정" },
      { name: "호감", description: "호감 보내기/받은 목록/수락/거절" },
      { name: "채팅방", description: "채팅방 생성, 조회, 상태 전이" },
      { name: "메시지", description: "메시지 전송, 조회, 읽음 처리" },
      { name: "피드", description: "셀프데이트 피드 조회, 작성, 수정, 삭제" },
      { name: "댓글", description: "피드 댓글 조회, 작성, 댓글 선택 채팅 생성" },
      { name: "차단", description: "사용자 차단, 전화번호 차단, 차단 목록/해제" },
      { name: "신고", description: "사용자/피드/댓글/채팅방/메시지 신고" },
    ],
    paths: {
      "/api/recommendations/today": {
        get: {
          tags: ["추천"],
          summary: "오늘의 추천 목록 조회",
          description: "KST 오늘 날짜 기준 사용자의 추천 후보 목록 반환. 매칭/dismiss/passed 처리된 항목은 제외.",
          responses: {
            "200": {
              description: "오늘 추천 목록 반환",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/TodayRecommendationsResponse" },
                },
              },
            },
            "400": { $ref: "#/components/responses/BadRequest" },
          },
        },
      },

      "/api/recommendations/select": {
        post: {
          tags: ["추천"],
          summary: "추천 후보 선택 (호감 발송)",
          description: "추천 항목을 선택하여 호감 전송. 쌍방 호감인 경우 매칭 성사 + 채팅방 자동 생성.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["recommendation_item_id"],
                  properties: {
                    recommendation_item_id: { type: "integer", example: 12 },
                  },
                },
              },
            },
          },
          responses: {
            "200": {
              description: "선택 처리 결과 (매칭 여부 포함)",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/SelectRecommendationResponse" },
                },
              },
            },
            "400": { $ref: "#/components/responses/BadRequest" },
          },
        },
      },

      "/api/recommendations/{itemId}/dismiss": {
        post: {
          tags: ["추천"],
          summary: "추천 후보 dismiss",
          description: "추천 항목을 오늘 목록에서 제거 (dismissed 처리)",
          parameters: [{ $ref: "#/components/parameters/RecommendationItemId" }],
          responses: {
            "200": {
              description: "dismiss 성공",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/DismissRecommendationResponse" },
                },
              },
            },
            "400": { $ref: "#/components/responses/BadRequest" },
          },
        },
      },

      "/api/recommendation-settings": {
        get: {
          tags: ["추천 설정"],
          summary: "추천 설정 조회",
          responses: {
            "200": {
              description: "추천 설정 반환",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/RecommendationSettingResponse" },
                },
              },
            },
            "400": { $ref: "#/components/responses/BadRequest" },
          },
        },
        patch: {
          tags: ["추천 설정"],
          summary: "추천 설정 부분 업데이트 (UPSERT)",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    exclude_same_department: { type: "boolean", example: true },
                    reduce_same_year: { type: "boolean", example: false },
                    preferred_age_min: { type: "integer", example: 20 },
                    preferred_age_max: { type: "integer", example: 28 },
                  },
                },
              },
            },
          },
          responses: {
            "200": {
              description: "업데이트 성공",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/RecommendationSettingResponse" },
                },
              },
            },
            "400": { $ref: "#/components/responses/BadRequest" },
          },
        },
      },

      "/api/interests/send": {
        post: {
          tags: ["호감"],
          summary: "호감 직접 발송 (deprecated)",
          description: "추천 흐름 외 직접 호감 발송. B파트 명세서 v1.2 기준 필수 API 아님.",
          deprecated: true,
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["to_user_id"],
                  properties: {
                    to_user_id: { type: "integer", example: 5 },
                  },
                },
              },
            },
          },
          responses: {
            "200": {
              description: "호감 발송 결과",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/SendInterestResponse" },
                },
              },
            },
            "400": { $ref: "#/components/responses/BadRequest" },
          },
        },
      },

      "/api/interests/received": {
        get: {
          tags: ["호감"],
          summary: "받은 호감 목록 조회",
          description: "pending 상태의 받은 호감 목록 반환",
          responses: {
            "200": {
              description: "받은 호감 목록 반환",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ReceivedInterestsResponse" },
                },
              },
            },
            "400": { $ref: "#/components/responses/BadRequest" },
          },
        },
      },

      "/api/interests/{interestId}/accept": {
        post: {
          tags: ["호감"],
          summary: "받은 호감 수락 (매칭 성사)",
          description: "수락 시 쌍방 호감 → 매칭 성사 + C파트 채팅방 자동 생성",
          parameters: [{ $ref: "#/components/parameters/InterestId" }],
          responses: {
            "200": {
              description: "수락 처리 결과 (매칭 + 채팅방 ID)",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/AcceptInterestResponse" },
                },
              },
            },
            "400": { $ref: "#/components/responses/BadRequest" },
          },
        },
      },

      "/api/interests/{interestId}/decline": {
        post: {
          tags: ["호감"],
          summary: "받은 호감 거절",
          parameters: [{ $ref: "#/components/parameters/InterestId" }],
          responses: {
            "200": {
              description: "거절 처리 성공",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/DeclineInterestResponse" },
                },
              },
            },
            "400": { $ref: "#/components/responses/BadRequest" },
          },
        },
      },

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
                      success: { type: "boolean", example: true },
                      data: {
                        type: "object",
                        properties: {
                          chatRoomId: { type: "integer", example: 3 },
                        },
                      },
                    },
                  },
                },
              },
            },
            "400": { $ref: "#/components/responses/BadRequest" },
          },
        },
        get: {
          tags: ["채팅방"],
          summary: "내 채팅방 목록 조회",
          parameters: [
            {
              name: "tab",
              in: "query",
              schema: { type: "string", enum: ["all", "unread"], default: "all" },
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
                      success: { type: "boolean", example: true },
                      data: {
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
              },
            },
            "400": { $ref: "#/components/responses/BadRequest" },
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
                      success: { type: "boolean", example: true },
                      data: {
                        type: "object",
                        properties: {
                          room: { $ref: "#/components/schemas/ChatRoomDetail" },
                        },
                      },
                    },
                  },
                },
              },
            },
            "400": { $ref: "#/components/responses/BadRequest" },
          },
        },
      },

      "/api/chat-room/{id}/messages": {
        get: {
          tags: ["메시지"],
          summary: "메시지 목록 조회",
          description: "cursor 기반 페이지네이션. cursor 없으면 최신 limit건. 조회 시 자동으로  읽음 처리됨.",
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
                      success: { type: "boolean", example: true },
                      data: {
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
              },
            },
            "400": { $ref: "#/components/responses/BadRequest" },
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
                    content: { type: "string", example: "안녕하세요!", minLength: 1, maxLength: 1000 },                   
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
                      success: { type: "boolean", example: true },
                      data: {
                        type: "object",
                        properties: {
                          message: { $ref: "#/components/schemas/MessageFull" },
                        },
                      },
                    },
                  },
                },
              },
            },
            "400": { $ref: "#/components/responses/BadRequest" },
          },
        },
      },

      "/api/chat-room/{id}/read": {
        post: {
          tags: ["메시지"],
          summary: "읽음 처리",
          description: "클라이언트가 화면에서 본 마지막 메시지 id 전달 → last_read_message_id  갱신",
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
                      data: {
                        type: "object",
                        properties: {
                          success: { type: "boolean", example: true },
                        },
                      },
                    },
                  },
                },
              },
            },
            "400": { $ref: "#/components/responses/BadRequest" },
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
                      data: {
                        type: "object",
                        properties: {
                          success: { type: "boolean", example: true },
                        },
                      },
                    },
                  },
                },
              },
            },
            "400": { $ref: "#/components/responses/BadRequest" },
          },
        },
      },

      "/api/chat-room/{id}/block": {
        patch: {
          tags: ["채팅방"],
          summary: "채팅방 차단 상태 전이",
          description: "D 파트가 차단 완료 후 호출. status=blocked + blocked_by_user_id 기록.",
          parameters: [{ $ref: "#/components/parameters/ChatRoomId" }],          
          responses: {
            "200": {
              description: "차단 전이 성공",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      success: { type: "boolean", example: true },
                      data: {
                        type: "object",
                        properties: {
                          roomStatus: { type: "string", example: "blocked" },
                        },
                      },
                    },
                  },
                },
              },
            },
            "400": { $ref: "#/components/responses/BadRequest" },
          },
        },
      },

      "/api/feeds": {
        get: {
          tags: ["피드"],
          summary: "피드 목록 조회",
          description: "활성 + 미만료 피드를 차단 관계와 banned 사용자를 제외하고 cursor 기반으로 조회",
          parameters: [
            { name: "keyword", in: "query", schema: { type: "string" }, description: "피드 키워드 이름 필터" },
            { name: "cursor", in: "query", schema: { type: "integer" }, description: "다음 페이지 기준 피드 ID" },
          ],
          responses: {
            "200": { description: "피드 목록", content: { "application/json": { schema: { $ref: "#/components/schemas/FeedListResponse" } } } },
            "400": { $ref: "#/components/responses/BadRequest" },
          },
        },
        post: {
          tags: ["피드"],
          summary: "피드 작성",
          description: "1인 1활성피드 검증 후 피드와 키워드를 생성",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["text", "feedKeywordIds"],
                  properties: {
                    text: { type: "string", example: "오늘 같이 산책할 사람!" },
                    feedKeywordIds: { type: "array", items: { type: "integer" }, example: [1, 2] },
                  },
                },
              },
            },
          },
          responses: {
            "200": { description: "피드 작성 성공", content: { "application/json": { schema: { $ref: "#/components/schemas/CreateFeedResponse" } } } },
            "400": { $ref: "#/components/responses/BadRequest" },
          },
        },
      },

      "/api/feeds/{id}": {
        get: {
          tags: ["피드"],
          summary: "피드 상세 조회",
          parameters: [{ $ref: "#/components/parameters/FeedId" }],
          responses: {
            "200": { description: "피드 상세", content: { "application/json": { schema: { $ref: "#/components/schemas/FeedDetailResponse" } } } },
            "400": { $ref: "#/components/responses/BadRequest" },
          },
        },
        patch: {
          tags: ["피드"],
          summary: "피드 수정",
          description: "본인 피드의 본문 또는 키워드를 수정",
          parameters: [{ $ref: "#/components/parameters/FeedId" }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    text: { type: "string", example: "수정된 피드 본문" },
                    feedKeywordIds: { type: "array", items: { type: "integer" }, example: [1, 3] },
                  },
                },
              },
            },
          },
          responses: {
            "200": { description: "피드 수정 성공", content: { "application/json": { schema: { $ref: "#/components/schemas/UpdatedResponse" } } } },
            "400": { $ref: "#/components/responses/BadRequest" },
          },
        },
        delete: {
          tags: ["피드"],
          summary: "피드 삭제",
          description: "본인 피드를 soft delete 처리",
          parameters: [{ $ref: "#/components/parameters/FeedId" }],
          responses: {
            "200": { description: "피드 삭제 성공", content: { "application/json": { schema: { $ref: "#/components/schemas/DeletedResponse" } } } },
            "400": { $ref: "#/components/responses/BadRequest" },
          },
        },
      },

      "/api/feeds/{id}/comments": {
        get: {
          tags: ["댓글"],
          summary: "피드 댓글 목록 조회",
          parameters: [{ $ref: "#/components/parameters/FeedId" }],
          responses: {
            "200": { description: "댓글 목록", content: { "application/json": { schema: { $ref: "#/components/schemas/CommentListResponse" } } } },
            "400": { $ref: "#/components/responses/BadRequest" },
          },
        },
        post: {
          tags: ["댓글"],
          summary: "댓글 작성",
          parameters: [{ $ref: "#/components/parameters/FeedId" }],
          requestBody: {
            required: true,
            content: { "application/json": { schema: { type: "object", required: ["content"], properties: { content: { type: "string", example: "댓글 남깁니다" } } } } },
          },
          responses: {
            "200": { description: "댓글 작성 성공", content: { "application/json": { schema: { $ref: "#/components/schemas/CreateCommentResponse" } } } },
            "400": { $ref: "#/components/responses/BadRequest" },
          },
        },
      },

      "/api/feeds/{id}/view": {
        post: {
          tags: ["피드"],
          summary: "피드 조회 기록",
          parameters: [{ $ref: "#/components/parameters/FeedId" }],
          responses: {
            "200": { description: "조회 기록 저장", content: { "application/json": { schema: { $ref: "#/components/schemas/RecordedResponse" } } } },
            "400": { $ref: "#/components/responses/BadRequest" },
          },
        },
      },

      "/api/feeds/keywords": {
        get: {
          tags: ["피드"],
          summary: "피드 키워드 목록",
          responses: {
            "200": { description: "피드 키워드 목록", content: { "application/json": { schema: { $ref: "#/components/schemas/KeywordListResponse" } } } },
            "400": { $ref: "#/components/responses/BadRequest" },
          },
        },
      },

      "/api/feeds/mine": {
        get: {
          tags: ["피드"],
          summary: "내 활성 피드 조회",
          responses: {
            "200": { description: "내 활성 피드", content: { "application/json": { schema: { $ref: "#/components/schemas/MyFeedResponse" } } } },
            "400": { $ref: "#/components/responses/BadRequest" },
          },
        },
      },

      "/api/feeds/commented-by-me": {
        get: {
          tags: ["댓글"],
          summary: "내가 댓글 단 피드 목록",
          responses: {
            "200": { description: "내 댓글 피드 목록", content: { "application/json": { schema: { $ref: "#/components/schemas/MyCommentedFeedListResponse" } } } },
            "400": { $ref: "#/components/responses/BadRequest" },
          },
        },
      },

      "/api/feeds/comments/{id}/select-chat": {
        post: {
          tags: ["댓글"],
          summary: "댓글 선택 후 채팅방 생성",
          description: "피드 작성자가 댓글을 선택해 C파트 채팅방 생성 로직으로 채팅방 생성",
          parameters: [{ $ref: "#/components/parameters/CommentId" }],
          responses: {
            "200": { description: "채팅방 생성 성공", content: { "application/json": { schema: { $ref: "#/components/schemas/SelectChatResponse" } } } },
            "400": { $ref: "#/components/responses/BadRequest" },
          },
        },
      },

      "/api/blocks": {
        get: {
          tags: ["차단"],
          summary: "차단 목록 조회",
          responses: {
            "200": { description: "차단 목록", content: { "application/json": { schema: { $ref: "#/components/schemas/BlockListResponse" } } } },
            "400": { $ref: "#/components/responses/BadRequest" },
          },
        },
        post: {
          tags: ["차단"],
          summary: "사용자 차단",
          requestBody: {
            required: true,
            content: { "application/json": { schema: { type: "object", required: ["blockedUserId"], properties: { blockedUserId: { type: "integer", example: 3 }, reason: { type: "string", nullable: true, example: "불편한 사용자" } } } } },
          },
          responses: {
            "200": { description: "차단 성공", content: { "application/json": { schema: { $ref: "#/components/schemas/BlockUserResponse" } } } },
            "400": { $ref: "#/components/responses/BadRequest" },
          },
        },
        delete: {
          tags: ["차단"],
          summary: "차단 해제",
          requestBody: {
            required: true,
            content: { "application/json": { schema: { type: "object", required: ["blockId"], properties: { blockId: { type: "integer", example: 1 } } } } },
          },
          responses: {
            "200": { description: "차단 해제 성공", content: { "application/json": { schema: { $ref: "#/components/schemas/UnblockResponse" } } } },
            "400": { $ref: "#/components/responses/BadRequest" },
          },
        },
      },

      "/api/blocks/phone": {
        post: {
          tags: ["차단"],
          summary: "전화번호 차단",
          requestBody: {
            required: true,
            content: { "application/json": { schema: { type: "object", required: ["phoneNumberE164"], properties: { phoneNumberE164: { type: "string", example: "+821012345678" } } } } },
          },
          responses: {
            "200": { description: "전화번호 차단 성공", content: { "application/json": { schema: { $ref: "#/components/schemas/PhoneBlockResponse" } } } },
            "400": { $ref: "#/components/responses/BadRequest" },
          },
        },
      },

      "/api/reports": {
        post: {
          tags: ["신고"],
          summary: "신고 생성",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["targetType", "targetId", "reasonType"],
                  properties: {
                    targetType: { type: "string", enum: ["user", "feed", "feed_comment", "chat_room", "message"], example: "feed" },
                    targetId: { type: "integer", example: 2 },
                    reasonType: { type: "string", example: "spam" },
                    description: { type: "string", nullable: true, example: "스팸성 내용입니다" },
                    alsoBlock: { type: "boolean", example: false },
                  },
                },
              },
            },
          },
          responses: {
            "200": { description: "신고 성공", content: { "application/json": { schema: { $ref: "#/components/schemas/CreateReportResponse" } } } },
            "400": { $ref: "#/components/responses/BadRequest" },
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
        FeedId: {
          name: "id",
          in: "path",
          required: true,
          schema: { type: "integer" },
          description: "피드 ID",
        },
        CommentId: {
          name: "id",
          in: "path",
          required: true,
          schema: { type: "integer" },
          description: "댓글 ID",
        },
        RecommendationItemId: {
          name: "itemId",
          in: "path",
          required: true,
          schema: { type: "integer" },
          description: "추천 항목 ID",
        },
        InterestId: {
          name: "interestId",
          in: "path",
          required: true,
          schema: { type: "integer" },
          description: "호감 ID",
        },
      },
      schemas: {
        RecommendationCandidate: {
          type: "object",
          properties: {
            recommendation_item_id: { type: "integer", example: 12 },
            user_id: { type: "integer", example: 5 },
            nickname: { type: "string", example: "테스트B" },
            profile_image: { type: "string", nullable: true, example: null },
          },
        },
        TodayRecommendationsResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            data: {
              type: "object",
              properties: {
                items: {
                  type: "array",
                  items: { $ref: "#/components/schemas/RecommendationCandidate" },
                },
              },
            },
          },
        },
        SelectRecommendationResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            data: {
              type: "object",
              properties: {
                matched: { type: "boolean", example: true, description: "쌍방 호감으로 매칭 성사 여부" },
                chat_room_id: { type: "integer", nullable: true, example: 3, description: "매칭 시 생성된 채팅방 ID" },
              },
            },
          },
        },
        DismissRecommendationResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            data: { type: "object", properties: { dismissed: { type: "boolean", example: true } } },
          },
        },
        RecommendationSettingResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            data: {
              type: "object",
              properties: {
                user_id: { type: "integer", example: 1 },
                exclude_same_department: { type: "boolean", example: false },
                reduce_same_year: { type: "boolean", example: false },
                preferred_age_min: { type: "integer", nullable: true, example: 20 },
                preferred_age_max: { type: "integer", nullable: true, example: 28 },
              },
            },
          },
        },
        InterestItem: {
          type: "object",
          properties: {
            interest_id: { type: "integer", example: 7 },
            from_user_id: { type: "integer", example: 5 },
            nickname: { type: "string", example: "테스트B" },
            profile_image: { type: "string", nullable: true, example: null },
            created_at: { type: "string", format: "date-time" },
          },
        },
        ReceivedInterestsResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            data: {
              type: "object",
              properties: {
                items: { type: "array", items: { $ref: "#/components/schemas/InterestItem" } },
              },
            },
          },
        },
        SendInterestResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            data: {
              type: "object",
              properties: {
                interest_id: { type: "integer", example: 7 },
                matched: { type: "boolean", example: false },
                chat_room_id: { type: "integer", nullable: true, example: null },
              },
            },
          },
        },
        AcceptInterestResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            data: {
              type: "object",
              properties: {
                matched: { type: "boolean", example: true },
                chat_room_id: { type: "integer", nullable: true, example: 3 },
              },
            },
          },
        },
        DeclineInterestResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            data: { type: "object", properties: { declined: { type: "boolean", example: true } } },
          },
        },
        ErrorResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: false },
            error: {
              type: "object",
              properties: {
                code: { type: "string", example: "UNAUTHORIZED" },
                message: { type: "string", example: "인증이 필요합니다." },
              },
            },
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
            status: { type: "string", enum: ["active", "expired", "blocked", "closed"] },
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
            status: { type: "string", enum: ["active", "expired", "blocked", "closed"] },
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
        FeedAuthor: {
          type: "object",
          properties: {
            userId: { type: "integer", example: 1 },
            nickname: { type: "string", example: "테스트A" },
            profileImage: { type: "string", nullable: true, example: null },
          },
        },
        FeedKeyword: {
          type: "object",
          properties: {
            feedKeywordId: { type: "integer", example: 1 },
            name: { type: "string", example: "산책" },
          },
        },
        FeedListItem: {
          type: "object",
          properties: {
            feedId: { type: "integer", example: 10 },
            text: { type: "string", example: "오늘 같이 산책할 사람!" },
            status: { type: "string", example: "active" },
            createdAt: { type: "string", format: "date-time" },
            expiresAt: { type: "string", format: "date-time" },
            author: { $ref: "#/components/schemas/FeedAuthor" },
            keywords: { type: "array", items: { $ref: "#/components/schemas/FeedKeyword" } },
            primaryImage: { type: "string", nullable: true, example: null },
            commentCount: { type: "integer", example: 2 },
          },
        },
        FeedListResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            data: {
              type: "object",
              properties: {
                items: { type: "array", items: { $ref: "#/components/schemas/FeedListItem" } },
                nextCursor: { type: "integer", nullable: true, example: null },
              },
            },
          },
        },
        CreateFeedResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            data: { type: "object", properties: { feedId: { type: "integer", example: 1 }, expiresAt: { type: "string", format: "date-time" } } },
          },
        },
        FeedDetailResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            data: {
              type: "object",
              properties: {
                feed: {
                  allOf: [
                    { $ref: "#/components/schemas/FeedListItem" },
                    {
                      type: "object",
                      properties: {
                        updatedAt: { type: "string", format: "date-time" },
                        boostScore: { type: "integer", example: 0 },
                        images: { type: "array", items: { type: "object", properties: { imageId: { type: "integer" }, imageUrl: { type: "string" }, sortOrder: { type: "integer" } } } },
                      },
                    },
                  ],
                },
              },
            },
          },
        },
        KeywordListResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            data: { type: "object", properties: { items: { type: "array", items: { type: "object", properties: { feedKeywordId: { type: "integer" }, name: { type: "string" }, sortOrder: { type: "integer" } } } } } },
          },
        },
        MyFeedResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            data: { type: "object", properties: { feed: { nullable: true, $ref: "#/components/schemas/FeedListItem" } } },
          },
        },
        CommentItem: {
          type: "object",
          properties: {
            commentId: { type: "integer", example: 1 },
            content: { type: "string", example: "댓글입니다" },
            createdAt: { type: "string", format: "date-time" },
            commenter: { $ref: "#/components/schemas/FeedAuthor" },
          },
        },
        CommentListResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            data: { type: "object", properties: { items: { type: "array", items: { $ref: "#/components/schemas/CommentItem" } } } },
          },
        },
        CreateCommentResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            data: { type: "object", properties: { commentId: { type: "integer", example: 1 } } },
          },
        },
        MyCommentedFeedListResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            data: { type: "object", properties: { items: { type: "array", items: { type: "object", properties: { comment: { type: "object", properties: { commentId: { type: "integer" }, content: { type: "string" }, createdAt: { type: "string", format: "date-time" } } }, feed: { $ref: "#/components/schemas/FeedListItem" } } } } } },
          },
        },
        SelectChatResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            data: { type: "object", properties: { chatRoomId: { type: "integer", example: 1 } } },
          },
        },
        UpdatedResponse: {
          type: "object",
          properties: { success: { type: "boolean", example: true }, data: { type: "object", properties: { updated: { type: "boolean", example: true } } } },
        },
        DeletedResponse: {
          type: "object",
          properties: { success: { type: "boolean", example: true }, data: { type: "object", properties: { deleted: { type: "boolean", example: true } } } },
        },
        RecordedResponse: {
          type: "object",
          properties: { success: { type: "boolean", example: true }, data: { type: "object", properties: { recorded: { type: "boolean", example: true } } } },
        },
        BlockListResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            data: { type: "object", properties: { items: { type: "array", items: { type: "object", properties: { blockId: { type: "integer" }, blockedUser: { $ref: "#/components/schemas/FeedAuthor" }, reason: { type: "string", nullable: true }, createdAt: { type: "string", format: "date-time" } } } } } },
          },
        },
        BlockUserResponse: {
          type: "object",
          properties: { success: { type: "boolean", example: true }, data: { type: "object", properties: { blockId: { type: "integer", example: 1 } } } },
        },
        UnblockResponse: {
          type: "object",
          properties: { success: { type: "boolean", example: true }, data: { type: "object", properties: { unblocked: { type: "boolean", example: true } } } },
        },
        PhoneBlockResponse: {
          type: "object",
          properties: { success: { type: "boolean", example: true }, data: { type: "object", properties: { phoneBlockId: { type: "integer", example: 1 } } } },
        },
        CreateReportResponse: {
          type: "object",
          properties: { success: { type: "boolean", example: true }, data: { type: "object", properties: { reportId: { type: "integer", example: 1 } } } },
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
              example: {
                success: false,
                error: { code: "UNAUTHORIZED", message: "인증이 필요합니다." },
              },
            },
          },
        },
        Forbidden: {
          description: "접근 권한 없음",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ErrorResponse" },
              example: {
                success: false,
                error: { code: "FORBIDDEN", message: "접근 권한이 없습니다." },
              },
            },
          },
        },
        NotFound: {
          description: "리소스를 찾을 수 없습니다.",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ErrorResponse" },
              example: {
                success: false,
                error: { code: "NOT_FOUND", message: "채팅방을 찾을 수 없습니다." },
              },
            },
          },
        },
      },
    },
  };
