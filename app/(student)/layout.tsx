import { StudentSidebar } from "@/components/layout/StudentSidebar";

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  return <StudentSidebar>{children}</StudentSidebar>;
}
