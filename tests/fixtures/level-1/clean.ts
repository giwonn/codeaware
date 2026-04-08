const MAX_RETRY_COUNT = 3;
const HTTP_OK = 200;

export function isSuccessResponse(statusCode: number): boolean {
  return statusCode === HTTP_OK;
}
