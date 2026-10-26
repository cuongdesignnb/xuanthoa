"use client";

import { ConfirmProvider, MediaPickerSlot, Toaster } from "./ui";
import MediaPicker from "./media/MediaPicker";

// Đăng ký MediaPicker cho ImageInput (tránh phụ thuộc vòng).
MediaPickerSlot.register(MediaPicker);

export function AdminProviders({ children }: { children: React.ReactNode }) {
  return (
    <ConfirmProvider>
      {children}
      <Toaster />
    </ConfirmProvider>
  );
}
