import { Navigate } from "react-router-dom";
import { useCurrentUser } from "@/store/authStore";
import { StandaloneHeader } from "@/components/StandaloneHeader";
import AllService from "./AllService";

export default function AllServicePage() {
  const user = useCurrentUser();
  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="min-h-screen bg-background">
      <StandaloneHeader backTo="/" />
      <div className="max-w-7xl mx-auto px-5 sm:px-8 pb-10">
        <AllService />
      </div>
    </div>
  );
}
