import { AppHeader } from "@/components/layout/app-header";
import { NotesSidebar } from "@/components/notes/notes-sidebar";
import { ConvexAuthBanner } from "@/components/auth/convex-auth-banner";

export default function NotesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen flex-col">
      <AppHeader />
      <ConvexAuthBanner />
      <div className="flex flex-1 min-h-0">
        <NotesSidebar />
        <main className="flex-1 min-w-0 overflow-hidden bg-black">
          {children}
        </main>
      </div>
    </div>
  );
}
