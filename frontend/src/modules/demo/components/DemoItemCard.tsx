"use client";

import { Edit, MoreVertical, Power, Trash2 } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import type { DemoItem } from "@/lib/api/demo";
import { cn } from "@/shared/utils";

interface DemoItemCardProps {
  item: DemoItem;
  onEdit?: (item: DemoItem) => void;
  onDelete?: (item: DemoItem) => void;
  onToggleActive?: (item: DemoItem) => void;
}

export function DemoItemCard({
  item,
  onEdit,
  onDelete,
  onToggleActive,
}: DemoItemCardProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <Card
      className={cn(
        "transition-all duration-200 hover:shadow-lg",
        !item.is_active && "opacity-60"
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg">
              <Link
                href={`/demo/${item.id}`}
                className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              >
                {item.name}
              </Link>
            </CardTitle>
            <CardDescription className="text-xs text-gray-500 dark:text-gray-400">
              Created {formatDate(item.created_at)}
            </CardDescription>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
                <span className="sr-only">Actions</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit?.(item)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onToggleActive?.(item)}>
                <Power className="mr-2 h-4 w-4" />
                {item.is_active ? "Deactivate" : "Activate"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onDelete?.(item)}
                className="text-red-600 dark:text-red-400"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
          {item.description || "No description provided"}
        </p>
      </CardContent>
      <CardFooter className="pt-3 flex items-center justify-between">
        <Badge variant={item.is_active ? "default" : "secondary"}>
          {item.is_active ? "Active" : "Inactive"}
        </Badge>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          ID: {item.id}
        </span>
      </CardFooter>
    </Card>
  );
}

export default DemoItemCard;
