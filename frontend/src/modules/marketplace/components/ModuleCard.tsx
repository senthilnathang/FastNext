"use client";

import { Download, ShoppingCart, Star } from "lucide-react";
import Image from "next/image";
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
import type { ModuleListItem } from "@/lib/api/marketplace";
import { cn } from "@/shared/utils";

interface ModuleCardProps {
  module: ModuleListItem;
  onAddToCart?: (module: ModuleListItem) => void;
  showAddToCart?: boolean;
  className?: string;
}

export function ModuleCard({
  module,
  onAddToCart,
  showAddToCart = true,
  className,
}: ModuleCardProps) {
  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    }).format(price);
  };

  const formatDownloads = (count: number) => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    }
    if (count >= 1000) {
      return `${(count / 1000).toFixed(0)}K`;
    }
    return count.toString();
  };

  return (
    <Card
      className={cn(
        "group hover:shadow-lg transition-all duration-200 overflow-hidden",
        className
      )}
    >
      <CardHeader className="p-4 pb-3">
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
            {module.icon_url ? (
              <Image
                src={module.icon_url}
                alt={module.name}
                width={48}
                height={48}
                className="rounded-lg"
              />
            ) : (
              <span className="text-white font-bold text-lg">
                {module.name.charAt(0)}
              </span>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <CardTitle className="text-base font-semibold line-clamp-1">
                <Link
                  href={`/marketplace/${module.slug}`}
                  className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                >
                  {module.name}
                </Link>
              </CardTitle>
              {module.is_new && (
                <Badge variant="secondary" className="text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                  New
                </Badge>
              )}
            </div>
            <CardDescription className="text-xs line-clamp-1">
              by {module.publisher_name}
              {module.publisher_verified && (
                <span className="ml-1 text-blue-600">✓</span>
              )}
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 pt-0">
        <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2 mb-3">
          {module.summary}
        </p>

        <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
          <div className="flex items-center gap-1">
            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
            <span>{module.rating.toFixed(1)}</span>
            <span>({module.ratings_count})</span>
          </div>
          <div className="flex items-center gap-1">
            <Download className="h-3 w-3" />
            <span>{formatDownloads(module.download_count)}</span>
          </div>
        </div>
      </CardContent>

      <CardFooter className="p-4 pt-0 flex items-center justify-between">
        <div className="font-semibold text-gray-900 dark:text-white">
          {module.is_free ? (
            <span className="text-green-600 dark:text-green-400">Free</span>
          ) : (
            formatPrice(module.price, module.currency)
          )}
        </div>

        {showAddToCart && (
          <Button
            size="sm"
            variant={module.is_free ? "default" : "outline"}
            onClick={() => onAddToCart?.(module)}
            className="opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <ShoppingCart className="h-4 w-4 mr-1" />
            {module.is_free ? "Install" : "Add to Cart"}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}

export default ModuleCard;
