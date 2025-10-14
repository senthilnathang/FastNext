"use client"

import * as React from "react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  DateField,
  DateTimeField,
  NumberField,
  SelectionList,
  WidgetSelector,
  KanbanBoard,
  ListView
} from "@/shared/components"
import type { WidgetType, KanbanColumn, ListColumn, ListItem } from "@/shared/components"

// Demo data for components
const selectionOptions = [
  { value: "react", label: "React" },
  { value: "vue", label: "Vue.js" },
  { value: "angular", label: "Angular" },
  { value: "svelte", label: "Svelte" },
  { value: "nextjs", label: "Next.js" },
  { value: "nuxt", label: "Nuxt.js" },
]

const kanbanColumns: KanbanColumn[] = [
  {
    id: "todo",
    title: "To Do",
    items: [
      {
        id: "1",
        title: "Create user interface",
        description: "Design and implement the main user interface components",
        status: "todo",
        priority: "high",
        assignee: "John Doe",
        tags: ["ui", "frontend"],
      },
      {
        id: "2",
        title: "Set up database",
        description: "Configure PostgreSQL database with proper schema",
        status: "todo",
        priority: "medium",
        assignee: "Jane Smith",
        tags: ["backend", "database"],
      },
    ],
  },
  {
    id: "inprogress",
    title: "In Progress",
    items: [
      {
        id: "3",
        title: "API Integration",
        description: "Integrate with third-party APIs",
        status: "inprogress",
        priority: "high",
        assignee: "Bob Johnson",
        tags: ["api", "integration"],
      },
    ],
  },
  {
    id: "done",
    title: "Done",
    items: [
      {
        id: "4",
        title: "Project Setup",
        description: "Initial project setup and configuration",
        status: "done",
        priority: "low",
        assignee: "Alice Brown",
        tags: ["setup", "config"],
      },
    ],
  },
]

const listData: ListItem[] = [
  {
    id: "1",
    name: "John Doe",
    email: "john@example.com",
    role: "Admin",
    status: "Active",
    lastLogin: "2024-01-15",
    projects: 5,
  },
  {
    id: "2",
    name: "Jane Smith",
    email: "jane@example.com",
    role: "Editor",
    status: "Active",
    lastLogin: "2024-01-14",
    projects: 3,
  },
  {
    id: "3",
    name: "Bob Johnson",
    email: "bob@example.com",
    role: "Viewer",
    status: "Inactive",
    lastLogin: "2024-01-10",
    projects: 1,
  },
]

const listColumns: ListColumn[] = [
  { key: "name", label: "Name", sortable: true },
  { key: "email", label: "Email", sortable: true },
  {
    key: "role",
    label: "Role",
    sortable: true,
    render: (value) => <Badge variant="secondary">{String(value)}</Badge>
  },
  {
    key: "status",
    label: "Status",
    render: (value) => (
      <Badge variant={value === "Active" ? "success" : "destructive"}>
        {String(value)}
      </Badge>
    )
  },
  { key: "lastLogin", label: "Last Login", sortable: true },
  { key: "projects", label: "Projects", sortable: true },
]

export default function ComponentsDemoPage() {
  const [dateValue, setDateValue] = React.useState<Date>()
  const [datetimeValue, setDatetimeValue] = React.useState<Date>()
  const [numberValue, setNumberValue] = React.useState<number>()
  const [floatValue, setFloatValue] = React.useState<number>()
  const [selectedOptions, setSelectedOptions] = React.useState<string[]>([])
  const [selectedWidget, setSelectedWidget] = React.useState<WidgetType>()
  const [kanbanData, setKanbanData] = React.useState<KanbanColumn[]>(kanbanColumns)
  const [listViewMode, setListViewMode] = React.useState<"list" | "grid" | "cards">("list")

  return (
    <div className="container mx-auto p-6 space-y-8">

      {/* Form Fields Section */}
      <div className="space-y-6">
        <h2 className="text-2xl font-semibold">Form Fields</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Date Field */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Date Field</CardTitle>
            </CardHeader>
            <CardContent>
              <DateField
                label="Select Date"
                value={dateValue}
                onChange={setDateValue}
                placeholder="Choose a date"
                required
              />
              {dateValue && (
                <div className="mt-2 text-sm text-muted-foreground">
                  Selected: {dateValue.toDateString()}
                </div>
              )}
            </CardContent>
          </Card>

          {/* DateTime Field */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">DateTime Field</CardTitle>
            </CardHeader>
            <CardContent>
              <DateTimeField
                label="Select Date & Time"
                value={datetimeValue}
                onChange={setDatetimeValue}
                placeholder="Choose date and time"
                showSeconds
              />
              {datetimeValue && (
                <div className="mt-2 text-sm text-muted-foreground">
                  Selected: {datetimeValue.toLocaleString()}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Integer Field */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Integer Field</CardTitle>
            </CardHeader>
            <CardContent>
              <NumberField
                label="Quantity"
                value={numberValue}
                onChange={setNumberValue}
                type="integer"
                min={0}
                max={100}
                step={1}
                placeholder="Enter quantity"
                showControls
              />
              {numberValue !== undefined && (
                <div className="mt-2 text-sm text-muted-foreground">
                  Value: {numberValue}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Float Field */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Float Field</CardTitle>
            </CardHeader>
            <CardContent>
              <NumberField
                label="Price"
                value={floatValue}
                onChange={setFloatValue}
                type="float"
                min={0}
                step={0.01}
                precision={2}
                placeholder="Enter price"
                showControls
              />
              {floatValue !== undefined && (
                <div className="mt-2 text-sm text-muted-foreground">
                  Value: ${floatValue.toFixed(2)}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Selection List */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Selection List</CardTitle>
            </CardHeader>
            <CardContent>
              <SelectionList
                label="Frameworks"
                options={selectionOptions}
                value={selectedOptions}
                onChange={setSelectedOptions}
                multiple
                searchable
                showSelectAll
                maxSelections={3}
              />
            </CardContent>
          </Card>

          {/* Widget Selector */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Widget Selector</CardTitle>
            </CardHeader>
            <CardContent>
              <WidgetSelector
                label="Choose Widget Type"
                value={selectedWidget}
                onChange={setSelectedWidget}
                searchable
                categoryFilter
              />
              {selectedWidget && (
                <div className="mt-2 text-sm text-muted-foreground">
                  Selected: {selectedWidget.name} ({selectedWidget.category})
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Kanban Board Section */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">Kanban Board</h2>
        <Card>
          <CardContent className="p-6">
            <KanbanBoard
              columns={kanbanData}
              onColumnsChange={setKanbanData}
              onAddItem={(columnId) => {
              }}
              onEditItem={(item) => {
              }}
              onDeleteItem={(item) => {
              }}
              onMoveItem={(itemId, fromColumn, toColumn) => {
              }}
            />
          </CardContent>
        </Card>
      </div>

      {/* List View Section */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">List View</h2>
        <Card>
          <CardContent className="p-6">
            <ListView
              items={listData}
              columns={listColumns}
              viewMode={listViewMode}
              onViewModeChange={setListViewMode}
              searchable
              sortable
              selectable
               actions={[
                 {
                   key: "edit",
                   label: "Edit",
                   onClick: (item) => console.log("Edit", item),
                 },
                 {
                   key: "delete",
                   label: "Delete",
                   variant: "destructive",
                   onClick: (item) => console.log("Delete", item),
                 }
               ]}
              pagination={{
                page: 1,
                pageSize: 10,
                total: listData.length,
                totalPages: 1
              }}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
