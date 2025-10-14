import { z } from "zod";
import {
  // API schemas
  AuthLoginRequestSchema,
  AuthRegisterRequestSchema,
  ColorSchema,
  // Common schemas
  EmailSchema,
  ExportJobCreateSchema,
  FileValidationRequestSchema,
  ForgotPasswordSchema,
  ImportJobCreateRequestSchema,
  // Data import/export schemas
  ImportJobCreateSchema,
  LoginSchema,
  PasswordChangeSchema,
  PasswordSchema,
  PermissionCreateSchema,
  ProjectCreateRequestSchema,
  // Project schemas
  ProjectCreateSchema,
  ProjectMemberInviteSchema,
  ProjectUpdateSchema,
  RegisterSchema,
  ResetPasswordSchema,
  // Role schemas
  RoleCreateSchema,
  RoleUpdateSchema,
  SlugSchema,
  UrlSchema,
  UserCreateRequestSchema,
  // User schemas
  UserCreateSchema,
  UserUpdateSchema,
  UuidSchema,
  WorkflowCreateRequestSchema,
  // Workflow schemas
  WorkflowCreateSchema,
  WorkflowUpdateSchema,
} from "../schemas";

/**
 * Validation service that provides type-safe validation for all form data
 */
export class ValidationService {
  // User validation methods
  static validateUserCreate(data: unknown) {
    return UserCreateSchema.parse(data);
  }

  static validateUserUpdate(data: unknown) {
    return UserUpdateSchema.parse(data);
  }

  static validateLogin(data: unknown) {
    return LoginSchema.parse(data);
  }

  static validateRegister(data: unknown) {
    return RegisterSchema.parse(data);
  }

  static validatePasswordChange(data: unknown) {
    return PasswordChangeSchema.parse(data);
  }

  static validateForgotPassword(data: unknown) {
    return ForgotPasswordSchema.parse(data);
  }

  static validateResetPassword(data: unknown) {
    return ResetPasswordSchema.parse(data);
  }

  // Role validation methods
  static validateRoleCreate(data: unknown) {
    return RoleCreateSchema.parse(data);
  }

  static validateRoleUpdate(data: unknown) {
    return RoleUpdateSchema.parse(data);
  }

  static validatePermissionCreate(data: unknown) {
    return PermissionCreateSchema.parse(data);
  }

  // Project validation methods
  static validateProjectCreate(data: unknown) {
    return ProjectCreateSchema.parse(data);
  }

  static validateProjectUpdate(data: unknown) {
    return ProjectUpdateSchema.parse(data);
  }

  static validateProjectMemberInvite(data: unknown) {
    return ProjectMemberInviteSchema.parse(data);
  }

  // Workflow validation methods
  static validateWorkflowCreate(data: unknown) {
    return WorkflowCreateSchema.parse(data);
  }

  static validateWorkflowUpdate(data: unknown) {
    return WorkflowUpdateSchema.parse(data);
  }

  // Data import/export validation methods
  static validateImportJobCreate(data: unknown) {
    return ImportJobCreateSchema.parse(data);
  }

  static validateExportJobCreate(data: unknown) {
    return ExportJobCreateSchema.parse(data);
  }

  static validateFileValidationRequest(data: unknown) {
    return FileValidationRequestSchema.parse(data);
  }

  // API request validation methods
  static validateAuthLoginRequest(data: unknown) {
    return AuthLoginRequestSchema.parse(data);
  }

  static validateAuthRegisterRequest(data: unknown) {
    return AuthRegisterRequestSchema.parse(data);
  }

  static validateUserCreateRequest(data: unknown) {
    return UserCreateRequestSchema.parse(data);
  }

  static validateProjectCreateRequest(data: unknown) {
    return ProjectCreateRequestSchema.parse(data);
  }

  static validateWorkflowCreateRequest(data: unknown) {
    return WorkflowCreateRequestSchema.parse(data);
  }

