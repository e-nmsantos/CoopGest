import { useState } from "react";
import { Link } from "react-router";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { apiPost } from "../lib/apiClient";

export function ForgotPasswordPage() {
  const [username, setUsername] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [devToken, setDevToken] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const data = await apiPost<{ token?: string }>("/api/auth/forgot-password", { username });
      setSent(true);
      // Em desenvolvimento, o backend devolve o token directamente
      if (data.token) setDevToken(data.token);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-10">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center size-16 bg-blue-600 rounded-2xl mb-4">
              <svg className="size-9 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Recuperar password</h1>
            <p className="text-gray-500 mt-1 text-sm">Introduza o seu nome de utilizador</p>
          </div>

          {sent ? (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm text-green-700">
                Se o utilizador existir, será enviado um email com instruções para redefinir a password.
              </div>
              {devToken && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3 text-xs">
                  <p className="font-semibold text-yellow-800 mb-1">Modo desenvolvimento — link direto:</p>
                  <Link to={`/reset-password?token=${devToken}`} className="text-blue-600 hover:underline break-all">
                    /reset-password?token={devToken}
                  </Link>
                </div>
              )}
              <Link to="/login" className="block text-center text-sm text-blue-600 hover:underline">
                Voltar ao login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <Label htmlFor="username">Utilizador</Label>
                <Input
                  id="username"
                  autoFocus
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin"
                  required
                  className="mt-1"
                />
              </div>
              <Button type="submit" className="w-full" disabled={submitting || !username.trim()}>
                {submitting ? "A enviar..." : "Enviar instruções"}
              </Button>
              <p className="text-center text-sm">
                <Link to="/login" className="text-blue-600 hover:underline">Voltar ao login</Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
