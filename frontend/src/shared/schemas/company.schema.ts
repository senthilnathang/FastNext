import { z } from "zod";
import { EmailSchema, UrlSchema, UuidSchema, SlugSchema, ColorSchema } from "./index";

// Company size enum
export const CompanySizeSchema = z.enum([
  "startup",
  "small",
  "medium",
  "large",
  "enterprise",
]);

// Company industry enum
export const CompanyIndustrySchema = z.enum([
  "technology",
  "healthcare",
  "finance",
  "education",
  "retail",
  "manufacturing",
  "consulting",
  "media",
  "real_estate",
  "other",
]);

// Company status enum
export const CompanyStatusSchema = z.enum([
  "active",
  "inactive",
  "suspended",
  "pending",
]);

// Company address schema
export const CompanyAddressSchema = z.object({
  street: z.string().max(200).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  postalCode: z.string().max(20).optional(),
  country: z.string().max(100).optional(),
});

// Company settings schema
export const CompanySettingsSchema = z.object({
  timezone: z.string().default("UTC"),
  dateFormat: z.string().default("YYYY-MM-DD"),
  currency: z.string().max(3).default("USD"),
  language: z.string().max(5).default("en"),
  features: z.record(z.string(), z.boolean()).optional(),
});

// Company branding schema
export const CompanyBrandingSchema = z.object({
  primaryColor: ColorSchema.optional(),
  secondaryColor: ColorSchema.optional(),
  logoUrl: UrlSchema.optional(),
  faviconUrl: UrlSchema.optional(),
});

// Full Company schema
export const CompanySchema = z.object({
  id: UuidSchema,
  name: z.string().min(1, "Company name is required").max(200),
  slug: SlugSchema,
  description: z.string().max(1000).optional(),
  email: EmailSchema.optional(),
  phone: z.string().max(20).optional(),
  website: UrlSchema.optional(),
  size: CompanySizeSchema.optional(),
  industry: CompanyIndustrySchema.optional(),
  status: CompanyStatusSchema.default("active"),
  address: CompanyAddressSchema.optional(),
  settings: CompanySettingsSchema.optional(),
  branding: CompanyBrandingSchema.optional(),
  ownerId: UuidSchema.optional(),
  parentCompanyId: UuidSchema.optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

// Create company schema
export const CreateCompanySchema = z.object({
  name: z.string().min(1, "Company name is required").max(200),
  slug: SlugSchema.optional(),
  description: z.string().max(1000).optional(),
  email: EmailSchema.optional(),
  phone: z.string().max(20).optional(),
  website: UrlSchema.optional(),
  size: CompanySizeSchema.optional(),
  industry: CompanyIndustrySchema.optional(),
  address: CompanyAddressSchema.optional(),
  settings: CompanySettingsSchema.optional(),
  branding: CompanyBrandingSchema.optional(),
  parentCompanyId: UuidSchema.optional(),
});

// Update company schema
export const UpdateCompanySchema = z.object({
  name: z.string().min(1).max(200).optional(),
  slug: SlugSchema.optional(),
  description: z.string().max(1000).optional(),
  email: EmailSchema.optional(),
  phone: z.string().max(20).optional(),
  website: UrlSchema.optional(),
  size: CompanySizeSchema.optional(),
  industry: CompanyIndustrySchema.optional(),
  status: CompanyStatusSchema.optional(),
  address: CompanyAddressSchema.optional(),
  settings: CompanySettingsSchema.optional(),
  branding: CompanyBrandingSchema.optional(),
  parentCompanyId: UuidSchema.nullable().optional(),
});

// Company member schema
export const CompanyMemberSchema = z.object({
  userId: UuidSchema,
  companyId: UuidSchema,
  role: z.string().min(1, "Role is required"),
  department: z.string().max(100).optional(),
  title: z.string().max(100).optional(),
  joinedAt: z.string().datetime(),
});

// Company invite schema
export const CompanyInviteSchema = z.object({
  email: EmailSchema,
  role: z.string().min(1, "Role is required"),
  department: z.string().max(100).optional(),
  title: z.string().max(100).optional(),
  expiresAt: z.string().datetime().optional(),
});

// Export type inference helpers
export type CompanySize = z.infer<typeof CompanySizeSchema>;
export type CompanyIndustry = z.infer<typeof CompanyIndustrySchema>;
export type CompanyStatus = z.infer<typeof CompanyStatusSchema>;
export type CompanyAddress = z.infer<typeof CompanyAddressSchema>;
export type CompanySettings = z.infer<typeof CompanySettingsSchema>;
export type CompanyBranding = z.infer<typeof CompanyBrandingSchema>;
export type Company = z.infer<typeof CompanySchema>;
export type CreateCompany = z.infer<typeof CreateCompanySchema>;
export type UpdateCompany = z.infer<typeof UpdateCompanySchema>;
export type CompanyMember = z.infer<typeof CompanyMemberSchema>;
export type CompanyInvite = z.infer<typeof CompanyInviteSchema>;
