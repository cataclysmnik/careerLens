import { PlacementSidebar } from "@/components/layout/PlacementSidebar";

export default function PlacementLayout({ children }: { children: React.ReactNode }) {
  return <PlacementSidebar>{children}</PlacementSidebar>;
}
