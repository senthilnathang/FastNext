/**
 * Employee Module Types
 */

export interface Employee {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  gender?: string;
  date_of_birth?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  zip_code?: string;
  department_id?: number;
  job_position_id?: number;
  employee_type_id?: number;
  work_type_id?: number;
  reporting_manager_id?: number;
  is_active: boolean;
  date_joining?: string;
  date_leaving?: string;
  created_at: string;
  updated_at: string;
  department?: { id: number; name: string };
  job_position?: { id: number; name: string };
  employee_type?: { id: number; name: string };
  work_type?: { id: number; name: string };
  reporting_manager?: { id: number; first_name: string; last_name: string };
}

export interface EmployeeCreate {
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  gender?: string;
  date_of_birth?: string;
  department_id?: number;
  job_position_id?: number;
  employee_type_id?: number;
  work_type_id?: number;
  reporting_manager_id?: number;
  is_active?: boolean;
  date_joining?: string;
}

export type EmployeeUpdate = Partial<EmployeeCreate>;

export interface EmployeeDocument {
  id: number;
  employee_id: number;
  name: string;
  document_type?: string;
  file_url?: string;
  expiry_date?: string;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface EmployeeNote {
  id: number;
  employee_id: number;
  title: string;
  content: string;
  is_private: boolean;
  created_by_id?: number;
  created_at: string;
  updated_at: string;
}

export interface BonusPoint {
  id: number;
  employee_id?: number;
  name: string;
  points?: number;
  reason?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DisciplinaryAction {
  id: number;
  employee_id?: number;
  name: string;
  action_type?: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Policy {
  id: number;
  name: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface EmployeeReport {
  id: number;
  name: string;
  report_type?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface EmployeeSetting {
  id: number;
  key: string;
  value: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  skip: number;
  limit: number;
}

export interface ListParams {
  skip?: number;
  limit?: number;
  search?: string;
}
