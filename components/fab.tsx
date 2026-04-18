"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";

export default function Fab() {
  const router = useRouter();
  return (
    <button
      className="fab"
      aria-label="Create new sidequest"
      onClick={() => router.push("/quests/new")}
    >
      <Plus size={26} strokeWidth={2.5} />
    </button>
  );
}
