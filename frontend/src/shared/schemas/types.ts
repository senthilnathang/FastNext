import type { z } from "zod";
import type * as schemas from "./index";

// Infer TypeScript types from schemas
export type User = z.infer<typeof schemas.UserCreateSchema>;
export type UserUpdate = z.infer<typeof schemas.UserUpdateSchema>;
export type Login = z.infer<typeof schemas.LoginSchema>;
export type Register = z.infer<typeof schemas.RegisterSchema>;
export type PasswordChange = z.infer<typeof schemas.PasswordChangeSchema>;
export type ForgotPassword = z.infer<typeof schemas.ForgotPasswordSchema>;
export type ResetPassword = z.infer<typeof schemas.ResetPasswordSchema>;

export type Role = z.infer<typeof schemas.RoleCreateSchema>;
export type RoleUpdate = z.infer<typeof schemas.RoleUpdateSchema>;
export type Permission = z.infer<typeof schemas.PermissionCreateSchema>;

export type Project = z.infer<typeof schemas.ProjectCreateSchema>;
export type ProjectUpdate = z.infer<typeof schemas.ProjectUpdateSchema>;
export type ProjectMemberInvite = z.infer<
  typeof schemas.ProjectMemberInviteSchema
>;

export type Workflow = z.infer<typeof schemas.WorkflowCreateSchema>;
export type WorkflowUpdate = z.infer<typeof schemas.WorkflowUpdateSchema>;

export type ImportJob = z.infer<typeof schemas.ImportJobCreateSchema>;
export type ExportJob = z.infer<typeof schemas.ExportJobCreateSchema>;
export type FileValidationRequest = z.infer<
  typeof schemas.FileValidationRequestSchema
>;
