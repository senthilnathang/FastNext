'use client'

import React from 'react'
import { FieldPath, FieldValues, UseFormReturn } from 'react-hook-form'
import { Label } from '@/shared/components/ui/label'
import { Input } from '@/shared/components/ui/input'
import { Textarea } from '@/shared/components/ui/textarea'
import { Checkbox } from '@/shared/components/ui/checkbox'
import { RadioGroup, RadioGroupItem } from '@/shared/components/ui/radio-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select'
import { Button } from '@/shared/components/ui/button'
import { Calendar } from '@/shared/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/components/ui/popover'
import { Switch } from '@/shared/components/ui/switch'
import { Badge } from '@/shared/components/ui/badge'
import { cn } from '@/shared/utils'
import { CalendarIcon, X } from 'lucide-react'
import { format } from 'date-fns'

// Base field props that all form fields share
export interface BaseFieldProps<T extends FieldValues> {
  form: UseFormReturn<T>
  name: FieldPath<T>
  label?: string
  description?: string
  placeholder?: string
  required?: boolean
  disabled?: boolean
  className?: string
}

// Text input field props
export interface TextFieldProps<T extends FieldValues> extends BaseFieldProps<T> {
  type?: 'text' | 'email' | 'password' | 'url' | 'tel'
  maxLength?: number
  minLength?: number
}

// Number input field props
export interface NumberFieldProps<T extends FieldValues> extends BaseFieldProps<T> {
  min?: number
  max?: number
  step?: number
}

// Select field props
export interface SelectFieldProps<T extends FieldValues> extends BaseFieldProps<T> {
  options: Array<{ label: string; value: string | number; disabled?: boolean }>
  multiple?: boolean
}

// Radio group field props
export interface RadioFieldProps<T extends FieldValues> extends BaseFieldProps<T> {
  options: Array<{ label: string; value: string; description?: string }>
  orientation?: 'horizontal' | 'vertical'
}

// Checkbox field props
export interface CheckboxFieldProps<T extends FieldValues> extends BaseFieldProps<T> {
  text?: string
}

// Switch field props
export interface SwitchFieldProps<T extends FieldValues> extends BaseFieldProps<T> {
  text?: string
}

// Textarea field props
export interface TextareaFieldProps<T extends FieldValues> extends BaseFieldProps<T> {
  rows?: number
  maxLength?: number
}

// Date picker field props
export interface DateFieldProps<T extends FieldValues> extends BaseFieldProps<T> {
  showTime?: boolean
  minDate?: Date
  maxDate?: Date
}

// Tags input field props
export interface TagsFieldProps<T extends FieldValues> extends BaseFieldProps<T> {
  maxTags?: number
  suggestions?: string[]
}

// Generic field error display component
function FieldError({ error }: { error?: string }) {
  if (!error) return null
  return <p className="text-sm font-medium text-destructive mt-1">{error}</p>
}

// Generic field wrapper with label and description
function FieldWrapper({
  label,
  description,
  required,
  error,
  children,
  className
}: {
  label?: string
  description?: string
  required?: boolean
  error?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <Label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </Label>
      )}
      {children}
      {description && !error && (
        <p className="text-sm text-muted-foreground">{description}</p>
      )}
      <FieldError error={error} />
    </div>
  )
}

// Text input field component
export function TextField<T extends FieldValues>({
  form,
  name,
  label,
  description,
  placeholder,
  required,
  disabled,
  className,
  type = 'text',
  maxLength,
  minLength
}: TextFieldProps<T>) {
  const error = form.formState.errors[name]?.message as string | undefined

  return (
    <FieldWrapper
      label={label}
      description={description}
      required={required}
      error={error}
      className={className}
    >
      <Input
        {...form.register(name)}
        type={type}
        placeholder={placeholder}
        disabled={disabled}
        maxLength={maxLength}
        minLength={minLength}
        className={cn(error && 'border-destructive')}
      />
    </FieldWrapper>
  )
}