  static validateImportJobCreateRequest(data: unknown) {
    return ImportJobCreateRequestSchema.parse(data);
  }

  // Common field validation methods
  static validateEmail(email: string): { isValid: boolean; error?: string } {
    try {
      EmailSchema.parse(email);
      return { isValid: true };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return { isValid: false, error: error.issues[0]?.message };
      }
      return { isValid: false, error: "Invalid email format" };
    }
  }

  static validatePassword(password: string): {
    isValid: boolean;
    error?: string;
  } {
    try {
      PasswordSchema.parse(password);
      return { isValid: true };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return { isValid: false, error: error.issues[0]?.message };
      }
      return { isValid: false, error: "Invalid password format" };
    }
  }

  static validateUrl(url: string): { isValid: boolean; error?: string } {
    try {
      UrlSchema.parse(url);
      return { isValid: true };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return { isValid: false, error: error.issues[0]?.message };
      }
      return { isValid: false, error: "Invalid URL format" };
    }
  }

  static validateUuid(uuid: string): { isValid: boolean; error?: string } {
    try {
      UuidSchema.parse(uuid);
      return { isValid: true };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return { isValid: false, error: error.issues[0]?.message };
      }
      return { isValid: false, error: "Invalid UUID format" };
    }
  }

  static validateSlug(slug: string): { isValid: boolean; error?: string } {
    try {
      SlugSchema.parse(slug);
      return { isValid: true };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return { isValid: false, error: error.issues[0]?.message };
      }
      return { isValid: false, error: "Invalid slug format" };
    }
  }

  static validateColor(color: string): { isValid: boolean; error?: string } {
    try {
      ColorSchema.parse(color);
      return { isValid: true };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return { isValid: false, error: error.issues[0]?.message };
      }
      return { isValid: false, error: "Invalid color format" };
    }
  }

  // Generic validation method
  static validate<T>(
    schema: z.ZodType<T, any, any>,
    data: unknown,
  ): {
    success: boolean;
    data?: T;
    error?: string;
    errors?: Array<{ path: string; message: string }>;
  } {
    try {
      const validatedData = schema.parse(data);
      return { success: true, data: validatedData };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          success: false,
          error: error.issues[0]?.message || "Validation failed",
          errors: error.issues.map((err) => ({
            path: err.path.join("."),
            message: err.message,
          })),
        };
      }
      return {
        success: false,
        error: "Unknown validation error",
      };
    }
  }

  // Safe parsing with detailed error information
  static safeParse<T>(schema: z.ZodType<T, any, any>, data: unknown) {
    return schema.safeParse(data);
  }

  // Check if data matches schema without throwing
  static isValid<T>(schema: z.ZodType<T, any, any>, data: unknown): boolean {
    const result = schema.safeParse(data);
    return result.success;
  }

  // Get validation errors without throwing
  static getValidationErrors<T>(
    schema: z.ZodType<T, any, any>,
    data: unknown,
  ): Array<{ path: string; message: string }> | null {
    const result = schema.safeParse(data);
    if (result.success) return null;

    return result.error.issues.map((err) => ({
      path: err.path.join("."),
      message: err.message,
    }));
  }

  // Create a validator function for async validation
  static createAsyncValidator<T>(schema: z.ZodType<T, any, any>) {
    return async (
      data: unknown,
    ): Promise<{ isValid: boolean; error?: string }> => {
      try {
        await Promise.resolve(schema.parse(data));
        return { isValid: true };
      } catch (error) {
        if (error instanceof z.ZodError) {
          return { isValid: false, error: error.issues[0]?.message };
        }
        return { isValid: false, error: "Validation failed" };
      }
    };
  }

  // Validate multiple fields at once
  static validateFields(
    validations: Array<{
      schema: z.ZodType<any>;
      data: unknown;
      fieldName: string;
    }>,
  ): {
    isValid: boolean;
    errors: Record<string, string>;
  } {
    const errors: Record<string, string> = {};

    for (const { schema, data, fieldName } of validations) {
      const result = ValidationService.validate(schema, data);
      if (!result.success) {
        errors[fieldName] = result.error || "Validation failed";
      }
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
    };
  }

  // Transform validation errors for form libraries
  static transformErrorsForForm(
    errors: z.ZodError,
  ): Record<string, { message: string; type: string }> {
    const formErrors: Record<string, { message: string; type: string }> = {};

    errors.issues.forEach((error) => {
      const path = error.path.join(".");
      formErrors[path] = {
        message: error.message,
        type: error.code,
      };
    });

    return formErrors;
  }

  // Get default values from schema
  static getDefaults<T extends Record<string, any>>(
    schema: z.ZodType<T, any, any>,
  ): Partial<T> {
    try {
      return schema.parse({});
    } catch {
      return {};
    }
  }

  // Validate file upload
  static validateFileUpload(
    file: File,
    options: {
      maxSize?: number;
      allowedTypes?: string[];
      allowedExtensions?: string[];
    } = {},
  ): { isValid: boolean; error?: string } {
    const {
      maxSize = 10 * 1024 * 1024,
      allowedTypes = [],
      allowedExtensions = [],
    } = options;

    // Check file size
    if (file.size > maxSize) {
      return {
        isValid: false,
        error: `File size must be less than ${Math.round(maxSize / 1024 / 1024)}MB`,
      };
    }

    // Check file type
    if (allowedTypes.length > 0 && !allowedTypes.includes(file.type)) {
      return {
        isValid: false,
        error: `File type ${file.type} is not allowed`,
      };
    }

    // Check file extension
    if (allowedExtensions.length > 0) {
      const extension = file.name.split(".").pop()?.toLowerCase();
      if (!extension || !allowedExtensions.includes(extension)) {
        return {
          isValid: false,
          error: `File extension .${extension} is not allowed`,
        };
      }
    }

    return { isValid: true };
  }

  // Validate array of items
  static validateArray<T>(
    schema: z.ZodType<T, any, any>,
    items: unknown[],
  ): {
    isValid: boolean;
    validItems: T[];
    invalidItems: Array<{ index: number; error: string }>;
  } {
    const validItems: T[] = [];
    const invalidItems: Array<{ index: number; error: string }> = [];

    items.forEach((item, index) => {
      const result = ValidationService.validate(schema, item);
      if (result.success && result.data) {
        validItems.push(result.data);
      } else {
        invalidItems.push({
          index,
          error: result.error || "Validation failed",
        });
      }
    });

    return {
      isValid: invalidItems.length === 0,
      validItems,
      invalidItems,
    };
  }
}

