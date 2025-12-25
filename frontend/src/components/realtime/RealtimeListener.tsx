import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { useWebSocket } from "../../hooks/useWebSocket";

export function RealtimeListener() {
  const queryClient = useQueryClient();
  const socket = useWebSocket();

  useEffect(() => {
    const invalidateBugs = () =>
      queryClient.invalidateQueries({ queryKey: ["bugs"] });

    socket.on("bug.created", invalidateBugs);
    socket.on("bug.updated", invalidateBugs);

    return () => {
      socket.off("bug.created", invalidateBugs);
      socket.off("bug.updated", invalidateBugs);
    };
  }, [queryClient, socket]);

  return null;
}
