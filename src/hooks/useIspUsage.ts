import { useQuery } from "@tanstack/react-query";
import { fetchIspUsage } from "@/services/cloudApis";

export function useIspUsage(days = 7) {
  return useQuery({
    queryKey: ["isp-usage", days],
    queryFn: ({ signal }) => fetchIspUsage(days, signal),
    staleTime: 60 * 1000,
    retry: 1,
  });
}
