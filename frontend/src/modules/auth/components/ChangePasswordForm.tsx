"use client";

import {
  AlertCircle,
  Download,
  Eye,
  EyeOff,
  History,
  Key,
  Lock,
  RefreshCw,
  Shield,
} from "lucide-react";
import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { API_CONFIG, getApiUrl } from "@/shared/services/api/config";

interface PasswordFormData {
  current_password: string;
  new_password: string;
  confirm_password: string;
}

interface ChangePasswordFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function ChangePasswordForm({
  onSuccess,
  onCancel,
}: ChangePasswordFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [passwordHistory, setPasswordHistory] = useState<any[]>([]);
  const [showPasswordHistory, setShowPasswordHistory] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState("");
  const [historyLoading, setHistoryLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    getValues,
    setValue,
  } = useForm<PasswordFormData>();

  const newPassword = watch("new_password");

  const onSubmit = async (data: PasswordFormData) => {
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const token = localStorage.getItem("access_token");
      const response = await fetch(
        getApiUrl(API_CONFIG.ENDPOINTS.PROFILE.PASSWORD),
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(data),
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        // Handle detailed password validation errors
        if (errorData.detail && typeof errorData.detail === "string") {
          throw new Error(errorData.detail);
        }
        throw new Error(errorData.detail || "Failed to change password");
      }

      setSuccess(true);
      reset();

      if (onSuccess) {
        setTimeout(onSuccess, 2000);
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "An error occurred";
      setError(parseBackendError(errorMessage));
    } finally {
      setLoading(false);
    }
  };

  const togglePasswordVisibility = (field: "current" | "new" | "confirm") => {
    setShowPasswords((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  const validatePassword = (password: string) => {
    const checks = [
      { test: /.{8,}/, label: "At least 8 characters" },
      { test: /[A-Z]/, label: "One uppercase letter" },
      { test: /[a-z]/, label: "One lowercase letter" },
      { test: /\d/, label: "One number" },
      { test: /[!@#$%^&*(),.?":{}|<>]/, label: "One special character" },
    ];

    return checks.map((check) => ({
      ...check,
      passed: check.test.test(password),
    }));
  };

  // Enhanced error message parsing for backend validation errors
  const parseBackendError = (errorMessage: string) => {
    if (errorMessage.includes("Password must be at least")) {
      return "Password must be at least 8 characters long";
    }
    if (errorMessage.includes("uppercase letter")) {
      return "Password must contain at least one uppercase letter";
    }
    if (errorMessage.includes("lowercase letter")) {
      return "Password must contain at least one lowercase letter";
    }
    if (errorMessage.includes("number")) {
      return "Password must contain at least one number";
    }
    if (errorMessage.includes("special character")) {
      return "Password must contain at least one special character";
    }
    if (errorMessage.includes("last")) {
      return "Password cannot be one of your last passwords";
    }
    if (errorMessage.includes("breached")) {
      return "This password has been found in known data breaches. Please choose a different password.";
    }
    return errorMessage;
  };

  const passwordStrengthChecks = newPassword
    ? validatePassword(newPassword)
    : [];
  const allChecksPassed = passwordStrengthChecks.every((check) => check.passed);

  const generateSecurePassword = () => {
    const lowercase = "abcdefghijklmnopqrstuvwxyz";
    const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const numbers = "0123456789";
    const symbols = '!@#$%^&*(),.?":{}|<>';
    const allChars = lowercase + uppercase + numbers + symbols;

    let password = "";
    // Ensure at least one character from each category
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += symbols[Math.floor(Math.random() * symbols.length)];

    // Fill the rest with random characters
    for (let i = 4; i < 16; i++) {
      password += allChars[Math.floor(Math.random() * allChars.length)];
    }

    // Shuffle the password
    return password
      .split("")
      .sort(() => Math.random() - 0.5)
      .join("");
  };

  const handleGeneratePassword = () => {
    const newPass = generateSecurePassword();
    setGeneratedPassword(newPass);
    setValue("new_password", newPass);
    setValue("confirm_password", newPass);
  };

  const fetchPasswordHistory = async () => {
    setHistoryLoading(true);
    try {
      const token = localStorage.getItem("access_token");
      const response = await fetch(
        getApiUrl("/api/v1/profile/password-history"),
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (response.ok) {
        const data = await response.json();
        setPasswordHistory(data);
      } else {
        setError("Failed to load password history. Please try again.");
      }
    } catch (err) {
      console.error("Failed to fetch password history:", err);
      setError(
        "Failed to load password history. Please check your connection.",
      );
    } finally {
      setHistoryLoading(false);
    }
  };

  const exportPasswordSecurity = () => {
    const securityData = {
      password_last_changed: new Date().toISOString(),
      password_strength_requirements: passwordStrengthChecks.map((check) => ({
        requirement: check.label,
        status: check.passed ? "met" : "not_met",
      })),
      generated_at: new Date().toISOString(),
    };

    const dataStr = JSON.stringify(securityData, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `password-security-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <Card className="p-6">
      <div className="flex items-center space-x-2 mb-6">
        <Lock className="h-5 w-5 text-red-600" />
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Change Password
        </h2>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-center space-x-2">
          <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md flex items-center space-x-2">
          <Shield className="h-4 w-4 text-green-600 flex-shrink-0" />
          <p className="text-sm text-green-600">
            Password changed successfully!
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div>
          <Label
            htmlFor="current_password"
            className="flex items-center space-x-2"
          >
            <Lock className="h-4 w-4" />
            <span>Current Password</span>
          </Label>
          <div className="relative mt-1">
            <Input
              id="current_password"
              type={showPasswords.current ? "text" : "password"}
              {...register("current_password", {
                required: "Current password is required",
              })}
              placeholder="Enter your current password"
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => togglePasswordVisibility("current")}
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
            >
              {showPasswords.current ? (
                <EyeOff className="h-4 w-4 text-gray-400" />
              ) : (
                <Eye className="h-4 w-4 text-gray-400" />
              )}
            </button>
          </div>
          {errors.current_password && (
            <p className="text-sm text-red-600 mt-1">
              {errors.current_password.message}
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="new_password" className="flex items-center space-x-2">
            <Lock className="h-4 w-4" />
            <span>New Password</span>
          </Label>
          <div className="relative mt-1">
            <Input
              id="new_password"
              type={showPasswords.new ? "text" : "password"}
              {...register("new_password", {
                required: "New password is required",
                minLength: {
                  value: 8,
                  message: "Password must be at least 8 characters",
                },
                validate: (value) => {
                  const checks = validatePassword(value);
                  return (
                    checks.every((check) => check.passed) ||
                    "Password does not meet requirements"
                  );
                },
              })}
              placeholder="Enter your new password"
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => togglePasswordVisibility("new")}
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
            >
              {showPasswords.new ? (
                <EyeOff className="h-4 w-4 text-gray-400" />
              ) : (
                <Eye className="h-4 w-4 text-gray-400" />
              )}
            </button>
          </div>
          {errors.new_password && (
            <p className="text-sm text-red-600 mt-1">
              {errors.new_password.message}
            </p>
          )}

          {newPassword && (
            <div
              className="mt-3 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border"
              role="region"
              aria-labelledby="password-strength-heading"
            >
              <div className="flex items-center justify-between mb-3">
                <p
                  id="password-strength-heading"
                  className="text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Password Strength
                </p>
                <div className="flex items-center space-x-2">
                  <div
                    className={`w-2 h-2 rounded-full ${allChecksPassed ? "bg-green-500" : passwordStrengthChecks.filter((c) => c.passed).length >= 3 ? "bg-yellow-500" : "bg-red-500"}`}
                    aria-hidden="true"
                  />
                  <span
                    className={`text-xs font-medium ${
                      allChecksPassed
                        ? "text-green-600"
                        : passwordStrengthChecks.filter((c) => c.passed)
                              .length >= 3
                          ? "text-yellow-600"
                          : "text-red-600"
                    }`}
                    aria-live="polite"
                  >
                    {allChecksPassed
                      ? "Strong"
                      : passwordStrengthChecks.filter((c) => c.passed).length >=
                          3
                        ? "Good"
                        : "Weak"}
                  </span>
                </div>
              </div>

              {/* Progress Bar */}
              <div
                className="w-full bg-gray-200 rounded-full h-2 mb-3"
                role="progressbar"
                aria-valuenow={
                  passwordStrengthChecks.filter((c) => c.passed).length
                }
                aria-valuemin={0}
                aria-valuemax={5}
                aria-label="Password strength progress"
              >
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${
                    allChecksPassed
                      ? "bg-green-500 w-full"
                      : passwordStrengthChecks.filter((c) => c.passed).length >=
                          3
                        ? "bg-yellow-500 w-3/4"
                        : passwordStrengthChecks.filter((c) => c.passed)
                              .length >= 2
                          ? "bg-orange-500 w-1/2"
                          : "bg-red-500 w-1/4"
                  }`}
                />
              </div>

              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Requirements:
              </p>
              <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-2">
                {passwordStrengthChecks.map((check, index) => (
                  <li
                    key={index}
                    className="flex items-center space-x-2 text-sm"
                  >
                    <div
                      className={`w-4 h-4 rounded-full flex items-center justify-center ${
                        check.passed
                          ? "bg-green-100 text-green-600"
                          : "bg-gray-100 text-gray-400"
                      }`}
                    >
                      {check.passed ? (
                        <svg
                          className="w-3 h-3"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      ) : (
                        <div className="w-1.5 h-1.5 bg-current rounded-full" />
                      )}
                    </div>
                    <span
                      className={
                        check.passed
                          ? "text-green-700 dark:text-green-400"
                          : "text-gray-600 dark:text-gray-400"
                      }
                    >
                      {check.label}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div>
          <Label
            htmlFor="confirm_password"
            className="flex items-center space-x-2"
          >
            <Lock className="h-4 w-4" />
            <span>Confirm New Password</span>
          </Label>
          <div className="relative mt-1">
            <Input
              id="confirm_password"
              type={showPasswords.confirm ? "text" : "password"}
              {...register("confirm_password", {
                required: "Please confirm your new password",
                validate: (value) => {
                  const newPass = getValues("new_password");
                  return value === newPass || "Passwords do not match";
                },
              })}
              placeholder="Confirm your new password"
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => togglePasswordVisibility("confirm")}
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
            >
              {showPasswords.confirm ? (
                <EyeOff className="h-4 w-4 text-gray-400" />
              ) : (
                <Eye className="h-4 w-4 text-gray-400" />
              )}
            </button>
          </div>
          {errors.confirm_password && (
            <p className="text-sm text-red-600 mt-1">
              {errors.confirm_password.message}
            </p>
          )}
        </div>

        <div className="space-y-4 pt-4">
          {/* Primary Actions */}
          <div className="flex space-x-3">
            <Button
              type="submit"
              disabled={loading || !allChecksPassed}
              className="flex-1"
              variant="default"
            >
              {loading ? "Changing Password..." : "Change Password"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => reset()}
              disabled={loading}
            >
              Clear
            </Button>
            {onCancel && (
              <Button
                type="button"
                variant="ghost"
                onClick={onCancel}
                disabled={loading}
              >
                Cancel
              </Button>
            )}
          </div>

          {/* Password Tools */}
          <div className="border-t pt-4">
            <p className="text-sm font-medium text-gray-700 mb-3">
              Password Tools
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleGeneratePassword}
                disabled={loading}
                className="flex items-center space-x-1"
              >
                <Key className="h-3 w-3" />
                <span>Generate</span>
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  if (!showPasswordHistory) {
                    fetchPasswordHistory();
                  }
                  setShowPasswordHistory(!showPasswordHistory);
                }}
                disabled={loading || historyLoading}
                className="flex items-center space-x-1"
              >
                {historyLoading ? (
                  <RefreshCw className="h-3 w-3 animate-spin" />
                ) : (
                  <History className="h-3 w-3" />
                )}
                <span>{historyLoading ? "Loading..." : "History"}</span>
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={exportPasswordSecurity}
                disabled={loading}
                className="flex items-center space-x-1"
              >
                <Download className="h-3 w-3" />
                <span>Export</span>
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setValue("new_password", "");
                  setValue("confirm_password", "");
                  setGeneratedPassword("");
                }}
                disabled={loading}
                className="flex items-center space-x-1"
              >
                <RefreshCw className="h-3 w-3" />
                <span>Reset</span>
              </Button>
            </div>

            {generatedPassword && (
              <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
                <p className="text-xs text-blue-700 font-medium">
                  Generated Password:
                </p>
                <p className="text-sm font-mono text-blue-900 break-all">
                  {generatedPassword}
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  Password has been filled in the form above.
                </p>
              </div>
            )}

            {showPasswordHistory && (
              <div className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded-md">
                <p className="text-xs text-gray-700 font-medium mb-2">
                  Recent Password Changes:
                </p>
                {passwordHistory.length > 0 ? (
                  <ul className="space-y-1">
                    {passwordHistory.slice(0, 5).map((entry, index) => (
                      <li key={index} className="text-xs text-gray-600">
                        {new Date(entry.changed_at).toLocaleDateString()} - via{" "}
                        {entry.method || "web"}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-gray-500">
                    No password history available.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </form>
    </Card>
  );
}
