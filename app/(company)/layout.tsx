import { CompanySidebar } from "@/components/layout/CompanySidebar";

export default function CompanyLayout({ children }: { children: React.ReactNode }) {
  return <CompanySidebar>{children}</CompanySidebar>;
}
