"use client";

import {
  AlertTriangle,
  DollarSign,
  GripVertical,
  Loader2,
  MoreVertical,
  Plus,
  RefreshCw,
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/components/ui/alert-dialog";
import { Input } from "@/shared/components/ui/input";
import { useToast } from "@/shared/hooks/useToast";
import {
  usePipelines,
  useOpportunitiesByPipeline,
  useMoveOpportunityStage,
  useMarkOpportunityWon,
  useMarkOpportunityLost,
  useDeleteOpportunity,
} from "../hooks";
import type { Opportunity, Pipeline, Stage } from "@/lib/api/crm";
import { cn } from "@/shared/utils";

interface OpportunityKanbanProps {
  className?: string;
  onCreateOpportunity?: (stageId: number) => void;
  onEditOpportunity?: (opportunity: Opportunity) => void;
}

interface KanbanColumnProps {
  stage: Stage;
  opportunities: Opportunity[];
  onDragStart: (e: React.DragEvent, opportunityId: number) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, stageId: number) => void;
  onEdit?: (opportunity: Opportunity) => void;
  onDelete?: (opportunity: Opportunity) => void;
  onMarkWon?: (opportunity: Opportunity) => void;
  onMarkLost?: (opportunity: Opportunity) => void;
  onAddOpportunity?: (stageId: number) => void;
  pipelineId: number;
}

