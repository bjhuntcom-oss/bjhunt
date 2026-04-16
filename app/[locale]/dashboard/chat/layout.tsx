import { ErrorBoundary } from "@/components/dashboard/error-boundary";

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary>
      <div className="flex flex-col h-full min-h-0 overflow-hidden">
        {children}
      </div>
    </ErrorBoundary>
  );
}
