import { NextResponse } from "next/server";
import { createSwaggerSpec } from "next-swagger-doc";

export async function GET() {
  const spec = createSwaggerSpec({
    apiFolder: "src/app/api",
    definition: {
      openapi: "3.0.0",
      info: {
        title: "인제우리 API",
        version: "0.3.0",
        description: "인제대학교 교내 매칭 서비스 API 문서",
      },
      tags: [
        { name: "추천", description: "오늘의 추천 관련 API" },
        { name: "호감", description: "호감 송수신 및 매칭 관련 API" },
        { name: "추천 설정", description: "추천 필터 설정 API" },
        { name: "배치", description: "배치 작업 API" },
      ],
      components: {
        securitySchemes: {
          UserAuth: {
            type: "apiKey",
            in: "header",
            name: "x-user-id",
            description: "테스트용 유저 ID (예: 1)",
          },
        },
        schemas: {
          ErrorResponse: {
            type: "object",
            properties: {
              success: { type: "boolean", example: false },
              error: {
                type: "object",
                properties: {
                  code: { type: "string", example: "INVALID_INPUT" },
                  message: { type: "string", example: "오류 메시지" },
                },
              },
            },
          },
          CandidateProfile: {
            type: "object",
            properties: {
              nickname: { type: "string", example: "테스트B" },
              age: { type: "integer", nullable: true, example: 24 },
              department: { type: "string", example: "간호학과" },
              student_year: { type: "integer", example: 2 },
              bio: { type: "string", nullable: true, example: null },
              primary_image_url: { type: "string", nullable: true, example: null },
              keywords: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    category: { type: "string", example: "MBTI" },
                    label: { type: "string", example: "INFP" },
                  },
                },
              },
            },
          },
          RecommendationCandidate: {
            type: "object",
            properties: {
              item_id: { type: "integer", example: 1 },
              candidate_user_id: { type: "integer", example: 2 },
              rank_order: { type: "integer", example: 1 },
              is_passed: { type: "boolean", example: false },
              blocked: { type: "boolean", example: false },
              profile: { $ref: "#/components/schemas/CandidateProfile" },
            },
          },
          InterestProfile: {
            type: "object",
            properties: {
              nickname: { type: "string", example: "테스트C" },
              age: { type: "integer", nullable: true, example: 23 },
              department: { type: "string", example: "소프트웨어학과" },
              student_year: { type: "integer", example: 1 },
              bio: { type: "string", nullable: true, example: null },
              primary_image_url: { type: "string", nullable: true, example: null },
            },
          },
          RecommendationSettings: {
            type: "object",
            properties: {
              exclude_same_department: { type: "boolean", example: false },
              reduce_same_year: { type: "boolean", example: false },
              preferred_age_min: { type: "integer", nullable: true, example: null },
              preferred_age_max: { type: "integer", nullable: true, example: null },
              updated_at: { type: "string", format: "date-time", example: "2026-04-14T03:56:39.371Z" },
            },
          },
        },
      },
      security: [{ UserAuth: [] }],
      paths: {
        "/api/recommendations/today": {
          get: {
            tags: ["추천"],
            summary: "오늘의 추천 조회",
            description: [
              "오늘 날짜(KST 기준) 추천 후보 목록을 반환합니다.",
              "추천 데이터가 없으면 REC_NOT_GENERATED 에러를 반환합니다.",
              "배치(POST /api/batch/recommendations) 또는 온보딩 완료 시점에 추천이 생성됩니다.",
            ].join("\n"),
            responses: {
              200: {
                description: "성공",
                content: {
                  "application/json": {
                    schema: {
                      type: "object",
                      properties: {
                        success: { type: "boolean", example: true },
                        data: {
                          type: "object",
                          properties: {
                            recommendation_id: { type: "integer", example: 1 },
                            recommendation_date: { type: "string", format: "date", example: "2026-04-14" },
                            is_selection_made: { type: "boolean", example: false },
                            selected_candidate_user_id: { type: "integer", nullable: true, example: null },
                            candidates: {
                              type: "array",
                              items: { $ref: "#/components/schemas/RecommendationCandidate" },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
              400: {
                description: "에러 응답",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                    examples: {
                      unauthorized: { summary: "인증 실패", value: { success: false, error: { code: "UNAUTHORIZED", message: "인증되지 않은 요청입니다." } } },
                      notGenerated: { summary: "추천 미생성", value: { success: false, error: { code: "REC_NOT_GENERATED", message: "오늘의 추천이 아직 준비되지 않았습니다." } } },
                    },
                  },
                },
              },
            },
          },
        },
        "/api/recommendations/select": {
          post: {
            tags: ["추천"],
            summary: "추천 후보 선택 (호감 전송)",
            description: [
              "오늘 추천 후보 중 1명을 선택해 호감을 전송합니다.",
              "하루 1회만 선택 가능합니다.",
              "상대방이 이미 나에게 호감을 보낸 경우 자동으로 매칭됩니다.",
              "recommendation_item_id는 GET /api/recommendations/today 응답의 candidates[].item_id 값입니다.",
            ].join("\n"),
            requestBody: {
              required: true,
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    required: ["recommendation_item_id"],
                    properties: {
                      recommendation_item_id: { type: "integer", example: 1 },
                    },
                  },
                },
              },
            },
            responses: {
              200: {
                description: "성공",
                content: {
                  "application/json": {
                    schema: {
                      type: "object",
                      properties: {
                        success: { type: "boolean", example: true },
                        data: {
                          type: "object",
                          properties: {
                            interest_id: { type: "integer", example: 1 },
                            matched: { type: "boolean", example: false, description: "쌍방 호감 시 true" },
                            chat_room_id: { type: "integer", nullable: true, example: null, description: "매칭 시 생성된 채팅방 ID" },
                          },
                        },
                      },
                    },
                  },
                },
              },
              400: {
                description: "에러 응답",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                    examples: {
                      alreadySelected: { summary: "이미 선택 완료", value: { success: false, error: { code: "ALREADY_SELECTED", message: "오늘 이미 호감을 보냈습니다." } } },
                      invalidItem: { summary: "유효하지 않은 항목", value: { success: false, error: { code: "INVALID_ITEM", message: "유효하지 않은 추천 항목입니다." } } },
                      duplicateInterest: { summary: "중복 호감", value: { success: false, error: { code: "DUPLICATE_INTEREST", message: "이미 호감을 보낸 상대입니다." } } },
                    },
                  },
                },
              },
            },
          },
        },
        "/api/recommendations/dismiss": {
          post: {
            tags: ["추천"],
            summary: "추천 후보 관심없음 처리",
            description: [
              "추천 후보를 관심없음으로 처리합니다.",
              "처리된 후보는 7일간 추천 후보에서 제외됩니다.",
              "이미 선택(호감 전송)이 완료된 추천 세트의 항목은 처리 불가합니다.",
            ].join("\n"),
            requestBody: {
              required: true,
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    required: ["item_id"],
                    properties: {
                      item_id: { type: "integer", example: 1 },
                    },
                  },
                },
              },
            },
            responses: {
              200: {
                description: "성공",
                content: {
                  "application/json": {
                    schema: {
                      type: "object",
                      properties: {
                        success: { type: "boolean", example: true },
                        data: {
                          type: "object",
                          properties: {
                            dismiss_id: { type: "integer", example: 1 },
                            expires_at: { type: "string", format: "date-time", example: "2026-04-21T00:00:00.000Z" },
                          },
                        },
                      },
                    },
                  },
                },
              },
              400: {
                description: "에러 응답",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                    examples: {
                      invalidItem: { summary: "유효하지 않은 항목", value: { success: false, error: { code: "INVALID_ITEM", message: "유효하지 않은 추천 항목입니다." } } },
                      alreadyPassed: { summary: "이미 처리된 항목", value: { success: false, error: { code: "ALREADY_PASSED", message: "이미 처리된 항목입니다." } } },
                    },
                  },
                },
              },
            },
          },
        },
        "/api/interests": {
          get: {
            tags: ["호감"],
            summary: "받은 호감 목록 조회",
            description: [
              "나에게 온 pending 상태의 호감 목록을 반환합니다.",
              "매칭 완료(matched_at 설정)되거나 거절된 호감은 목록에서 제외됩니다.",
              "차단 관계인 유저의 호감도 제외됩니다.",
            ].join("\n"),
            responses: {
              200: {
                description: "성공",
                content: {
                  "application/json": {
                    schema: {
                      type: "object",
                      properties: {
                        success: { type: "boolean", example: true },
                        data: {
                          type: "object",
                          properties: {
                            interests: {
                              type: "array",
                              items: {
                                type: "object",
                                properties: {
                                  interest_id: { type: "integer", example: 4 },
                                  from_user_id: { type: "integer", example: 3 },
                                  source_type: { type: "string", enum: ["recommendation", "direct"], example: "direct" },
                                  created_at: { type: "string", format: "date-time", example: "2026-04-14T13:01:15.591Z" },
                                  profile: { $ref: "#/components/schemas/InterestProfile" },
                                },
                              },
                            },
                            total_count: { type: "integer", example: 1 },
                          },
                        },
                      },
                    },
                  },
                },
              },
              400: {
                description: "에러 응답",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                    examples: {
                      unauthorized: { summary: "인증 실패", value: { success: false, error: { code: "UNAUTHORIZED", message: "인증되지 않은 요청입니다." } } },
                    },
                  },
                },
              },
            },
          },
        },
        "/api/interests/send": {
          post: {
            tags: ["호감"],
            summary: "호감 직접 전송",
            description: [
              "특정 유저에게 직접 호감을 전송합니다.",
              "상대방이 이미 나에게 호감을 보낸 경우 자동으로 매칭됩니다.",
              "이미 호감을 보낸 상대, 차단 관계인 경우 전송 불가합니다.",
            ].join("\n"),
            requestBody: {
              required: true,
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    required: ["to_user_id"],
                    properties: {
                      to_user_id: { type: "integer", example: 2 },
                    },
                  },
                },
              },
            },
            responses: {
              200: {
                description: "성공",
                content: {
                  "application/json": {
                    schema: {
                      type: "object",
                      properties: {
                        success: { type: "boolean", example: true },
                        data: {
                          type: "object",
                          properties: {
                            interest_id: { type: "integer", example: 3 },
                            matched: { type: "boolean", example: true, description: "쌍방 호감 시 true" },
                            chat_room_id: { type: "integer", nullable: true, example: null },
                          },
                        },
                      },
                    },
                  },
                },
              },
              400: {
                description: "에러 응답",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                    examples: {
                      duplicateInterest: { summary: "중복 호감", value: { success: false, error: { code: "DUPLICATE_INTEREST", message: "이미 호감을 보낸 상대입니다." } } },
                      blockedRelation: { summary: "차단 관계", value: { success: false, error: { code: "BLOCKED_RELATION", message: "차단 관계로 호감을 보낼 수 없습니다." } } },
                    },
                  },
                },
              },
            },
          },
        },
        "/api/interests/{id}": {
          post: {
            tags: ["호감"],
            summary: "호감 수락 또는 거절",
            description: [
              "받은 호감을 수락 또는 거절합니다.",
              "수락(accept) 시 역방향 호감이 자동 생성되고 매칭이 완료됩니다.",
              "이미 처리된 호감 또는 본인 소유가 아닌 호감은 처리 불가합니다.",
            ].join("\n"),
            parameters: [
              {
                name: "id",
                in: "path",
                required: true,
                schema: { type: "integer" },
                description: "호감 ID (GET /api/interests 응답의 interest_id)",
                example: 4,
              },
            ],
            requestBody: {
              required: true,
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    required: ["action"],
                    properties: {
                      action: {
                        type: "string",
                        enum: ["accept", "decline"],
                        example: "accept",
                        description: "accept: 수락, decline: 거절",
                      },
                    },
                  },
                },
              },
            },
            responses: {
              200: {
                description: "성공",
                content: {
                  "application/json": {
                    schema: {
                      type: "object",
                      properties: {
                        success: { type: "boolean", example: true },
                        data: {
                          type: "object",
                          properties: {
                            interest_id: { type: "integer", example: 5, description: "수락 시 생성된 역방향 호감 ID" },
                            matched: { type: "boolean", example: true },
                            chat_room_id: { type: "integer", nullable: true, example: null },
                          },
                        },
                      },
                    },
                  },
                },
              },
              400: {
                description: "에러 응답",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                    examples: {
                      invalidInterest: { summary: "유효하지 않은 호감", value: { success: false, error: { code: "INVALID_INTEREST", message: "유효하지 않은 호감입니다." } } },
                      alreadyProcessed: { summary: "이미 처리된 호감", value: { success: false, error: { code: "ALREADY_PROCESSED", message: "이미 처리된 호감입니다." } } },
                    },
                  },
                },
              },
            },
          },
        },
        "/api/recommendation-settings": {
          get: {
            tags: ["추천 설정"],
            summary: "추천 설정 조회",
            description: "현재 유저의 추천 필터 설정을 조회합니다. 설정이 없는 경우 기본값을 반환합니다.",
            responses: {
              200: {
                description: "성공",
                content: {
                  "application/json": {
                    schema: {
                      type: "object",
                      properties: {
                        success: { type: "boolean", example: true },
                        data: { $ref: "#/components/schemas/RecommendationSettings" },
                      },
                    },
                  },
                },
              },
              400: {
                description: "에러 응답",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                    examples: {
                      unauthorized: { summary: "인증 실패", value: { success: false, error: { code: "UNAUTHORIZED", message: "인증되지 않은 요청입니다." } } },
                    },
                  },
                },
              },
            },
          },
          patch: {
            tags: ["추천 설정"],
            summary: "추천 설정 변경",
            description: [
              "추천 필터 설정을 부분 업데이트합니다.",
              "전달하지 않은 필드는 기존 값이 유지됩니다.",
              "preferred_age_min이 preferred_age_max보다 클 수 없습니다.",
            ].join("\n"),
            requestBody: {
              required: true,
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      exclude_same_department: { type: "boolean", example: true, description: "같은 학과 제외 여부" },
                      reduce_same_year: { type: "boolean", example: false, description: "같은 학년 비중 축소 여부" },
                      preferred_age_min: { type: "integer", nullable: true, example: 20, description: "선호 최소 나이" },
                      preferred_age_max: { type: "integer", nullable: true, example: 27, description: "선호 최대 나이" },
                    },
                  },
                },
              },
            },
            responses: {
              200: {
                description: "성공",
                content: {
                  "application/json": {
                    schema: {
                      type: "object",
                      properties: {
                        success: { type: "boolean", example: true },
                        data: { $ref: "#/components/schemas/RecommendationSettings" },
                      },
                    },
                  },
                },
              },
              400: {
                description: "에러 응답",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                    examples: {
                      invalidInput: { summary: "나이 범위 오류", value: { success: false, error: { code: "INVALID_INPUT", message: "최소 나이는 최대 나이보다 클 수 없습니다." } } },
                    },
                  },
                },
              },
            },
          },
        },
        "/api/batch/recommendations": {
          post: {
            tags: ["배치"],
            summary: "일별 추천 배치 실행",
            description: [
              "매일 09:00 KST 기준으로 전체 활성 유저의 추천을 생성합니다.",
              "x-user-id 인증 불필요. x-batch-secret 헤더 인증 필요.",
              "이미 오늘 추천이 생성된 유저는 건너뜁니다.",
            ].join("\n"),
            security: [],
            parameters: [
              {
                name: "x-batch-secret",
                in: "header",
                required: true,
                schema: { type: "string" },
                description: "배치 시크릿 키 (.env BATCH_SECRET)",
              },
            ],
            responses: {
              200: {
                description: "성공",
                content: {
                  "application/json": {
                    schema: {
                      type: "object",
                      properties: {
                        success: { type: "boolean", example: true },
                        data: {
                          type: "object",
                          properties: {
                            date: { type: "string", format: "date", example: "2026-04-14" },
                            total: { type: "integer", example: 3, description: "대상 유저 수" },
                            success: { type: "integer", example: 3, description: "성공 수" },
                            failed: { type: "integer", example: 0, description: "실패 수" },
                          },
                        },
                      },
                    },
                  },
                },
              },
              400: {
                description: "에러 응답",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                    examples: {
                      unauthorized: { summary: "인증 실패", value: { success: false, error: { code: "UNAUTHORIZED", message: "인증되지 않은 요청입니다." } } },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  return NextResponse.json(spec);
}
