import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { apiPost } from "../lib/apiClient";

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmar) {
      setError("As passwords não coincidem");
      return;
    }
    if (password.length < 6) {
      setError("A password deve ter pelo menos 6 caracteres");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await apiPost<null>("/api/auth/reset-password", { token, password });
      navigate("/login", { state: { message: "Password redefinida com sucesso. Pode iniciar sessão." } });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao redefinir password");
    } finally {
      setSubmitting(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="bg-white rounded-2xl shadow-xl p-10 max-w-md w-full text-center">
          <p className="text-red-600 mb-4">Token inválido ou ausente.</p>
          <Link to="/login" className="text-blue-600 hover:underline text-sm">Voltar ao login</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-10">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center size-16 bg-blue-600 rounded-2xl mb-4">
              <svg className="size-9 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Nova password</h1>
            <p className="text-gray-500 mt-1 text-sm">Defina uma nova password segura</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <Label htmlFor="pw">Nova password</Label>
              <Input
                id="pw"
                type="password"
                autoFocus
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
                required
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="pw2">Confirmar password</Label>
              <Input
                id="pw2"
                type="password"
                value={confirmar}
                onChange={(e) => setConfirmar(e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
                required
                className="mt-1"
              />
              {password && confirmar && password !== confirmar && (
                <p className="text-xs text-red-600 mt-1">As passwords não coincidem</p>
              )}
            </div>
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}
            <Button type="submit" className="w-full" disabled={submitting || !password || password !== confirmar}>
              {submitting ? "A guardar..." : "Definir nova password"}
            </Button>
            <p className="text-center text-sm">
              <Link to="/login" className="text-blue-600 hover:underline">Cancelar</Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
