import { invoke } from "@tauri-apps/api/core";
import { useEffect, useState, useCallback } from "react";

export interface RealtimeDataConfig {
    refreshInterval?: number;
    enableAutoRefresh?: boolean;
}

export function useRealtimeData<T>(
    commandName: string,
    args?: any,
    config: RealtimeDataConfig = {}
) {
    const [data, setData] = useState<T | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    const { refreshInterval = 30000, enableAutoRefresh = true } = config;

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
    }, [commandName, JSON.stringify(args)]);

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