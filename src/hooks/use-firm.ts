import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMyFirm } from "@/lib/firm.functions";

export function useFirm() {
  const fn = useServerFn(getMyFirm);
  return useQuery({ queryKey: ["my-firm"], queryFn: () => fn() });
}
