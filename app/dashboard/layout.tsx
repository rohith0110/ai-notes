import { AppHeader } from "@/components/layout/app-header";
import { ConvexAuthBanner } from "@/components/auth/convex-auth-banner";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen flex-col">
      <AppHeader />
      <ConvexAuthBanner />
      <main className="flex-1 overflow-y-auto bg-black">{children}</main>
    </div>
  );
}
