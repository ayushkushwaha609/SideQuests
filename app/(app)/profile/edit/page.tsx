import { redirect } from "next/navigation";
import { getUserOrCreate } from "@/lib/auth-sync";
import ProfileEditForm from "@/components/profile-edit-form";

export default async function ProfileEditPage() {
  const currentUser = await getUserOrCreate();
  if (!currentUser) return redirect("/sign-in");

  const editUser = {
    id: currentUser.id,
    username: currentUser.username,
    bio: currentUser.bio,
    profileImages: (currentUser.profileImages as string[]) || [],
  };

  return <ProfileEditForm user={editUser} />;
}
