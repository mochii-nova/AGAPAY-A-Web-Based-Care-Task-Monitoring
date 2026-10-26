import useApiData from './useApiData';

// The residents assigned to me (an administrator gets all of them)
export default function useResidents() {
  const query = useApiData('/residents');
  return { ...query, residents: query.data ?? [] };
}
