import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});
const prisma = new PrismaClient({ adapter });

const categorySeeds = [
  {
    category_code: "mbti",
    name: "MBTI",
    selection_type: "single",
    max_select_count: 1,
    keywords: [
      "INTJ",
      "INTP",
      "ENTJ",
      "ENTP",
      "INFJ",
      "INFP",
      "ENFJ",
      "ENFP",
      "ISTJ",
      "ISFJ",
      "ESTJ",
      "ESFJ",
      "ISTP",
      "ISFP",
      "ESTP",
      "ESFP",
    ],
  },
  {
    category_code: "lifestyle",
    name: "Lifestyle",
    selection_type: "single",
    max_select_count: 1,
    keywords: ["Homebody", "Outdoor", "Early Bird", "Night Owl"],
  },
  {
    category_code: "drinking",
    name: "Drinking",
    selection_type: "single",
    max_select_count: 1,
    keywords: ["Never", "Social", "Occasional", "Frequent"],
  },
  {
    category_code: "smoking",
    name: "Smoking",
    selection_type: "single",
    max_select_count: 1,
    keywords: ["Non Smoker", "Outside Only", "Occasional", "Smoker"],
  },
  {
    category_code: "personality",
    name: "Personality",
    selection_type: "multi",
    max_select_count: 3,
    keywords: [
      "Warm",
      "Calm",
      "Humorous",
      "Energetic",
      "Honest",
      "Thoughtful",
      "Ambitious",
      "Romantic",
    ],
  },
  {
    category_code: "interests",
    name: "Interests",
    selection_type: "multi",
    max_select_count: 5,
    keywords: [
      "Movies",
      "Music",
      "Cafe",
      "Travel",
      "Exercise",
      "Games",
      "Books",
      "Food",
    ],
  },
  {
    category_code: "desired_vibe",
    name: "Desired Vibe",
    selection_type: "single",
    max_select_count: 1,
    keywords: ["Comfortable", "Exciting", "Serious", "Casual", "Romantic"],
  },
  {
    category_code: "date_style",
    name: "Date Style",
    selection_type: "single",
    max_select_count: 1,
    keywords: ["Cafe Talk", "Good Food", "Walk", "Activity", "Drive"],
  },
  {
    category_code: "deal_breakers",
    name: "Deal Breakers",
    selection_type: "multi",
    max_select_count: 3,
    keywords: ["Rude", "Smoking", "Heavy Drinking", "Ghosting", "Late Reply"],
  },
];

const feedKeywordSeeds = [
  "산책",
  "카페",
  "맛집",
  "공부",
  "영화",
  "드라이브",
  "운동",
  "전시",
  "술",
  "독서",
  "수다",
  "취미",
];

const placeCategorySeeds = [
  { code: "cafe", name: "Cafe" },
  { code: "restaurant", name: "Restaurant" },
  { code: "dessert", name: "Dessert" },
  { code: "bar", name: "Bar" },
  { code: "park", name: "Park" },
  { code: "activity", name: "Activity" },
];

function toKeywordCode(label: string) {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

async function seedCategories() {
  for (const categorySeed of categorySeeds) {
    const category = await prisma.category.upsert({
      where: { category_code: categorySeed.category_code },
      update: {
        name: categorySeed.name,
        selection_type: categorySeed.selection_type,
        max_select_count: categorySeed.max_select_count,
      },
      create: {
        category_code: categorySeed.category_code,
        name: categorySeed.name,
        selection_type: categorySeed.selection_type,
        max_select_count: categorySeed.max_select_count,
      },
    });

    for (const [index, label] of categorySeed.keywords.entries()) {
      await prisma.keyword.upsert({
        where: {
          category_id_keyword_code: {
            category_id: category.category_id,
            keyword_code: toKeywordCode(label),
          },
        },
        update: {
          label,
          sort_order: index + 1,
        },
        create: {
          category_id: category.category_id,
          keyword_code: toKeywordCode(label),
          label,
          sort_order: index + 1,
        },
      });
    }
  }
}

async function seedFeedKeywords() {
  for (const [index, name] of feedKeywordSeeds.entries()) {
    await prisma.feedKeyword.upsert({
      where: { name },
      update: {
        sort_order: index + 1,
        is_active: true,
      },
      create: {
        name,
        sort_order: index + 1,
        is_active: true,
      },
    });
  }
}

async function seedPlaceCategories() {
  for (const placeCategory of placeCategorySeeds) {
    await prisma.placeCategory.upsert({
      where: { code: placeCategory.code },
      update: { name: placeCategory.name },
      create: placeCategory,
    });
  }
}

const testUserSeeds = [
  {
    real_name: "테스트유저A",
    age: 25,
    email: "test_a@inje.ac.kr",
    password_hash: "test_hash_a",
    nickname: "테스트A",
    gender: "male",
    university: "인제대학교",
    department: "컴퓨터공학과",
    student_year: 3,
    onboarding_completed: true,
  },
  {
    real_name: "테스트유저B",
    age: 24,
    email: "test_b@inje.ac.kr",
    password_hash: "test_hash_b",
    nickname: "테스트B",
    gender: "female",
    university: "인제대학교",
    department: "간호학과",
    student_year: 2,
    onboarding_completed: true,
  },
  {
    real_name: "테스트유저C",
    age: 23,
    email: "test_c@inje.ac.kr",
    password_hash: "test_hash_c",
    nickname: "테스트C",
    gender: "male",
    university: "인제대학교",
    department: "소프트웨어학과",
    student_year: 1,
    onboarding_completed: true,
  },
];

async function seedTestUsers() {
  for (const user of testUserSeeds) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: {
        nickname: user.nickname,
        real_name: user.real_name,
      },
      create: user,
    });
  }
}

async function main() {
  await seedCategories();
  await seedFeedKeywords();
  await seedPlaceCategories();
  await seedTestUsers();

  console.log("Seed baseline data has been prepared.");
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
