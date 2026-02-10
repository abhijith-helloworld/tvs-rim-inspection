// components/NotificationService.tsx
import { toast } from "sonner";

export const showSuccess = (message: string) => {
  toast.success(message, {
    duration: 3000,
    position: "top-right",
  });
};

export const showError = (message: string) => {
  toast.error(message, {
    duration: 4000,
    position: "top-right",
  });
};

export const showWarning = (message: string) => {
  toast.warning(message, {
    duration: 4000,
    position: "top-right",
  });
};


export const showInfo = (message: string) => {
  toast.info(message, {
    duration: 4000,
    position: "top-right",
  });
};

export const dismissToast = (id: string | number) => {
  toast.dismiss(id);
};