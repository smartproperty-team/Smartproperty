// ===========================================
// SmartProperty - Field error handling for hand-rolled forms
// ===========================================

import { useCallback, useState } from "react";

/**
 * Shared validation behaviour for forms that manage their own state.
 *
 * Most forms in this app use react-hook-form with a zod schema. Two do not -
 * PropertyFormPage and MaintenanceRequestFormPage - because they are long
 * multi-step wizards that predate that convention. Rather than leave them
 * with subtly different behaviour, this hook gives them the parts that
 * actually affect the user:
 *
 *   - validation on blur, so a problem appears where the user already is
 *     rather than only when they press Next
 *   - focus and scroll to the first invalid field, without which a failed
 *     submit on a long form looks like a dead button
 *   - the accessibility attributes a screen reader needs to announce that a
 *     field is invalid and why
 *   - replacing (not merging) errors for the fields being checked, so a stale
 *     error cannot block navigation with nothing visible to explain it
 *
 * Focus works by DOM id, so each field's error key must match the id of its
 * input: key "title" requires <input id="title">.
 *
 * See docs/FORMS.md for the plan to converge these onto react-hook-form.
 */
export type FieldErrors<K extends string> = Partial<Record<K, string>>;

export interface UseFieldErrorsResult<K extends string> {
  errors: FieldErrors<K>;
  /** Validate specific fields, replacing any previous errors for those keys. */
  validateFields: (keys: K[], options?: { focus?: boolean }) => boolean;
  /** Validate on blur - never steals focus, since the user is still typing. */
  handleBlur: (key: K) => void;
  /** Clear one field's error, e.g. as soon as the user edits it. */
  clearError: (key: K) => void;
  /** Clear every error. */
  resetErrors: () => void;
  /** Spread onto an input: blur handling, aria attributes and error class. */
  fieldProps: (key: K) => {
    onBlur: () => void;
    "aria-invalid": true | undefined;
    "aria-describedby": string | undefined;
    className: string;
  };
  /** Spread onto the element that renders the message. */
  errorProps: (key: K) => { id: string; role: "alert" };
}

export function useFieldErrors<K extends string>(
  computeErrors: () => FieldErrors<K>,
): UseFieldErrorsResult<K> {
  const [errors, setErrors] = useState<FieldErrors<K>>({});

  const focusFirstInvalid = useCallback((keys: K[]) => {
    // Deferred a frame so the error state has painted and the element is
    // measurable before we scroll to it.
    window.requestAnimationFrame(() => {
      for (const key of keys) {
        const el = document.getElementById(key);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
          el.focus({ preventScroll: true });
          return;
        }
      }
    });
  }, []);

  const validateFields = useCallback(
    (keys: K[], options?: { focus?: boolean }): boolean => {
      const all = computeErrors();
      const failed = keys.filter((k) => all[k]);

      setErrors((prev) => {
        const next = { ...prev };
        // Replace rather than merge: a key being checked now owns its result,
        // so a previously-set error for it cannot survive being fixed.
        keys.forEach((k) => delete next[k]);
        failed.forEach((k) => {
          next[k] = all[k];
        });
        return next;
      });

      if (failed.length && options?.focus !== false) {
        focusFirstInvalid(failed);
      }
      return failed.length === 0;
    },
    [computeErrors, focusFirstInvalid],
  );

  const handleBlur = useCallback(
    (key: K) => {
      validateFields([key], { focus: false });
    },
    [validateFields],
  );

  const clearError = useCallback((key: K) => {
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  const resetErrors = useCallback(() => setErrors({}), []);

  const fieldProps = useCallback(
    (key: K) => ({
      onBlur: () => handleBlur(key),
      "aria-invalid": errors[key] ? (true as const) : undefined,
      "aria-describedby": errors[key] ? `${key}-error` : undefined,
      className: errors[key] ? "error" : "",
    }),
    [errors, handleBlur],
  );

  const errorProps = useCallback(
    (key: K) => ({ id: `${key}-error`, role: "alert" as const }),
    [],
  );

  return {
    errors,
    validateFields,
    handleBlur,
    clearError,
    resetErrors,
    fieldProps,
    errorProps,
  };
}
