"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/shared/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/shared/components/ui/form";
import { Input } from "@/shared/components/ui/input";
import { Switch } from "@/shared/components/ui/switch";
import { Textarea } from "@/shared/components/ui/textarea";
import type { DemoItem, DemoItemCreate, DemoItemUpdate } from "@/lib/api/demo";

// Form validation schema
const demoItemSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name must be less than 100 characters"),
  description: z
    .string()
    .max(500, "Description must be less than 500 characters")
    .optional()
    .or(z.literal("")),
  is_active: z.boolean(),
});

type DemoItemFormValues = z.infer<typeof demoItemSchema>;

interface DemoItemFormProps {
  item?: DemoItem;
  onSubmit: (data: DemoItemCreate | DemoItemUpdate) => void;
  onCancel?: () => void;
  isLoading?: boolean;
}

export function DemoItemForm({
  item,
  onSubmit,
  onCancel,
  isLoading = false,
}: DemoItemFormProps) {
  const isEditing = !!item;

  const form = useForm<DemoItemFormValues>({
    resolver: zodResolver(demoItemSchema),
    defaultValues: {
      name: item?.name || "",
      description: item?.description || "",
      is_active: item?.is_active ?? true,
    },
  });

  // Reset form when item changes
  useEffect(() => {
    if (item) {
      form.reset({
        name: item.name,
        description: item.description || "",
        is_active: item.is_active,
      });
    } else {
      form.reset({
        name: "",
        description: "",
        is_active: true,
      });
    }
  }, [item, form]);

  const handleSubmit = (values: DemoItemFormValues) => {
    const data = {
      name: values.name,
      description: values.description || null,
      is_active: values.is_active,
    };
    onSubmit(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input
                  placeholder="Enter item name"
                  {...field}
                  disabled={isLoading}
                />
              </FormControl>
              <FormDescription>
                A unique name for this demo item.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Enter a description (optional)"
                  rows={4}
                  {...field}
                  disabled={isLoading}
                />
              </FormControl>
              <FormDescription>
                Optional description of this demo item.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="is_active"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 bg-gray-50 dark:bg-gray-800/50">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Active</FormLabel>
                <FormDescription>
                  Enable or disable this demo item.
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  disabled={isLoading}
                />
              </FormControl>
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-3">
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isLoading}
            >
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditing ? "Update" : "Create"} Item
          </Button>
        </div>
      </form>
    </Form>
  );
}

export default DemoItemForm;