function KanbanColumn({
  stage,
  opportunities,
  onDragStart,
  onDragOver,
  onDrop,
  onEdit,
  onDelete,
  onMarkWon,
  onMarkLost,
  onAddOpportunity,
}: KanbanColumnProps) {
  const [isDragOver, setIsDragOver] = useState(false);

  const totalValue = opportunities.reduce((sum, opp) => sum + (opp.amount || 0), 0);

  const formatCurrency = (amount: number) => {
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(1)}M`;
    }
    if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(0)}K`;
    }
    return `$${amount}`;
  };

  const getStageColor = () => {
    if (stage.color) return stage.color;
    switch (stage.type) {
      case "won":
        return "#22c55e";
      case "lost":
        return "#ef4444";
      default:
        return "#3b82f6";
    }
  };

  return (
    <div
      className={cn(
        "flex flex-col w-80 min-w-[320px] bg-gray-50 dark:bg-gray-800/50 rounded-lg",
        isDragOver && "ring-2 ring-blue-500 ring-offset-2"
      )}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragOver(true);
        onDragOver(e);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={(e) => {
        setIsDragOver(false);
        onDrop(e, stage.id);
      }}
    >
      {/* Column Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: getStageColor() }}
            />
            <h3 className="font-semibold text-gray-900 dark:text-white">
              {stage.name}
            </h3>
            <Badge variant="secondary" className="ml-1">
              {opportunities.length}
            </Badge>
          </div>
          {onAddOpportunity && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => onAddOpportunity(stage.id)}
            >
              <Plus className="h-4 w-4" />
            </Button>
          )}
        </div>
        <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
          <DollarSign className="h-3 w-3" />
          <span>{formatCurrency(totalValue)}</span>
          <span className="mx-1">·</span>
          <span>{stage.probability}%</span>
        </div>
      </div>

      {/* Cards */}
      <div className="flex-1 p-2 space-y-2 overflow-y-auto max-h-[calc(100vh-300px)]">
        {opportunities.map((opportunity) => (
          <Card
            key={opportunity.id}
            className="cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow"
            draggable
            onDragStart={(e) => onDragStart(e, opportunity.id)}
          >
            <CardHeader className="p-3 pb-2">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <GripVertical className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  <CardTitle className="text-sm font-medium line-clamp-1">
                    {opportunity.name}
                  </CardTitle>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-6 w-6 -mr-1">
                      <MoreVertical className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onEdit?.(opportunity)}>
                      Edit
                    </DropdownMenuItem>
                    {stage.type === "open" && (
                      <>
                        <DropdownMenuItem onClick={() => onMarkWon?.(opportunity)}>
                          Mark as Won
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onMarkLost?.(opportunity)}>
                          Mark as Lost
                        </DropdownMenuItem>
                      </>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => onDelete?.(opportunity)}
                      className="text-red-600 dark:text-red-400"
                    >
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>
            <CardContent className="p-3 pt-0">
              <div className="space-y-2">
                {opportunity.account_name && (
                  <CardDescription className="text-xs line-clamp-1">
                    {opportunity.account_name}
                  </CardDescription>
                )}
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-gray-900 dark:text-white">
                    {opportunity.amount
                      ? formatCurrency(opportunity.amount)
                      : "No value"}
                  </span>
                  {opportunity.expected_close_date && (
                    <span className="text-gray-500 dark:text-gray-400">
                      {new Date(opportunity.expected_close_date).toLocaleDateString(
                        "en-US",
                        { month: "short", day: "numeric" }
                      )}
                    </span>
                  )}
                </div>
                {opportunity.probability > 0 && (
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1">
                    <div
                      className="bg-blue-600 h-1 rounded-full"
                      style={{ width: `${opportunity.probability}%` }}
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}

        {opportunities.length === 0 && (
          <div className="text-center py-8 text-gray-400 text-sm">
            No opportunities
          </div>
        )}
      </div>
    </div>
  );
}

export function OpportunityKanban({
  className,
  onCreateOpportunity,
  onEditOpportunity,
}: OpportunityKanbanProps) {
  const { toast } = useToast();

  // State
  const [selectedPipelineId, setSelectedPipelineId] = useState<number | null>(null);
  const [draggedOpportunityId, setDraggedOpportunityId] = useState<number | null>(null);
  const [deletingOpportunity, setDeletingOpportunity] = useState<Opportunity | null>(null);
  const [lostReason, setLostReason] = useState("");
  const [markingLostOpportunity, setMarkingLostOpportunity] = useState<Opportunity | null>(null);

  // Data fetching
  const { data: pipelines, isLoading: pipelinesLoading } = usePipelines({ is_active: true });

  // Auto-select first pipeline
  const activePipelineId = selectedPipelineId || pipelines?.[0]?.id;

  const {
    data: opportunities,
    isLoading: opportunitiesLoading,
    error,
    refetch,
  } = useOpportunitiesByPipeline(activePipelineId!, {
    enabled: !!activePipelineId,
  });

  // Mutations
  const moveStageMutation = useMoveOpportunityStage();
  const markWonMutation = useMarkOpportunityWon();
  const markLostMutation = useMarkOpportunityLost();
  const deleteMutation = useDeleteOpportunity();

  // Get current pipeline
  const currentPipeline = useMemo(
    () => pipelines?.find((p) => p.id === activePipelineId),
    [pipelines, activePipelineId]
  );

  // Group opportunities by stage
  const opportunitiesByStage = useMemo(() => {
    if (!opportunities) return {};
    return opportunities.reduce(
      (acc, opp) => {
        const stageId = opp.stage_id;
        if (!acc[stageId]) acc[stageId] = [];
        acc[stageId].push(opp);
        return acc;
      },
      {} as Record<number, Opportunity[]>
    );
  }, [opportunities]);

  // Handlers
  const handleDragStart = useCallback((e: React.DragEvent, opportunityId: number) => {
    setDraggedOpportunityId(opportunityId);
    e.dataTransfer.effectAllowed = "move";
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent, stageId: number) => {
      e.preventDefault();
      if (!draggedOpportunityId || !activePipelineId) return;

      try {
        await moveStageMutation.mutateAsync({
          id: draggedOpportunityId,
          data: { stage_id: stageId },
          pipelineId: activePipelineId,
        });
      } catch (err) {
        toast({ title: "Failed to move opportunity", variant: "destructive" });
      }

      setDraggedOpportunityId(null);
    },
    [draggedOpportunityId, activePipelineId, moveStageMutation, toast]
  );

  const handleMarkWon = useCallback(
    async (opportunity: Opportunity) => {
      if (!activePipelineId) return;
      try {
        await markWonMutation.mutateAsync({
          id: opportunity.id,
          pipelineId: activePipelineId,
        });
        toast({ title: "Opportunity marked as won!" });
      } catch (err) {
        toast({ title: "Failed to update opportunity", variant: "destructive" });
      }
    },
    [activePipelineId, markWonMutation, toast]
  );

  const handleMarkLost = useCallback((opportunity: Opportunity) => {
    setMarkingLostOpportunity(opportunity);
    setLostReason("");
  }, []);

  const confirmMarkLost = useCallback(async () => {
    if (!markingLostOpportunity || !activePipelineId) return;
    try {
      await markLostMutation.mutateAsync({
        id: markingLostOpportunity.id,
        pipelineId: activePipelineId,
        reason: lostReason || undefined,
      });
      toast({ title: "Opportunity marked as lost" });
    } catch (err) {
      toast({ title: "Failed to update opportunity", variant: "destructive" });
    } finally {
      setMarkingLostOpportunity(null);
      setLostReason("");
    }
  }, [markingLostOpportunity, activePipelineId, lostReason, markLostMutation, toast]);

  const handleDelete = useCallback((opportunity: Opportunity) => {
    setDeletingOpportunity(opportunity);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!deletingOpportunity || !activePipelineId) return;
    try {
      await deleteMutation.mutateAsync({
        id: deletingOpportunity.id,
        pipelineId: activePipelineId,
      });
      toast({ title: "Opportunity deleted" });
    } catch (err) {
      toast({ title: "Failed to delete opportunity", variant: "destructive" });
    } finally {
      setDeletingOpportunity(null);
    }
  }, [deletingOpportunity, activePipelineId, deleteMutation, toast]);

  // Loading state
  if (pipelinesLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  // No pipelines
  if (!pipelines || pipelines.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <AlertTriangle className="h-12 w-12 text-yellow-500 mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          No pipelines configured
        </h3>
        <p className="text-gray-500 dark:text-gray-400 mb-4">
          Create a pipeline to start tracking opportunities.
        </p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <AlertTriangle className="h-12 w-12 text-red-500 mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Failed to load opportunities
        </h3>
        <Button onClick={() => refetch()} variant="outline" className="mt-4">
          <RefreshCw className="mr-2 h-4 w-4" />
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Pipeline Selector */}
      <div className="flex items-center gap-4">
        <Select
          value={String(activePipelineId)}
          onValueChange={(value) => setSelectedPipelineId(Number(value))}
        >
          <SelectTrigger className="w-64">
            <SelectValue placeholder="Select pipeline" />
          </SelectTrigger>
          <SelectContent>
            {pipelines.map((pipeline) => (
              <SelectItem key={pipeline.id} value={String(pipeline.id)}>
                {pipeline.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {opportunitiesLoading && <Loader2 className="h-4 w-4 animate-spin" />}
      </div>

      {/* Kanban Board */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {currentPipeline?.stages
          .sort((a, b) => a.order - b.order)
          .map((stage) => (
            <KanbanColumn
              key={stage.id}
              stage={stage}
              opportunities={opportunitiesByStage[stage.id] || []}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onEdit={onEditOpportunity}
              onDelete={handleDelete}
              onMarkWon={handleMarkWon}
              onMarkLost={handleMarkLost}
              onAddOpportunity={onCreateOpportunity}
              pipelineId={activePipelineId!}
            />
          ))}
      </div>

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deletingOpportunity}
        onOpenChange={() => setDeletingOpportunity(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Opportunity</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deletingOpportunity?.name}&quot;?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Mark Lost Dialog */}
      <AlertDialog
        open={!!markingLostOpportunity}
        onOpenChange={() => setMarkingLostOpportunity(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark as Lost</AlertDialogTitle>
            <AlertDialogDescription>
              Why was &quot;{markingLostOpportunity?.name}&quot; lost? (optional)
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            placeholder="Lost reason..."
            value={lostReason}
            onChange={(e) => setLostReason(e.target.value)}
            className="mt-2"
          />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmMarkLost}>
              {markLostMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Mark as Lost
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default OpportunityKanban;
