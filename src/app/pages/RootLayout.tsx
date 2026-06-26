import { Outlet, Navigate } from "react-router";
import { Sidebar } from "../components/layout/Sidebar";
import { useAuth } from "../contexts/AuthContext";
import { SidebarProvider } from "../contexts/SidebarContext";

export function RootLayout() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-400 text-sm">A carregar...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <SidebarProvider>
      <div className="h-screen flex overflow-hidden">
        <Sidebar />
        <div className="flex-1 min-h-0 flex flex-col min-w-0 overflow-hidden">
          <Outlet />
        </div>
      </div>
    </SidebarProvider>
  );
}