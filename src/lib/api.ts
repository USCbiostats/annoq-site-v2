import { API_BASE, GRAPHQL_URL } from './config';
import type { Annotation } from '../types';

export async function fetchAnnotations(signal?: AbortSignal): Promise<Annotation[]> {
  const response = await fetch(`${API_BASE}/annotations`, { signal });
  if (!response.ok) {
    throw new Error(`Failed to fetch annotations (${response.status})`);
  }
  const payload = (await response.json()) as { results?: Annotation[] };
  return payload.results ?? [];
}

export async function graphqlRequest<TData>(
  query: string,
  signal?: AbortSignal
): Promise<TData> {
  const response = await fetch(GRAPHQL_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ query }),
    signal
  });
  if (!response.ok) {
    throw new Error(`GraphQL request failed (${response.status})`);
  }
  const payload = (await response.json()) as { data?: TData; errors?: Array<{ message: string }> };
  if (payload.errors?.length) {
    throw new Error(payload.errors.map((error) => error.message).join('; '));
  }
  if (!payload.data) {
    throw new Error('GraphQL response did not include data');
  }
  return payload.data;
}
