import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { toast } from "sonner";
import { apiGet, apiPost } from "../lib/apiClient";

export function RegisterPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token") || "";

  const [tokenInfo, setTokenInfo] = useState<{ valid: boolean; email: string; papel: string } | null>(null);
  const [checking, setChecking] = useState(true);
  const [form, setForm] = useState({ nome: "", username: "", password: "", confirmar: "" });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) {
      setChecking(false);
      return;
    }
    apiGet<{ valid: boolean; email: string; papel: string }>(`/api/auth/invite/${token}`)
      .then((data) => setTokenInfo(data))
      .catch(() => setTokenInfo({ valid: false, email: "", papel: "" }))
      .finally(() => setChecking(false));
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirmar) {
      toast.error("As palavras-passe não coincidem");
      return;
    }
    if (form.password.length < 6) {
      toast.error("A palavra-passe deve ter pelo menos 6 caracteres");
      return;
    }
    setSubmitting(true);
    try {
      await apiPost<null>("/api/auth/register", {
        token,
        nome: form.nome,
        username: form.username,
        password: form.password,
      });
      toast.success("Conta criada com sucesso! Pode iniciar sessão.");
      navigate("/login");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao registar");
    } finally {
      setSubmitting(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">A validar convite...</p>
      </div>
    );
  }

  if (!token || (tokenInfo && !tokenInfo.valid)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="p-8 w-full max-w-md text-center">
          <div className="text-4xl mb-4">⛔</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Convite inválido ou expirado</h2>
          <p className="text-gray-500 mb-6">
            Este link de convite não é válido ou já foi utilizado.
            Contacte o administrador para obter um novo convite.
          </p>
          <Button variant="outline" onClick={() => navigate("/login")}>
            Ir para o login
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="p-8 w-full max-w-md">
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="size-8 bg-blue-500 rounded-md flex items-center justify-center">
              <span className="text-white font-bold text-sm">C</span>
            </div>
            <span className="text-lg font-semibold text-gray-900">CoopGest</span>
          </div>
          <h2 className="text-xl font-semibold text-gray-900">Criar conta</h2>
          <p className="text-sm text-gray-500 mt-1">
            Convidado como <strong>{tokenInfo?.email}</strong> · papel: <strong>{tokenInfo?.papel}</strong>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome completo</label>
            <Input
              required
              placeholder="O seu nome"
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome de utilizador</label>
            <Input
              required
              placeholder="utilizador"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Palavra-passe</label>
            <Input
              required
              type="password"
              placeholder="Mínimo 6 caracteres"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar palavra-passe</label>
            <Input
              required
              type="password"
              placeholder="Repetir palavra-passe"
              value={form.confirmar}
              onChange={(e) => setForm({ ...form, confirmar: e.target.value })}
            />
          </div>

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? "A criar conta..." : "Criar conta"}
          </Button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-4">
          Já tem conta?{" "}
          <button
            className="text-blue-600 hover:underline"
            onClick={() => navigate("/login")}
          >
            Iniciar sessão
          </button>
        </p>
      </Card>
    </div>
  );
}
