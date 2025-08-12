import { useState, useEffect, useCallback, useRef } from 'react';

interface FetchOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  body?: unknown;
  cache?: boolean;
  debounceMs?: number;
}

interface FetchState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

// Cache simples em memória
const cache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

export function useOptimizedFetch<T = unknown>(url: string, options: FetchOptions = {}) {
  const [state, setState] = useState<FetchState<T>>({
    data: null,
    loading: false,
    error: null
  });

  const abortControllerRef = useRef<AbortController | null>(null);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const fetchData = useCallback(async (fetchUrl: string, fetchOptions: FetchOptions = {}) => {
    // Cancelar requisição anterior se existir
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Verificar cache para requisições GET
    if (fetchOptions.method === 'GET' || !fetchOptions.method) {
      const cacheKey = `${fetchUrl}_${JSON.stringify(fetchOptions)}`;
      const cached = cache.get(cacheKey);
      
      if (cached && fetchOptions.cache !== false) {
        const isExpired = Date.now() - cached.timestamp > CACHE_DURATION;
        if (!isExpired) {
          setState({ data: cached.data as T | null, loading: false, error: null });
          return cached.data;
        }
      }
    }

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      abortControllerRef.current = new AbortController();
      
      const response = await fetch(fetchUrl, {
        method: fetchOptions.method || 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...fetchOptions.headers
        },
        body: fetchOptions.body ? JSON.stringify(fetchOptions.body) : undefined,
        signal: abortControllerRef.current.signal
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: unknown = await response.json();
      
      // Armazenar no cache para requisições GET
      if (fetchOptions.method === 'GET' || !fetchOptions.method) {
        const cacheKey = `${fetchUrl}_${JSON.stringify(fetchOptions)}`;
        cache.set(cacheKey, { data, timestamp: Date.now() });
      }

      setState({ data: data as T | null, loading: false, error: null });
      return data;
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'AbortError') {
        return; // Requisição cancelada, não atualizar estado
      }
      
      setState({ data: null, loading: false, error: error instanceof Error ? error.message : 'Unknown error' });
      throw error;
    }
  }, []);

  const debouncedFetch = useCallback((fetchUrl: string, fetchOptions: FetchOptions = {}) => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    const debounceMs = fetchOptions.debounceMs || 0;
    
    if (debounceMs > 0) {
      debounceTimeoutRef.current = setTimeout(() => {
        fetchData(fetchUrl, fetchOptions);
      }, debounceMs);
    } else {
      fetchData(fetchUrl, fetchOptions);
    }
  }, [fetchData]);

  // Fetch automático na montagem do componente para requisições GET
  useEffect(() => {
    if (url && (!options.method || options.method === 'GET')) {
      debouncedFetch(url, options);
    }

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [url, debouncedFetch, options]);

  // Função para fazer requisições manuais
  const mutate = useCallback((mutateOptions: FetchOptions = {}) => {
    return fetchData(url, { ...options, ...mutateOptions });
  }, [url, options, fetchData]);

  // Função para limpar cache
  const clearCache = useCallback(() => {
    cache.clear();
  }, []);

  // Função para revalidar dados
  const revalidate = useCallback(() => {
    if (url) {
      return fetchData(url, { ...options, cache: false });
    }
  }, [url, options, fetchData]);

  return {
    ...state,
    mutate,
    revalidate,
    clearCache
  };
}

// Hook específico para operações CRUD
export function useCRUD<T = unknown>(baseUrl: string) {
  const [state, setState] = useState<FetchState<T[]>>({
    data: null,
    loading: false,
    error: null
  });

  const { data, loading, error, revalidate } = useOptimizedFetch<T[]>(baseUrl);

  useEffect(() => {
    setState({ data, loading, error });
  }, [data, loading, error]);

  const create = useCallback(async (item: Partial<T>) => {
    try {
      const response = await fetch(baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item)
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      await revalidate();
      return await response.json();
    } catch (error: unknown) {
      throw new Error(error instanceof Error ? error.message : 'Unknown error');
    }
  }, [baseUrl, revalidate]);

  const update = useCallback(async (id: number, item: Partial<T>) => {
    try {
      const response = await fetch(baseUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...item, id })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      await revalidate();
      return await response.json();
    } catch (error: unknown) {
      throw new Error(error instanceof Error ? error.message : 'Unknown error');
    }
  }, [baseUrl, revalidate]);

  const remove = useCallback(async (id: number) => {
    try {
      const response = await fetch(`${baseUrl}/${id}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      await revalidate();
      return true;
    } catch (error: unknown) {
      throw new Error(error instanceof Error ? error.message : 'Unknown error');
    }
  }, [baseUrl, revalidate]);

  return {
    data: state.data,
    loading: state.loading,
    error: state.error,
    create,
    update,
    remove,
    revalidate
  };
}