'use client';

import React, { useState, ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './card';
import { Button } from './button';
import { Badge } from './badge';
import { Separator } from './separator';
import { CheckCircle, Circle, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/shared/utils';

export interface WizardStep {
  id: string;
  title: string;
  description?: string;
  icon?: ReactNode;
  isValid?: boolean;
  isOptional?: boolean;
}

interface MultiStepWizardProps {
  steps: WizardStep[];
  currentStep: number;
  onStepChange: (step: number) => void;
  onComplete: () => void;
  onCancel?: () => void;
  children: ReactNode;
  isLoading?: boolean;
  canGoNext?: boolean;
  canGoPrevious?: boolean;
  nextButtonText?: string;
  previousButtonText?: string;
  completeButtonText?: string;
  cancelButtonText?: string;
  className?: string;
}

export function MultiStepWizard({
  steps,
  currentStep,
  onStepChange,
  onComplete,
  onCancel,
  children,
  isLoading = false,
  canGoNext = true,
  canGoPrevious = true,
  nextButtonText = "Next",
  previousButtonText = "Previous",
  completeButtonText = "Complete",
  cancelButtonText = "Cancel",
  className
}: MultiStepWizardProps) {
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === steps.length - 1;
  const currentStepData = steps[currentStep];

  const handleNext = () => {
    if (!isLastStep && canGoNext) {
      onStepChange(currentStep + 1);
    } else if (isLastStep) {
      onComplete();
    }
  };

  const handlePrevious = () => {
    if (!isFirstStep && canGoPrevious) {
      onStepChange(currentStep - 1);
    }
  };

  const handleStepClick = (stepIndex: number) => {
    // Allow clicking on previous steps or the current step
    if (stepIndex <= currentStep) {
      onStepChange(stepIndex);
    }
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* Step Navigation */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">
            Step {currentStep + 1} of {steps.length}: {currentStepData.title}
          </CardTitle>
          {currentStepData.description && (
            <p className="text-sm text-muted-foreground">{currentStepData.description}</p>
          )}
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            {steps.map((step, index) => {
              const isActive = index === currentStep;
              const isCompleted = index < currentStep;
              const isClickable = index <= currentStep;

              return (
                <div key={step.id} className="flex items-center">
                  <div
                    className={cn(
                      "flex items-center cursor-pointer transition-colors",
                      isClickable ? "hover:opacity-80" : "cursor-not-allowed"
                    )}
                    onClick={() => isClickable && handleStepClick(index)}
                  >
                    <div className="flex flex-col items-center space-y-2">
                      <div
                        className={cn(
                          "flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors",
                          isCompleted
                            ? "bg-primary border-primary text-primary-foreground"
                            : isActive
                            ? "border-primary text-primary bg-background"
                            : "border-muted-foreground/30 text-muted-foreground"
                        )}
                      >
                        {isCompleted ? (
                          <CheckCircle className="w-5 h-5" />
                        ) : step.icon ? (
                          step.icon
                        ) : (
                          <span className="text-sm font-medium">{index + 1}</span>
                        )}
                      </div>
                      <div className="text-center">
                        <div
                          className={cn(
                            "text-xs font-medium",
                            isActive ? "text-primary" : "text-muted-foreground"
                          )}
                        >
                          {step.title}
                        </div>
                        {step.isOptional && (
                          <Badge variant="outline" className="text-xs mt-1">
                            Optional
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  {index < steps.length - 1 && (
                    <Separator
                      className={cn(
                        "w-12 mx-4",
                        isCompleted ? "bg-primary" : "bg-muted-foreground/30"
                      )}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Step Content */}
      <div className="min-h-[400px]">
        {children}
      </div>

      {/* Navigation Buttons */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex space-x-2">
              {onCancel && (
                <Button
                  variant="outline"
                  onClick={onCancel}
                  disabled={isLoading}
                >
                  {cancelButtonText}
                </Button>
              )}
            </div>
            
            <div className="flex space-x-2">
              <Button
                variant="outline"
                onClick={handlePrevious}
                disabled={isFirstStep || isLoading || !canGoPrevious}
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                {previousButtonText}
              </Button>
              
              <Button
                onClick={handleNext}
                disabled={isLoading || (!isLastStep && !canGoNext)}
                className="min-w-[100px]"
              >
                {isLoading ? (
                  <div className="flex items-center">
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                    Processing...
                  </div>
                ) : (
                  <>
                    {isLastStep ? completeButtonText : nextButtonText}
                    {!isLastStep && <ChevronRight className="w-4 h-4 ml-2" />}
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default MultiStepWizard;