// Number input field component
export function NumberField<T extends FieldValues>({
  form,
  name,
  label,
  description,
  placeholder,
  required,
  disabled,
  className,
  min,
  max,
  step
}: NumberFieldProps<T>) {
  const error = form.formState.errors[name]?.message as string | undefined

  return (
    <FieldWrapper
      label={label}
      description={description}
      required={required}
      error={error}
      className={className}
    >
      <Input
        {...form.register(name, { valueAsNumber: true })}
        type="number"
        placeholder={placeholder}
        disabled={disabled}
        min={min}
        max={max}
        step={step}
        className={cn(error && 'border-destructive')}
      />
    </FieldWrapper>
  )
}

// Select field component
export function SelectField<T extends FieldValues>({
  form,
  name,
  label,
  description,
  placeholder,
  required,
  disabled,
  className,
  options
}: SelectFieldProps<T>) {
  const error = form.formState.errors[name]?.message as string | undefined
  const value = form.watch(name)

  return (
    <FieldWrapper
      label={label}
      description={description}
      required={required}
      error={error}
      className={className}
    >
      <Select
        value={value?.toString() || ''}
        onValueChange={(value) => form.setValue(name, value as any)}
        disabled={disabled}
      >
        <SelectTrigger className={cn(error && 'border-destructive')}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem
              key={option.value}
              value={option.value.toString()}
              disabled={option.disabled}
            >
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </FieldWrapper>
  )
}

// Radio group field component
export function RadioField<T extends FieldValues>({
  form,
  name,
  label,
  description,
  required,
  disabled,
  className,
  options,
  orientation = 'vertical'
}: RadioFieldProps<T>) {
  const error = form.formState.errors[name]?.message as string | undefined
  const value = form.watch(name)

  return (
    <FieldWrapper
      label={label}
      description={description}
      required={required}
      error={error}
      className={className}
    >
      <RadioGroup
        value={value}
        onValueChange={(value) => form.setValue(name, value as any)}
        disabled={disabled}
        className={cn(
          orientation === 'horizontal' ? 'flex flex-row space-x-4' : 'space-y-2'
        )}
      >
        {options.map((option) => (
          <div key={option.value} className="flex items-center space-x-2">
            <RadioGroupItem value={option.value} id={`${name}-${option.value}`} />
            <Label htmlFor={`${name}-${option.value}`} className="text-sm font-normal">
              {option.label}
              {option.description && (
                <span className="block text-xs text-muted-foreground">
                  {option.description}
                </span>
              )}
            </Label>
          </div>
        ))}
      </RadioGroup>
    </FieldWrapper>
  )
}

// Checkbox field component
export function CheckboxField<T extends FieldValues>({
  form,
  name,
  label,
  description,
  required,
  disabled,
  className,
  text
}: CheckboxFieldProps<T>) {
  const error = form.formState.errors[name]?.message as string | undefined
  const value = form.watch(name)

  return (
    <FieldWrapper
      label={label}
      description={description}
      required={required}
      error={error}
      className={className}
    >
      <div className="flex items-center space-x-2">
        <Checkbox
          id={name}
          checked={value || false}
          onCheckedChange={(checked) => form.setValue(name, checked as any)}
          disabled={disabled}
        />
        {text && (
          <Label htmlFor={name} className="text-sm font-normal">
            {text}
          </Label>
        )}
      </div>
    </FieldWrapper>
  )
}

// Switch field component
export function SwitchField<T extends FieldValues>({
  form,
  name,
  label,
  description,
  required,
  disabled,
  className,
  text
}: SwitchFieldProps<T>) {
  const error = form.formState.errors[name]?.message as string | undefined
  const value = form.watch(name)

  return (
    <FieldWrapper
      label={label}
      description={description}
      required={required}
      error={error}
      className={className}
    >
      <div className="flex items-center space-x-2">
        <Switch
          id={name}
          checked={value || false}
          onCheckedChange={(checked) => form.setValue(name, checked as any)}
          disabled={disabled}
        />
        {text && (
          <Label htmlFor={name} className="text-sm font-normal">
            {text}
          </Label>
        )}
      </div>
    </FieldWrapper>
  )
}

