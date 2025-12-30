/**
 * Cart Hook
 * React Query hooks for shopping cart operations
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { marketplaceApi } from "@/lib/api/marketplace";
import type {
  Cart,
  AddToCartData,
  CheckoutData,
  CheckoutResult,
} from "@/lib/api/marketplace";

// Query keys
export const cartKeys = {
  all: ["marketplace", "cart"] as const,
  current: () => [...cartKeys.all, "current"] as const,
};

/**
 * Hook to fetch current cart
 */
export function useCart() {
  return useQuery<Cart>({
    queryKey: cartKeys.current(),
    queryFn: () => marketplaceApi.cart.get(),
    staleTime: 0, // Always refetch cart
  });
}

/**
 * Hook to add item to cart
 */
export function useAddToCart() {
  const queryClient = useQueryClient();

  return useMutation<Cart, Error, AddToCartData>({
    mutationFn: (data) => marketplaceApi.cart.add(data),
    onSuccess: (data) => {
      queryClient.setQueryData(cartKeys.current(), data);
    },
  });
}

/**
 * Hook to remove item from cart
 */
export function useRemoveFromCart() {
  const queryClient = useQueryClient();

  return useMutation<Cart, Error, number>({
    mutationFn: (itemId) => marketplaceApi.cart.remove(itemId),
    onSuccess: (data) => {
      queryClient.setQueryData(cartKeys.current(), data);
    },
  });
}

/**
 * Hook to clear cart
 */
export function useClearCart() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, void>({
    mutationFn: () => marketplaceApi.cart.clear(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cartKeys.current() });
    },
  });
}

/**
 * Hook to apply coupon
 */
export function useApplyCoupon() {
  const queryClient = useQueryClient();

  return useMutation<Cart, Error, string>({
    mutationFn: (code) => marketplaceApi.cart.applyCoupon(code),
    onSuccess: (data) => {
      queryClient.setQueryData(cartKeys.current(), data);
    },
  });
}

/**
 * Hook to remove coupon
 */
export function useRemoveCoupon() {
  const queryClient = useQueryClient();

  return useMutation<Cart, Error, void>({
    mutationFn: () => marketplaceApi.cart.removeCoupon(),
    onSuccess: (data) => {
      queryClient.setQueryData(cartKeys.current(), data);
    },
  });
}

/**
 * Hook to checkout
 */
export function useCheckout() {
  const queryClient = useQueryClient();

  return useMutation<CheckoutResult, Error, CheckoutData>({
    mutationFn: (data) => marketplaceApi.cart.checkout(data),
    onSuccess: () => {
      // Clear cart after successful checkout
      queryClient.invalidateQueries({ queryKey: cartKeys.current() });
      // Invalidate orders and licenses
      queryClient.invalidateQueries({ queryKey: ["marketplace", "orders"] });
      queryClient.invalidateQueries({ queryKey: ["marketplace", "licenses"] });
    },
  });
}
