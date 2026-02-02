"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { useEmployeeSettings } from "../hooks/useEmployees";

export default function EmployeeSettingsPage() {
  const { data, isLoading } = useEmployeeSettings();
  const settings = data?.items ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Employee Settings</h1>
        <p className="text-muted-foreground">Configure employee module settings</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Settings</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Loading settings...</p>
          ) : settings.length === 0 ? (
            <p className="text-muted-foreground">No settings configured.</p>
          ) : (
            <div className="space-y-4">
              {settings.map((setting) => (
                <div key={setting.id} className="flex items-center justify-between border-b pb-3 last:border-0">
                  <div>
                    <p className="font-medium">{setting.key}</p>
                    <p className="text-sm text-muted-foreground">{setting.value}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
