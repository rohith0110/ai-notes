import { NotesLayoutShell } from "@/components/notes/notes-layout-shell";

export default function NotesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <NotesLayoutShell>{children}</NotesLayoutShell>;
}
