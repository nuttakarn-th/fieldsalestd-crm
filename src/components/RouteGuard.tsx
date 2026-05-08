import { Navigate, useLocation } from "react-router-dom";
import { useAuth, useCurrentUser, type AppRole } from "@/store/authStore";

interface RouteGuardProps {
  children: React.ReactNode;
  allowedRoles?: AppRole[]; // if omitted, any logged-in user
}

export function RouteGuard({ children, allowedRoles }: RouteGuardProps) {
  const currentUserId = useAuth((s) => s.currentUserId);
  const user = useCurrentUser();
  const location = useLocation();

  if (!currentUserId || !user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return (
      <div className="p-8">
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 max-w-xl">
          <h2 className="font-bold text-destructive">ไม่มีสิทธิ์เข้าถึงหน้านี้</h2>
          <p className="text-sm text-muted-foreground mt-1">
            หน้านี้สำหรับ Role: {allowedRoles.join(", ")} เท่านั้น (Role ของคุณ: {user.role})
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}