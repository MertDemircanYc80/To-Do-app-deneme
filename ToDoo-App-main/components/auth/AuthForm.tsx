// components/auth/AuthForm.tsx
"use client";

import React, { useMemo, useState, KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

/* ---- Types ---- */
type AuthMode = "login" | "register";

export type AuthFormState = {
  username: string;
  email: string;
  password: string;
  // page.tsx’te confirmPassword her zaman string olarak tutuluyor
  confirmPassword: string;
};

type Palette = {
  background: string;
  textPrimary: string;
  textSecondary: string;
  accent?: string;
  secondaryAccent?: string;
};

interface AuthFormProps {
  authMode: AuthMode;
  setAuthMode: React.Dispatch<React.SetStateAction<AuthMode>>;
  authForm: AuthFormState;
  setAuthForm: React.Dispatch<React.SetStateAction<AuthFormState>>;
  handleLogin: () => void;
  handleRegister: () => void;
  authError: string;
  setAuthError: (error: string) => void;
  darkPalette: Palette;
}

const emailOk = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

/* -------------------------------------------------- */
export const AuthForm = ({
  authMode,
  setAuthMode,
  authForm,
  setAuthForm,
  handleLogin,
  handleRegister,
  authError,
  setAuthError,
  darkPalette,
}: AuthFormProps) => {
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [showPw2, setShowPw2] = useState(false);

  const canSubmit = useMemo(() => {
    if (!emailOk((authForm.email ?? "").trim())) return false;
    if ((authForm.password ?? "").trim().length < 1) return false;
    if (authMode === "register") {
      if ((authForm.username ?? "").trim().length < 1) return false;
      if ((authForm.password ?? "").trim().length < 6) return false;
      if ((authForm.confirmPassword ?? "") !== (authForm.password ?? "")) return false;
    }
    return true;
  }, [authMode, authForm]);

  const submit = async () => {
    if (loading) return;
    setAuthError("");

    // Ön kontrol
    if (!emailOk((authForm.email ?? "").trim())) {
      setAuthError("Please enter a valid email address.");
      return;
    }
    if ((authForm.password ?? "").trim().length < (authMode === "register" ? 6 : 1)) {
      setAuthError(authMode === "register" ? "Password must be at least 6 characters." : "Password is required.");
      return;
    }
    if (authMode === "register") {
      if ((authForm.username ?? "").trim().length < 1) {
        setAuthError("Username is required.");
        return;
      }
      if ((authForm.confirmPassword ?? "") !== (authForm.password ?? "")) {
        setAuthError("Passwords don't match.");
        return;
      }
    }

    try {
      setLoading(true);
      if (authMode === "login") await Promise.resolve(handleLogin());
      else await Promise.resolve(handleRegister());
    } finally {
      setLoading(false);
    }
  };

  const onEnter = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") submit();
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ backgroundColor: darkPalette.background }}
    >
      <Card
        className="w-full max-w-md p-6"
        style={{
          backgroundColor: darkPalette.textSecondary + "20",
          border: `1px solid ${darkPalette.textSecondary}30`,
        }}
      >
        <div className="text-center mb-6">
          <h1
            className="text-2xl font-bold"
            style={{ color: darkPalette.textPrimary, fontFamily: "var(--font-playful)" }}
          >
            Todo App
          </h1>
          <p style={{ color: darkPalette.textSecondary }}>
            {authMode === "login" ? "Sign in to your account" : "Create a new account"}
          </p>
        </div>

        <div className="space-y-4">
          {authMode === "register" && (
            <Input
              placeholder="Username"
              value={authForm.username}
              onChange={(e) => setAuthForm((s) => ({ ...s, username: e.target.value }))}
              onKeyDown={onEnter}
              style={{
                backgroundColor: darkPalette.background,
                color: darkPalette.textPrimary,
                border: `1px solid ${darkPalette.textSecondary}30`,
              }}
            />
          )}

          <Input
            placeholder="Email"
            type="email"
            value={authForm.email}
            onChange={(e) => setAuthForm((s) => ({ ...s, email: e.target.value }))}
            onKeyDown={onEnter}
            style={{
              backgroundColor: darkPalette.background,
              color: darkPalette.textPrimary,
              border: `1px solid ${darkPalette.textSecondary}30`,
            }}
          />

          <div className="relative">
            <Input
              placeholder="Password"
              type={showPw ? "text" : "password"}
              value={authForm.password}
              onChange={(e) => setAuthForm((s) => ({ ...s, password: e.target.value }))}
              onKeyDown={onEnter}
              style={{
                backgroundColor: darkPalette.background,
                color: darkPalette.textPrimary,
                border: `1px solid ${darkPalette.textSecondary}30`,
              }}
            />
            <button
              type="button"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-xs opacity-80 hover:opacity-100"
              onClick={() => setShowPw((v) => !v)}
              style={{ color: darkPalette.textSecondary }}
              aria-label={showPw ? "Hide password" : "Show password"}
            >
              {showPw ? "Hide" : "Show"}
            </button>
          </div>

          {authMode === "register" && (
            <div className="relative">
              <Input
                placeholder="Confirm Password"
                type={showPw2 ? "text" : "password"}
                value={authForm.confirmPassword}
                onChange={(e) => setAuthForm((s) => ({ ...s, confirmPassword: e.target.value }))}
                onKeyDown={onEnter}
                style={{
                  backgroundColor: darkPalette.background,
                  color: darkPalette.textPrimary,
                  border: `1px solid ${darkPalette.textSecondary}30`,
                }}
              />
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-xs opacity-80 hover:opacity-100"
                onClick={() => setShowPw2((v) => !v)}
                style={{ color: darkPalette.textSecondary }}
                aria-label={showPw2 ? "Hide confirm password" : "Show confirm password"}
              >
                {showPw2 ? "Hide" : "Show"}
              </button>
            </div>
          )}

          {authError && (
            <p className="text-red-500 text-sm text-center" role="alert">
              {authError}
            </p>
          )}

          <Button
            onClick={submit}
            className="w-full disabled:opacity-60 disabled:cursor-not-allowed"
            disabled={!canSubmit || loading}
            style={{ backgroundColor: darkPalette.accent, color: "white" }}
          >
            {loading
              ? authMode === "login"
                ? "Signing in..."
                : "Creating..."
              : authMode === "login"
              ? "Sign In"
              : "Sign Up"}
          </Button>

          <div className="text-center">
            <button
              onClick={() => {
                setAuthMode((m) => (m === "login" ? "register" : "login"));
                setAuthError("");
              }}
              className="text-sm underline"
              style={{ color: darkPalette.secondaryAccent }}
            >
              {authMode === "login" ? "Need an account? Sign up" : "Already have an account? Sign in"}
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
};
