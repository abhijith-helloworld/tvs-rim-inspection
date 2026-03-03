"use client";
import { useRouter } from "next/navigation";
import { useModal } from "./ModalContext";

export default function GlobalModal() {
  const { message, closeModal } = useModal();
  const router = useRouter();

  if (!message) return null;

  const handleDismiss = () => {
    closeModal();
    router.push("/userDashboard");
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999]">
      <div
        className="bg-white p-6 rounded-2xl shadow-2xl w-96 max-w-[90%] relative border border-gray-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header accent */}
        <div className="flex items-center gap-2 mb-4">
          <div className="w-2 h-2 rounded-full bg-green-500" />
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
            Notification
          </span>
        </div>

        <p className="text-gray-700 text-sm mb-6 leading-relaxed">{message}</p>

        <div className="flex justify-end">
          <button
            onClick={handleDismiss}
            className="px-5 py-2.5 bg-green-500 hover:bg-green-600 text-white text-sm font-semibold rounded-xl transition-colors duration-150 flex items-center gap-2"
          >
            Back to Robots
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}