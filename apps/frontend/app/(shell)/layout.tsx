import { AuthGuard } from "./auth-guard";
import { Sidebar } from "./sidebar";

/** App shell: fixed dark sidebar on the left, content area on the right. */
export default function ShellLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <div className="flex flex-1 flex-col overflow-hidden">{children}</div>
      </div>
    </AuthGuard>
  );
}
