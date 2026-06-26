import { RouterProvider } from "react-router";
import { router } from "./routes";
import { Toaster } from "./components/ui/sonner";
import { AuthProvider } from "./contexts/AuthContext";
import { ProjectProvider } from "./contexts/ProjectContext";

export default function App() {
  return (
    <AuthProvider>
      <ProjectProvider>
        <RouterProvider router={router} />
        <Toaster />
      </ProjectProvider>
    </AuthProvider>
  );
}