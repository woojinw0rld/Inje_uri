// Node.js 런타임 서버 시작 훅

// pg 라이브러리가 Windows에서 Unix 소켓 경로 탐색 시 발생하는 ENOENT 에러 억제
process.on("uncaughtException", (err: NodeJS.ErrnoException) => {
  if (err.code === "ENOENT") return;
  console.error("[uncaughtException]", err);
});

export {};
