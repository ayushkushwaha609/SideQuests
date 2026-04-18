import { redirect } from "next/navigation";
import { getUserOrCreate } from "@/lib/auth-sync";

export default async function MyProfileRedirect() {
  const user = await getUserOrCreate();
  
  if (!user) {
    return redirect("/sign-in");
  }

  return redirect(`/profile/${user.username}`);
}