// Export commonly used schemas for direct use
export {
  // User schemas
  UserCreateSchema,
  UserUpdateSchema,
  LoginSchema,
  RegisterSchema,
  PasswordChangeSchema,
  ForgotPasswordSchema,
  ResetPasswordSchema,
  // Role schemas
  RoleCreateSchema,
  RoleUpdateSchema,
  PermissionCreateSchema,
  // Project schemas
  ProjectCreateSchema,
  ProjectUpdateSchema,
  ProjectMemberInviteSchema,
  // Workflow schemas
  WorkflowCreateSchema,
  WorkflowUpdateSchema,
  // Data import/export schemas
  ImportJobCreateSchema,
  ExportJobCreateSchema,
  FileValidationRequestSchema,
  // Common schemas
  EmailSchema,
  PasswordSchema,
  UrlSchema,
  UuidSchema,
  SlugSchema,
  ColorSchema,
};

// Export type definitions
export type ValidationResult<T> = ReturnType<
  typeof ValidationService.validate<T>
>;
export type AsyncValidator<T> = ReturnType<
  typeof ValidationService.createAsyncValidator<T>
>;
export type ValidationErrors = Array<{ path: string; message: string }>;
export type FormErrors = Record<string, { message: string; type: string }>;

// Default export
export default ValidationService;
