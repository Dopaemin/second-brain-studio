import { useState, useEffect, useCallback } from "react";
import {
  Pod,
  getStoredPods,
  createPod as createPodLib,
  updatePod as updatePodLib,
  deletePod as deletePodLib,
  subscribePods,
  PodColor,
} from "@/lib/pods";

export function usePods() {
  const [pods, setPods] = useState<Pod[]>(getStoredPods);

  useEffect(() => {
    const unsubscribe = subscribePods(() => {
      setPods(getStoredPods());
    });
    return unsubscribe;
  }, []);

  const addPod = useCallback(
    async (data: {
      name: string;
      mission: string;
      team: string;
      color: PodColor;
      documentPath: string;
    }) => {
      return await createPodLib(data);
    },
    []
  );

  const updatePod = useCallback(
    (id: string, data: Partial<Omit<Pod, "id" | "createdAt">>) => {
      return updatePodLib(id, data);
    },
    []
  );

  const removePod = useCallback((id: string) => {
    deletePodLib(id);
  }, []);

  return {
    pods,
    addPod,
    updatePod,
    removePod,
  };
}
