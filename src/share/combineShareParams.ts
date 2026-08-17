export function combineShareParams(params: URLSearchParams): string {
  return [params.get('title'), params.get('text'), params.get('url')]
    .map((part) => part?.trim() ?? '')
    .filter((part) => part.length > 0)
    .join('\n');
}
