import { invoke } from "@tauri-apps/api/core";
import { useEffect, useState, useCallback, useMemo } from "react";

export interface RealtimeDataConfig {
    refreshInterval?: number;
    enableAutoRefresh?: boolean;
}

export function useRealtimeData<T>(
    commandName: string,
    args?: Record<string, unknown>,
    config: RealtimeDataConfig = {}
) {
    const [data, setData] = useState<T | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    const { refreshInterval = 30000, enableAutoRefresh = true } = config;

    // Memoize the stringified args to prevent unnecessary re-renders
    const argsKey = useMemo(() => JSON.stringify(args), [args]);

    const refresh = useCallback(async () => {
        try {
            const result = await invoke<T>(commandName, args);
            setData(result);
            setError(null);
            return result;
        } catch (err) {
            setError(err as Error);
            throw err;
        }
    }, [commandName, argsKey, args]);

    const load = useCallback(async () => {
        try {
            setLoading(true);
            await refresh();
        } finally {
            setLoading(false);
        }
    }, [refresh]);

    useEffect(() => {
        load();

        if (enableAutoRefresh && refreshInterval > 0) {
            const interval = setInterval(refresh, refreshInterval);
            return () => clearInterval(interval);
        }
    }, [load, refresh, enableAutoRefresh, refreshInterval]);

    return { data, loading, error, refresh, reload: load };
}