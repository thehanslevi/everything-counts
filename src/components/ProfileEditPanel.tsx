"use client";

import { useRouter } from "next/navigation";
import { ProfileEditForm } from "@/components/ProfileEditForm";
import type { Profile } from "@/lib/data/types";

// The editor as it opens on your own profile (?edit=1). Saving or cancelling
// closes it by dropping the query.
export function ProfileEditPanel({ profile }: { profile: Profile }) {
  const router = useRouter();
  return (
    <ProfileEditForm
      profile={profile}
      onDone={() => router.replace(`/u/${profile.handle}`, { scroll: false })}
    />
  );
}
