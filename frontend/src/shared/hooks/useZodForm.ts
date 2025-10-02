import { useForm, UseFormProps, UseFormReturn, FieldValues, FieldPath } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useState, useCallback } from 'react'
import { toast } from 'sonner'

// Extended form options that include Zod schema
export interface ZodFormOptions<T extends FieldValues> extends Omit<UseFormProps<T>, 'resolver'> {
  schema: z.ZodType<T, any, any>
  onSubmit?: (data: T) => Promise<void> | void
  onSuccess?: (data: T) => void
  onError?: (error: Error) => void
  showSuccessToast?: boolean
  showErrorToast?: boolean
  successMessage?: string
  resetOnSuccess?: boolean
}

// Extended form return type
export interface ZodFormReturn<T extends FieldValues> extends Omit<UseFormReturn<T>, 'handleSubmit'> {
  handleSubmit: () => Promise<void>
  isSubmitting: boolean
  submitError: string | null
  clearSubmitError: () => void
}

/**
 * Custom hook that combines react-hook-form with Zod validation
 * Provides type-safe form handling with automatic validation and error management
 */
export function useZodForm<T extends FieldValues>({
  schema,
  onSubmit,
  onSuccess,
  onError,
  showSuccessToast = true,
  showErrorToast = true,
  successMessage = 'Operation completed successfully',
  resetOnSuccess = false,
  ...formOptions
}: ZodFormOptions<T>): ZodFormReturn<T> {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const form = useForm<T>({
    ...formOptions,
    resolver: zodResolver(schema)
  })

  const clearSubmitError = useCallback(() => {
    setSubmitError(null)
  }, [])

  const handleSubmit = useCallback(async () => {
    if (!onSubmit) return

    try {
      setIsSubmitting(true)
      setSubmitError(null)

      const values = form.getValues()
      
      // Validate with Zod schema before submission
      const validatedData = schema.parse(values)
      
      await onSubmit(validatedData)
      
      if (onSuccess) {
        onSuccess(validatedData)
      }

      if (showSuccessToast) {
        toast.success(successMessage)
      }

      if (resetOnSuccess) {
        form.reset()
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred'
      setSubmitError(errorMessage)

      if (onError) {
        onError(error instanceof Error ? error : new Error(errorMessage))
      }

      if (showErrorToast) {
        toast.error(errorMessage)
      }

      // If it's a Zod validation error, set field-specific errors
      if (error instanceof z.ZodError) {
        error.issues.forEach(({ path, message }) => {
          if (path.length > 0) {
            form.setError(path.join('.') as FieldPath<T>, {
              type: 'manual',
              message
            })
          }
        })
      }
    } finally {
      setIsSubmitting(false)
    }
  }, [
    onSubmit, 
    schema, 
    form, 
    onSuccess, 
    onError, 
    showSuccessToast, 
    showErrorToast, 
    successMessage, 
    resetOnSuccess
  ])

  return {
    ...form,
    handleSubmit,
    isSubmitting,
    submitError,
    clearSubmitError
  }
}

/**
 * Validation helper to check if a field value is valid according to a Zod schema
 */
export function validateField<T>(schema: z.ZodType<T, any, any>, value: unknown): {
  isValid: boolean
  error?: string
} {
  try {
    schema.parse(value)
    return { isValid: true }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        isValid: false,
        error: error.issues[0]?.message || 'Validation failed'
      }
    }
    return {
      isValid: false,
      error: 'Unknown validation error'
    }
  }
}

/**
 * Async validation helper for form fields
 */
export function createAsyncValidator<T>(
  schema: z.ZodType<T, any, any>
) {
  return async (value: unknown): Promise<boolean | string> => {
    const result = validateField(schema, value)
    return result.isValid || result.error || false
  }
}

/**
 * Helper to extract default values from a Zod schema
 */
export function getDefaultValues<T extends Record<string, any>>(
  schema: z.ZodType<T, any, any>
): Partial<T> {
  try {
    // Try to parse an empty object to get defaults
    return schema.parse({})
  } catch {
    // If that fails, return empty object
    return {}
  }
}

/**
 * Type-safe field access helper
 */
export function getFieldError<T extends FieldValues>(
  form: UseFormReturn<T>,
  fieldName: FieldPath<T>
): string | undefined {
  const error = form.formState.errors[fieldName]
  return error?.message as string | undefined
}

/**
 * Helper to create a form submit handler that automatically prevents default
 */
export function createSubmitHandler(
  handleSubmit: () => Promise<void>
) {
  return (event?: React.FormEvent) => {
    if (event) {
      event.preventDefault()
      event.stopPropagation()
    }
    return handleSubmit()
  }
}

/**
 * Hook for handling form field changes with debouncing
 */
export function useDebouncedField<T>(
  initialValue: T,
  onChange: (value: T) => void,
  delay: number = 300
) {
  const [value, setValue] = useState<T>(initialValue)

  // Debounce the onChange callback
  const debouncedOnChange = useCallback((newValue: T) => {
    const timeoutId = setTimeout(() => onChange(newValue), delay)
    return () => clearTimeout(timeoutId)
  }, [onChange, delay])

  const handleChange = useCallback((newValue: T) => {
    setValue(newValue)
    const cleanup = debouncedOnChange(newValue)
    return cleanup
  }, [debouncedOnChange])

  return [value, handleChange] as const
}