// Textarea field component
export function TextareaField<T extends FieldValues>({
  form,
  name,
  label,
  description,
  placeholder,
  required,
  disabled,
  className,
  rows = 4,
  maxLength
}: TextareaFieldProps<T>) {
  const error = form.formState.errors[name]?.message as string | undefined

  return (
    <FieldWrapper
      label={label}
      description={description}
      required={required}
      error={error}
      className={className}
    >
      <Textarea
        {...form.register(name)}
        placeholder={placeholder}
        disabled={disabled}
        rows={rows}
        maxLength={maxLength}
        className={cn(error && 'border-destructive')}
      />
    </FieldWrapper>
  )
}

// Date picker field component
export function DateField<T extends FieldValues>({
  form,
  name,
  label,
  description,
  placeholder = 'Pick a date',
  required,
  disabled,
  className,
  minDate,
  maxDate
}: DateFieldProps<T>) {
  const error = form.formState.errors[name]?.message as string | undefined
  const value = form.watch(name)

  return (
    <FieldWrapper
      label={label}
      description={description}
      required={required}
      error={error}
      className={className}
    >
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              'w-full justify-start text-left font-normal',
              !value && 'text-muted-foreground',
              error && 'border-destructive'
            )}
            disabled={disabled}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {value ? format(new Date(value), 'PPP') : placeholder}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={value ? new Date(value) : undefined}
            onSelect={(date) => form.setValue(name, date as any)}
            disabled={(date) => {
              if (disabled) return true
              if (minDate && date < minDate) return true
              if (maxDate && date > maxDate) return true
              return false
            }}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </FieldWrapper>
  )
}

// Tags input field component
export function TagsField<T extends FieldValues>({
  form,
  name,
  label,
  description,
  placeholder = 'Type and press Enter',
  required,
  disabled,
  className,
  maxTags,
  suggestions = []
}: TagsFieldProps<T>) {
  const error = form.formState.errors[name]?.message as string | undefined
  const value = (form.watch(name) || []) as string[]
  const [inputValue, setInputValue] = React.useState('')

  const addTag = (tag: string) => {
    const trimmedTag = tag.trim()
    if (trimmedTag && !value.includes(trimmedTag)) {
      if (!maxTags || value.length < maxTags) {
        form.setValue(name, [...value, trimmedTag] as any)
      }
    }
    setInputValue('')
  }

  const removeTag = (tagToRemove: string) => {
    form.setValue(name, value.filter((tag: string) => tag !== tagToRemove) as any)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addTag(inputValue)
    } else if (e.key === 'Backspace' && inputValue === '' && value.length > 0) {
      removeTag(value[value.length - 1])
    }
  }

  return (
    <FieldWrapper
      label={label}
      description={description}
      required={required}
      error={error}
      className={className}
    >
      <div className={cn(
        'flex flex-wrap gap-2 p-2 border rounded-md min-h-[40px]',
        error && 'border-destructive',
        disabled && 'opacity-50 cursor-not-allowed'
      )}>
        {value.map((tag: string) => (
          <Badge key={tag} variant="secondary" className="px-2 py-1">
            {tag}
            {!disabled && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="ml-1 h-auto p-0 w-4"
                onClick={() => removeTag(tag)}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </Badge>
        ))}
        {(!maxTags || value.length < maxTags) && (
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={value.length === 0 ? placeholder : ''}
            disabled={disabled}
            className="flex-1 border-0 p-0 h-auto focus-visible:ring-0 focus-visible:ring-offset-0"
          />
        )}
      </div>
      {suggestions.length > 0 && inputValue && (
        <div className="mt-1 max-h-40 overflow-y-auto border rounded-md bg-background">
          {suggestions
            .filter(suggestion => 
              suggestion.toLowerCase().includes(inputValue.toLowerCase()) &&
              !value.includes(suggestion)
            )
            .slice(0, 5)
            .map(suggestion => (
              <Button
                key={suggestion}
                type="button"
                variant="ghost"
                className="w-full justify-start px-3 py-2 h-auto"
                onClick={() => addTag(suggestion)}
              >
                {suggestion}
              </Button>
            ))}
        </div>
      )}
    </FieldWrapper>
  )
}