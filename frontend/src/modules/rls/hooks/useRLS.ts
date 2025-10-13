import { useState, useEffect, useCallback } from 'react';
import { getApiUrl } from '@/shared/services/api/config';

// Types
export interface RLSContext {
  user_id: number;
  organization_id?: number;
  tenant_id?: string;
  project_ids?: number[];
  roles?: string[];
  permissions?: string[];
  session_id?: string;
}

export interface AccessCheckRequest {
  entity_type: string;
  action: string;
  entity_id?: number;
  table_name?: string;
}

export interface AccessCheckResult {
  access_granted: boolean;
  denial_reason?: string;
  entity_type: string;
  action: string;
  entity_id?: number;
  checked_at: string;
}

export interface RLSPolicy {
  id: number;
  name: string;
  description?: string;
  entity_type: string;
  table_name: string;
  policy_type: string;
  action: string;
  is_active: boolean;
  priority: number;
}

/**
 * Hook for RLS context management
 */
export const useRLSContext = () => {
  const [context, setContext] = useState<RLSContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchContext = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('access_token');
      
      const response = await fetch(getApiUrl('/api/v1/rls/context'), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setContext(data);
        setError(null);
      } else {
        throw new Error('Failed to fetch RLS context');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load RLS context');
      setContext(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshContext = useCallback(async () => {
    try {
      const token = localStorage.getItem('access_token');
      
      const response = await fetch(getApiUrl('/api/v1/rls/context/refresh'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setContext(data);
        setError(null);
        return data;
      } else {
        throw new Error('Failed to refresh RLS context');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh RLS context');
      throw err;
    }
  }, []);

  useEffect(() => {
    fetchContext();
  }, [fetchContext]);

  return {
    context,
    loading,
    error,
    refreshContext,
    refetch: fetchContext
  };
};

/**
 * Hook for checking access permissions
 */
export const useRLSAccess = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkAccess = useCallback(async (request: AccessCheckRequest): Promise<AccessCheckResult> => {
    try {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem('access_token');
      
      const response = await fetch(getApiUrl('/api/v1/rls/check-access'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(request),
      });

      if (response.ok) {
        const result = await response.json();
        return result;
      } else {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Access check failed');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Access check failed';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  const checkMultipleAccess = useCallback(async (requests: AccessCheckRequest[]): Promise<AccessCheckResult[]> => {
    try {
      setLoading(true);
      setError(null);
      
      const results = await Promise.all(
        requests.map(request => checkAccess(request))
      );
      
      return results;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Multiple access check failed';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [checkAccess]);

  return {
    checkAccess,
    checkMultipleAccess,
    loading,
    error
  };
};

/**
 * Hook for managing RLS policies
 */
export const useRLSPolicies = () => {
  const [policies, setPolicies] = useState<RLSPolicy[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPolicies = useCallback(async (filters?: Record<string, any>) => {
    try {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem('access_token');
      const params = new URLSearchParams();
      
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== '') {
            params.append(key, value.toString());
          }
        });
      }

      const url = `${getApiUrl('/api/v1/rls/policies')}${params.toString() ? `?${params}` : ''}`;
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setPolicies(data);
      } else {
        throw new Error('Failed to fetch RLS policies');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load RLS policies');
    } finally {
      setLoading(false);
    }
  }, []);

  const createPolicy = useCallback(async (policyData: Partial<RLSPolicy>) => {
    try {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem('access_token');
      
      const response = await fetch(getApiUrl('/api/v1/rls/policies'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(policyData),
      });

      if (response.ok) {
        const newPolicy = await response.json();
        setPolicies(prev => [...prev, newPolicy]);
        return newPolicy;
      } else {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to create policy');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create policy';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  const updatePolicy = useCallback(async (policyId: number, updates: Partial<RLSPolicy>) => {
    try {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem('access_token');
      
      const response = await fetch(`${getApiUrl('/api/v1/rls/policies')}/${policyId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(updates),
      });

      if (response.ok) {
        const updatedPolicy = await response.json();
        setPolicies(prev => 
          prev.map(policy => 
            policy.id === policyId ? updatedPolicy : policy
          )
        );
        return updatedPolicy;
      } else {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to update policy');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update policy';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  const deletePolicy = useCallback(async (policyId: number) => {
    try {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem('access_token');
      
      const response = await fetch(`${getApiUrl('/api/v1/rls/policies')}/${policyId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        setPolicies(prev => prev.filter(policy => policy.id !== policyId));
      } else {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to delete policy');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete policy';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    policies,
    loading,
    error,
    fetchPolicies,
    createPolicy,
    updatePolicy,
    deletePolicy
  };
};

/**
 * Hook for conditional access checks based on user permissions
 */
export const useConditionalAccess = (
  entityType: string,
  action: string,
  entityId?: number
) => {
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { checkAccess } = useRLSAccess();

  useEffect(() => {
    const performAccessCheck = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const result = await checkAccess({
          entity_type: entityType,
          action,
          entity_id: entityId
        });
        
        setHasAccess(result.access_granted);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Access check failed');
        setHasAccess(false);
      } finally {
        setLoading(false);
      }
    };

    performAccessCheck();
  }, [entityType, action, entityId, checkAccess]);

  return {
    hasAccess,
    loading,
    error
  };
};

/**
 * Hook for caching access check results
 */
export const useCachedAccess = () => {
  const [cache, setCache] = useState<Map<string, { result: AccessCheckResult; timestamp: number }>>(new Map());
  const { checkAccess } = useRLSAccess();
  
  const cacheTimeout = 5 * 60 * 1000; // 5 minutes

  const getCachedAccess = useCallback(async (request: AccessCheckRequest): Promise<AccessCheckResult> => {
    const cacheKey = `${request.entity_type}-${request.action}-${request.entity_id || 'null'}`;
    const cached = cache.get(cacheKey);
    
    // Check if cache is valid
    if (cached && (Date.now() - cached.timestamp) < cacheTimeout) {
      return cached.result;
    }

    // Perform fresh access check
    const result = await checkAccess(request);
    
    // Update cache
    setCache(prev => new Map(prev.set(cacheKey, {
      result,
      timestamp: Date.now()
    })));
    
    return result;
  }, [cache, checkAccess, cacheTimeout]);

  const clearCache = useCallback(() => {
    setCache(new Map());
  }, []);

  const clearCacheForEntity = useCallback((entityType: string, entityId?: number) => {
    setCache(prev => {
      const newCache = new Map(prev);
      const pattern = `${entityType}-`;
      
      for (const [key] of newCache) {
        if (key.startsWith(pattern)) {
          if (!entityId || key.includes(`-${entityId}`)) {
            newCache.delete(key);
          }
        }
      }
      
      return newCache;
    });
  }, []);

  return {
    getCachedAccess,
    clearCache,
    clearCacheForEntity,
    cacheSize: cache.size
  };
};

/**
 * Higher-order hook that combines multiple RLS functionalities
 */
export const useRLSManager = () => {
  const context = useRLSContext();
  const access = useRLSAccess();
  const policies = useRLSPolicies();
  const cachedAccess = useCachedAccess();

  return {
    context,
    access,
    policies,
    cachedAccess,
    
    // Combined utilities
    isReady: !context.loading && context.context !== null,
    hasError: !!(context.error || access.error || policies.error),
    errors: [context.error, access.error, policies.error].filter(Boolean),
    
    // Quick access checks
    canRead: (entityType: string, entityId?: number) => 
      access.checkAccess({ entity_type: entityType, action: 'SELECT', entity_id: entityId }),
    
    canWrite: (entityType: string, entityId?: number) => 
      access.checkAccess({ entity_type: entityType, action: 'UPDATE', entity_id: entityId }),
    
    canDelete: (entityType: string, entityId?: number) => 
      access.checkAccess({ entity_type: entityType, action: 'DELETE', entity_id: entityId }),
    
    canCreate: (entityType: string) => 
      access.checkAccess({ entity_type: entityType, action: 'INSERT' })
  };
};