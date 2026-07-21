"use client";

import { useEffect, useState } from "react";
import { useAuthUser, useProfile, useUpdateProfile } from "@repo/shared";
import { Button } from "./Button";
import { inputClasses } from "./styles";

function friendlyError(message: string | undefined): string | null {
  if (!message) return null;
  if (message.includes("USERNAME_TAKEN")) return "That username is already taken — try another.";
  if (message.includes("INVALID_USERNAME")) {
    return "Usernames are 3–20 characters: lowercase letters, numbers, and underscores only.";
  }
  return "Something went wrong. Please try again.";
}

export function ProfileModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user } = useAuthUser();
  const { data: profile } = useProfile(user?.id);
  const updateProfile = useUpdateProfile(user?.id);

  const [username, setUsername] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  useEffect(() => {
    if (open && profile) {
      setUsername(profile.username ?? "");
      setFirstName(profile.firstName ?? "");
      setLastName(profile.lastName ?? "");
      updateProfile.reset();
    }
  }, [open, profile]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    updateProfile.mutate(
      { username, firstName, lastName },
      { onSuccess: () => onClose() },
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm animate-pop-in rounded-3xl border border-neutral-200 bg-[var(--surface)] p-6 shadow-xl dark:border-neutral-800"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-display text-xl font-bold text-[var(--foreground)]">Edit profile</h2>
        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
          <label className="flex flex-col gap-1.5 text-sm font-semibold text-[var(--foreground)]">
            Username
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. daryl_t"
              className={inputClasses}
              maxLength={20}
            />
          </label>

          <label className="flex flex-col gap-1.5 text-sm font-semibold text-[var(--foreground)]">
            First name
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Daryl"
              className={inputClasses}
            />
          </label>

          <label className="flex flex-col gap-1.5 text-sm font-semibold text-[var(--foreground)]">
            Last name
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Tadeo"
              className={inputClasses}
            />
          </label>

          {updateProfile.isError && (
            <p className="text-sm font-medium text-red-600">
              {friendlyError(updateProfile.error.message)}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={updateProfile.isPending}>
              {updateProfile.isPending ? "Saving…" : "Save"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
