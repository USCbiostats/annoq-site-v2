import { useQuery } from '@tanstack/react-query';
import { fetchApiVersion } from '../../lib/api';

export function useApiVersion() {
  return useQuery({
    queryKey: ['api-version'],
    queryFn: ({ signal }) => fetchApiVersion(signal),
    staleTime: 1000 * 60 * 30
  });
}
