"use client"

import React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ComponentInstance } from '@/types'
import { useUpdateComponentInstance } from '@/hooks/useComponents'
import { Button } from '@/components/ui/button'

interface PropertyPanelProps {
  instance: ComponentInstance | null
}

export default function PropertyPanel({ instance }: PropertyPanelProps) {
  const updateInstanceMutation = useUpdateComponentInstance()

  if (!instance || !instance.component) {
    return (
      <div className="w-80 bg-white border-l border-gray-200 p-4">
        <div className="text-gray-500 text-center">
          Select a component to edit its properties
        </div>
      </div>
    )
  }

  const { component } = instance
  const schema = component.schema || {}
  const properties = schema.properties || {}

  // Create dynamic form schema based on component schema
  const createFormSchema = () => {
    const schemaFields: Record<string, any> = {}
    
    Object.entries(properties).forEach(([key, prop]: [string, any]) => {
      switch (prop.type) {
        case 'string':
          schemaFields[key] = z.string().optional()
          break
        case 'number':
          schemaFields[key] = z.number().optional()
          break
        case 'boolean':
          schemaFields[key] = z.boolean().optional()
          break
        default:
          schemaFields[key] = z.any().optional()
      }
    })
    
    return z.object(schemaFields)
  }

  const formSchema = createFormSchema()
  type FormData = z.infer<typeof formSchema>

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: instance.props || {},
  })

  const onSubmit = async (data: FormData) => {
    try {
      await updateInstanceMutation.mutateAsync({
        id: instance.id,
        data: { props: data }
      })
    } catch (error) {
      console.error('Failed to update component:', error)
    }
  }

  const renderFormField = (key: string, prop: any) => {
    const currentValue = form.watch(key)

    switch (prop.type) {
      case 'string':
        if (prop.enum) {
          return (
            <select
              {...form.register(key)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {prop.enum.map((option: string) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          )
        }
        
        if (key.toLowerCase().includes('color')) {
          return (
            <input
              type="color"
              {...form.register(key)}
              className="w-full h-10 border border-gray-300 rounded-md"
            />
          )
        }
        
        return (
          <input
            type="text"
            {...form.register(key)}
            placeholder={prop.placeholder || ''}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        )

      case 'number':
        return (
          <input
            type="number"
            {...form.register(key, { valueAsNumber: true })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        )

      case 'boolean':
        return (
          <input
            type="checkbox"
            {...form.register(key)}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
        )

      default:
        return (
          <textarea
            {...form.register(key)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        )
    }
  }

  return (
    <div className="w-80 bg-white border-l border-gray-200 overflow-y-auto">
      <div className="p-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold">Properties</h3>
        <div className="text-sm text-gray-500 mt-1">
          {component.name}
        </div>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="p-4 space-y-4">
        {Object.entries(properties).map(([key, prop]: [string, any]) => (
          <div key={key}>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {prop.title || key}
            </label>
            {renderFormField(key, prop)}
            {prop.description && (
              <div className="text-xs text-gray-500 mt-1">
                {prop.description}
              </div>
            )}
          </div>
        ))}

        <div className="pt-4 border-t border-gray-200">
          <Button
            type="submit"
            className="w-full"
            disabled={updateInstanceMutation.isPending}
          >
            {updateInstanceMutation.isPending ? 'Updating...' : 'Update Properties'}
          </Button>
        </div>
      </form>

      {/* Position and Layout */}
      <div className="p-4 border-t border-gray-200">
        <h4 className="text-sm font-semibold mb-3">Layout</h4>
        <div className="space-y-2 text-xs text-gray-600">
          <div>Order: {instance.order_index}</div>
          {instance.position && Object.keys(instance.position).length > 0 && (
            <div>
              Position: {JSON.stringify(instance.position)}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}