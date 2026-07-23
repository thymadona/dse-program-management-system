import { SidebarInset, SidebarProvider } from "@dse-pms/ui";
import { AuthGuard } from "./auth-guard";
import { RoleAccessGuard } from "./role-access-guard";
import { AppSidebar } from "./sidebar";

/** App shell: collapsible dark sidebar on the left, content area on the right. */
export default function ShellLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset className="h-screen overflow-hidden">
          <RoleAccessGuard>{children}</RoleAccessGuard>
        </SidebarInset>
      </SidebarProvider>
    </AuthGuard>
  );
}
