import { useQuery } from '@tanstack/react-query';
import { fetchAnnotations } from '../../lib/api';
import { buildAnnotationStore } from '../../lib/annotations';

export function useAnnotations() {
  return useQuery({
    queryKey: ['annotations'],
    queryFn: ({ signal }) => fetchAnnotations(signal),
    select: buildAnnotationStore,
    staleTime: 1000 * 60 * 30
  });
}
