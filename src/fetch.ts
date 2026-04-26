export interface FetchResult {
  url: string;
  html: string;
  statusCode: number;
}

// TODO: Backend가 구현
// - URL이면 fetch로 HTML 가져오기
// - 로컬 파일이면 fs.readFile
export async function fetchPage(urlOrPath: string): Promise<FetchResult> {
  throw new Error("Not yet implemented — Backend task");
}
