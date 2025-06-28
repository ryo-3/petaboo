"use client";

import { useState } from "react";
import { useClerk } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import DoorIcon from "@/components/ui/door-icon";
import LogoutConfirmationModal from "@/components/ui/logout-confirmation-modal";

export default function LogoutButton() {
  const { signOut } = useClerk();
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);

  const handleLogout = async () => {
    await signOut();
    router.push("/"); // ログアウト後にルートへリダイレクト
  };

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-full transition-all duration-200 hover:scale-110"
        title="ログアウト"
      >
        <DoorIcon className="w-4 h-4" />
      </button>
      
      <LogoutConfirmationModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onConfirm={handleLogout}
      />
    </>
  );
}
