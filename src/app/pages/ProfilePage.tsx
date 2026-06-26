import { useState } from "react";
import { Header } from "../components/layout/Header";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { useAuth } from "../contexts/AuthContext";
import { toast } from "sonner";
import { User, Lock } from "lucide-react";
import { apiPatch } from "../lib/apiClient";

export function ProfilePage() {
  const { user } = useAuth();

  const [nome, setNome] = useState(user?.nome || "");
  const [savingNome, setSavingNome] = useState(false);

  const [passwordAtual, setPasswordAtual] = useState("");
  const [novaPw, setNovaPw] = useState("");
  const [confirmarPw, setConfirmarPw] = useState("");
  const [savingPw, setSavingPw] = useState(false);

  const handleSaveNome = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) return;
    setSavingNome(true);
    try {
      await apiPatch<null>("/api/auth/me", { nome: nome.trim() });
      toast.success("Nome atualizado com sucesso");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao guardar");
    } finally {
      setSavingNome(false);
    }
  };

  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (novaPw !== confirmarPw) {
      toast.error("As passwords não coincidem");
      return;
    }
    if (novaPw.length < 6) {
      toast.error("A password deve ter pelo menos 6 caracteres");
      return;
    }
    setSavingPw(true);
    try {
      await apiPatch<null>("/api/auth/me", { password: novaPw, password_atual: passwordAtual });
      toast.success("Password alterada com sucesso");
      setPasswordAtual("");
      setNovaPw("");
      setConfirmarPw("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao guardar");
    } finally {
      setSavingPw(false);
    }
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-gray-50">
      <Header />

      <div className="flex-1 min-h-0 overflow-auto">
        <div className="max-w-2xl mx-auto p-6 space-y-6">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">O meu perfil</h1>
            <p className="text-sm text-gray-500 mt-1">Gerir as suas informações e password</p>
          </div>

          {/* Informações */}
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="size-9 bg-blue-100 rounded-full flex items-center justify-center">
                <User className="size-5 text-blue-600" />
              </div>
              <div>
                <h2 className="font-semibold text-gray-900">Informações pessoais</h2>
                <p className="text-xs text-gray-500">Utilizador: <span className="font-mono">{user?.username}</span> · Papel: <span className="capitalize">{user?.papel}</span></p>
              </div>
            </div>
            <form onSubmit={handleSaveNome} className="space-y-4">
              <div>
                <Label htmlFor="nome">Nome de exibição</Label>
                <Input
                  id="nome"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="mt-1"
                  required
                />
              </div>
              <Button type="submit" disabled={savingNome || !nome.trim()}>
                {savingNome ? "A guardar..." : "Guardar nome"}
              </Button>
            </form>
          </Card>

          {/* Password */}
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="size-9 bg-orange-100 rounded-full flex items-center justify-center">
                <Lock className="size-5 text-orange-600" />
              </div>
              <div>
                <h2 className="font-semibold text-gray-900">Alterar password</h2>
                <p className="text-xs text-gray-500">Mínimo 6 caracteres</p>
              </div>
            </div>
            <form onSubmit={handleSavePassword} className="space-y-4">
              <div>
                <Label htmlFor="pw-atual">Password atual</Label>
                <Input
                  id="pw-atual"
                  type="password"
                  value={passwordAtual}
                  onChange={(e) => setPasswordAtual(e.target.value)}
                  className="mt-1"
                  autoComplete="current-password"
                  required
                />
              </div>
              <div>
                <Label htmlFor="pw-nova">Nova password</Label>
                <Input
                  id="pw-nova"
                  type="password"
                  value={novaPw}
                  onChange={(e) => setNovaPw(e.target.value)}
                  className="mt-1"
                  autoComplete="new-password"
                  required
                />
              </div>
              <div>
                <Label htmlFor="pw-confirmar">Confirmar nova password</Label>
                <Input
                  id="pw-confirmar"
                  type="password"
                  value={confirmarPw}
                  onChange={(e) => setConfirmarPw(e.target.value)}
                  className="mt-1"
                  autoComplete="new-password"
                  required
                />
                {novaPw && confirmarPw && novaPw !== confirmarPw && (
                  <p className="text-xs text-red-600 mt-1">As passwords não coincidem</p>
                )}
              </div>
              <Button
                type="submit"
                disabled={savingPw || !passwordAtual || !novaPw || novaPw !== confirmarPw}
              >
                {savingPw ? "A alterar..." : "Alterar password"}
              </Button>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}
