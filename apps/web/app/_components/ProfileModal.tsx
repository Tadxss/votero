"use client";

import { useEffect, useRef, useState } from "react";
import { useAuthUser, useProfile, useUpdateProfile, useUploadAvatar } from "@repo/shared";
import { Avatar } from "./Avatar";
import { Button } from "./Button";
import { inputClasses } from "./styles";
import { useModalA11y } from "./useModalA11y";

const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

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
  const uploadAvatar = useUploadAvatar(user?.id);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [username, setUsername] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [avatarError, setAvatarError] = useState<string | null>(null);

  useEffect(() => {
    if (open && profile) {
      setUsername(profile.username ?? "");
      setFirstName(profile.firstName ?? "");
      setLastName(profile.lastName ?? "");
      setAvatarUrl(profile.avatarUrl ?? "");
      setAvatarError(null);
      updateProfile.reset();
    }
  }, [open, profile]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file later
    if (!file) return;
    setAvatarError(null);

    if (!file.type.startsWith("image/")) {
      setAvatarError("Please choose an image file.");
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      setAvatarError("Image must be under 2MB.");
      return;
    }

    uploadAvatar.mutate(file, {
      onSuccess: (url) => setAvatarUrl(url),
      onError: () => setAvatarError("Upload failed. Please try again."),
    });
  }

  const containerRef = useRef<HTMLDivElement>(null);
  useModalA11y({ open, onClose, containerRef });

  if (!open) return null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    updateProfile.mutate(
      { username, firstName, lastName, avatarUrl },
      { onSuccess: () => onClose() },
    );
  }

  return (
    // Click-outside-to-dismiss backdrop — Escape (handled by useModalA11y) is the keyboard
    // equivalent, so this div itself doesn't need its own key handler.
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions, jsx-a11y/click-events-have-key-events
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      {/* stopPropagation only guards against the backdrop's onClose above, not a real interaction */}
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/click-events-have-key-events */}
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-modal-title"
        tabIndex={-1}
        className="w-full max-w-sm animate-pop-in rounded-3xl border border-neutral-300 bg-[var(--surface)] p-6 shadow-xl dark:border-neutral-800"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="profile-modal-title" className="font-display text-xl font-bold text-[var(--foreground)]">Edit profile</h2>

        <div className="mt-4 flex flex-col items-center gap-2">
          <Avatar
            url={avatarUrl}
            label={firstName || username || user?.email || "?"}
            size="lg"
          />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
          <Button
            type="button"
            variant="secondary"
            className="text-xs"
            disabled={uploadAvatar.isPending}
            onClick={() => fileInputRef.current?.click()}
          >
            {uploadAvatar.isPending ? "Uploading…" : "Change photo"}
          </Button>
          {avatarError && (
            <p role="alert" className="text-xs font-medium text-red-600">
              {avatarError}
            </p>
          )}
        </div>

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
              maxLength={100}
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
              maxLength={100}
              className={inputClasses}
            />
          </label>

          {updateProfile.isError && (
            <p role="alert" className="text-sm font-medium text-red-600">
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
