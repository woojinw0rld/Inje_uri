//Prisma가 자동생성한 DB클라이언트 클래스 가져옴
import {PrismaClient} from "@prisma/client"; 


//globalThis(Node.js 전역 객체)에 prisma 속성을 붙일 수 있도록 타입 확장. 원래 globalThis엔 prisma가 없어서 TypeScript가  에러 내니까 as unknown as {...}로 타입 우회.
const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined;  
};

//전역에 이미 선언됐으면 안함. 없으면 새로 생성. - new PrismaClient() 중복 호출 방지.
export const prisma = globalForPrisma.prisma ?? new PrismaClient(); 

//디버깅용. 
// export const prisma =                                                                                                   
//     globalForPrisma.prisma ??                                                                                             
//     new PrismaClient({
//       log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
//     });


//개발 환경에서만 전역에 저장. Next.js dev 모드는 파일 변경 시 모듈을 재로드, 그때마다 new PrismaClient()가 새로 생기면 DB연결이 계속 쌓임.
//전역에 저장해두면 재로드돼도 기존 인스턴스 재사용.
//프로덕션에선 모듈 재로드가 없음. 전역에 저장 불필요.
if(process.env.NODE_ENV !== "production"){
    globalForPrisma.prisma = prisma;
}



/*
일반적으로는 그냥 이렇게 써도 돼:
  import { PrismaClient } from "@prisma/client";
  export const prisma = new PrismaClient();

  근데 Next.js dev 환경에서 문제가 생겨. 코드 수정할 때마다 HMR(Hot Module Replacement)이 모듈을 재로드하는데, 재로드할
  때마다 new PrismaClient()가 새로 실행되면서 DB 커넥션이 계속 쌓여. PostgreSQL 기본 커넥션 한도가 100개인데 개발하다 보면
   금방 초과됨.

  그래서 globalThis에 저장해서 재로드돼도 기존 인스턴스 재사용하는 방식이 나온 거야. "우회"처럼 보이지만 Next.js + Prisma
  조합에선 표준 패턴이야.
*/