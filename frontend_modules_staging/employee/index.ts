/**
 * Employee Module
 *
 * Exports components, hooks, and types for the Employee module.
 */

// Components
export { EmployeeListTable, GenericModuleList } from "./components";

// Hooks
export {
  useEmployees,
  useEmployee,
  useCreateEmployee,
  useUpdateEmployee,
  useDeleteEmployee,
  useEmployeeDocuments,
  useEmployeeNotes,
  useBonusPoints,
  useDisciplinaryActions,
  usePolicies,
  useEmployeeReports,
  useEmployeeSettings,
} from "./hooks/useEmployees";

// Types
export type {
  Employee,
  EmployeeCreate,
  EmployeeUpdate,
  EmployeeDocument,
  EmployeeNote,
  BonusPoint,
  DisciplinaryAction,
  Policy,
  EmployeeReport,
  EmployeeSetting,
} from "./types";

// Registration
export { ensureEmployeeModuleRegistered } from "./register";
