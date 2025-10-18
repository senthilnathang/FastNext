import {
  type UseMutationOptions,
  type UseQueryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  type CrudNotificationOptions,
  useCrudNotifications,
} from "./useCrudNotifications";

/**
 * Generic CRUD operations hook with built-in notifications
 *
 * Usage example:
 * ```typescript
 * const crudConfig = {
 *   resourceName: 'Product',
 *   queryKey: ['products'],
 *   api: {
 *     getList: productsApi.getProducts,
 *     getOne: productsApi.getProduct,
 *     create: productsApi.createProduct,
 *     update: productsApi.updateProduct,
 *     delete: productsApi.deleteProduct,
 *   },
 * }
 *
 * const { useList, useCreate, useUpdate, useDelete } = useCrudOperations(crudConfig)
 * ```
 */

export interface CrudOperationsConfig<
  TData,
  TCreate,
  TUpdate,
  TId = string | number,
> {
  resourceName: string;
  queryKey: string[];
  api: {
    getList?: (params?: any) => Promise<{ items: TData[]; total: number }>;
    getOne?: (id: TId) => Promise<TData>;
    create?: (data: TCreate) => Promise<TData>;
    update?: (id: TId, data: TUpdate) => Promise<TData>;
    delete?: (id: TId) => Promise<void>;
  };
  notifications?: CrudNotificationOptions;
}

export function useCrudOperations<
  TData,
  TCreate = any,
  TUpdate = any,
  TId = string | number,
>(config: CrudOperationsConfig<TData, TCreate, TUpdate, TId>) {
  const { resourceName, queryKey, api, notifications } = config;
  const queryClient = useQueryClient();

  const notificationOptions: CrudNotificationOptions = {
    resourceName,
    ...notifications,
  };

  const {
    notifyCreateSuccess,
    notifyUpdateSuccess,
    notifyDeleteSuccess,
    notifyError,
  } = useCrudNotifications(notificationOptions);

  // List query
  const useList = (
    params?: any,
    options?: UseQueryOptions<{ items: TData[]; total: number }>,
  ) => {
    return useQuery({
      queryKey: [...queryKey, params],
      queryFn: () =>
        api.getList
          ? api.getList(params)
          : Promise.resolve({ items: [], total: 0 }),
      ...options,
    });
  };

  // Single item query
  const useGet = (id: TId, options?: UseQueryOptions<TData>) => {
    return useQuery({
      queryKey: [...queryKey, id],
      queryFn: () => {
        if (!api.getOne) throw new Error("getOne API not provided");
        return api.getOne(id);
      },
      enabled: !!id,
      ...options,
    });
  };

  // Create mutation
  const useCreate = (
    options?: Omit<
      UseMutationOptions<TData, Error, TCreate>,
      "onSuccess" | "onError"
    >,
  ) => {
    return useMutation({
      mutationFn: (data: TCreate) => {
        if (!api.create) throw new Error("create API not provided");
        return api.create(data);
      },
      onSuccess: (data, _variables, _context) => {
        notifyCreateSuccess(data);
        queryClient.invalidateQueries({ queryKey });
      },
      onError: (error, _variables, _context) => {
        notifyError(error, "create");
      },
      ...options,
    });
  };

  // Update mutation
  const useUpdate = (
    options?: Omit<
      UseMutationOptions<TData, Error, { id: TId; data: TUpdate }>,
      "onSuccess" | "onError"
    >,
  ) => {
    return useMutation({
      mutationFn: ({ id, data }: { id: TId; data: TUpdate }) => {
        if (!api.update) throw new Error("update API not provided");
        return api.update(id, data);
      },
      onSuccess: (data, _variables, _context) => {
        notifyUpdateSuccess(data);
        queryClient.invalidateQueries({ queryKey });
        queryClient.invalidateQueries({
          queryKey: [...queryKey, _variables.id],
        });
      },
      onError: (error, _variables, _context) => {
        notifyError(error, "update");
      },
      ...options,
    });
  };

  // Delete mutation
  const useDelete = (
    options?: Omit<
      UseMutationOptions<void, Error, TId>,
      "onSuccess" | "onError"
    >,
  ) => {
    return useMutation({
      mutationFn: (id: TId) => {
        if (!api.delete) throw new Error("delete API not provided");
        return api.delete(id);
      },
      onSuccess: (_data, _variables, _context) => {
        notifyDeleteSuccess(_data);
        queryClient.invalidateQueries({ queryKey });
      },
      onError: (error, _variables, _context) => {
        notifyError(error, "delete");
      },
      ...options,
    });
  };

  return {
    useList,
    useGet,
    useCreate,
    useUpdate,
    useDelete,
  };
}
