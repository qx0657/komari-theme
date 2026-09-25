import { useQuery } from "@tanstack/react-query";
import { fetchAirportUsage } from "@/services/cloudApis";

export function useAirportUsage(path: string) {
  const enabled = path.startsWith("/");
  return useQuery({
    queryKey: ["airport-usage", path],
    queryFn: ({ signal }) => fetchAirportUsage(path, signal),
    enabled,
    staleTime: 60 * 1000,
    retry: 1,
  });
}
