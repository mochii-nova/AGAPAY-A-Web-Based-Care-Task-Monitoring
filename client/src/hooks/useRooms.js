import useApiData from './useApiData';

// All rooms, with their beds and who is in them (GET /api/rooms)
export default function useRooms() {
  const query = useApiData('/rooms');
  return { ...query, rooms: query.data ?? [] };
}