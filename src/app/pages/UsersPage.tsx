import { useState, useEffect } from "react";
import { Header } from "../components/layout/Header";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Badge } from "../components/ui/badge";
import { UserPlus, Mail, Copy, Check, Users, Clock, Send } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router";
import { apiGet, apiPost } from "../lib/apiClient";

interface DbUser {
  id: number;
  username: string;
  nome: string;
  papel: string;
  criado_em: string;
}

interface DbConvite {
  id: number;
  email: string;
  papel: string;
  criado_em: string;
  usado: number;
}

export function UsersPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [users, setUsers] = useState<DbUser[]>([]);
  const [invites, setInvites] = useState<DbConvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ email: "", papel: "membro" });
  const [sending, setSending] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [sendingDigest, setSendingDigest] = useState(false);

  const handleSendDigest = async () => {
    if (!confirm("Enviar digest semanal a todos os utilizadores?")) return;
    setSendingDigest(true);
    try {
      await apiPost<null>("/api/digest/send");
      toast.success("Digest enviado com sucesso!");
    } catch {
      toast.error("Erro ao enviar digest");
    } finally {
      setSendingDigest(false);
    }
  };

  useEffect(() => {
    if (user && user.papel !== "admin") {
      navigate("/");
      return;
    }
    Promise.all([
      apiGet<DbUser[]>("/api/auth/users").catch(() => []),
      apiGet<DbConvite[]>("/api/auth/invites").catch(() => []),
    ])
      .then(([u, i]) => {
        setUsers(u);
        setInvites(i);
      })
      .catch(() => toast.error("Erro ao carregar dados"))
      .finally(() => setLoading(false));
  }, [user, navigate]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email.trim()) return;
    setSending(true);
    try {
      const data = await apiPost<DbConvite>("/api/auth/invite", { email: form.email, papel: form.papel });
      setInvites((prev) => [data, ...prev]);
      setForm({ email: "", papel: "membro" });
      toast.success("Convite gerado! Copie o link abaixo.");
    } catch {
      toast.error("Erro ao gerar convite");
    } finally {
      setSending(false);
    }
  };

  const copyLink = (invite: DbConvite & { link?: string }) => {
    const link = invite.link || `${window.location.origin}/registo?token=${(invite as unknown as { token: string }).token}`;
    navigator.clipboard.writeText(link).then(() => {
      setCopiedId(invite.id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const formatDate = (s: string) =>
    new Date(s).toLocaleDateString("pt-PT", { day: "2-digit", month: "short", year: "numeric" });

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <p className="text-gray-400 text-sm">A carregar utilizadores...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-gray-50">
      <Header showBackButton />

      <div className="flex-1 min-h-0 overflow-auto p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">Gestão de Utilizadores</h1>
          <p className="text-gray-600 mt-1">Convidar membros e gerir acessos</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Formulário de convite */}
          <div className="lg:col-span-1">
            <Card className="p-6">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <UserPlus className="size-4" />
                Convidar Membro
              </h3>
              <form onSubmit={handleInvite} className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <Input
                    type="email"
                    required
                    placeholder="email@exemplo.com"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Papel</label>
                  <Select value={form.papel} onValueChange={(v) => setForm({ ...form, papel: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="membro">Membro</SelectItem>
                      <SelectItem value="admin">Administrador</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="w-full" disabled={sending}>
                  <Mail className="size-4 mr-2" />
                  {sending ? "A gerar..." : "Gerar convite"}
                </Button>
              </form>
            </Card>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3 mt-4">
              <Card className="p-4 text-center">
                <div className="text-2xl font-bold text-gray-900">{users.length}</div>
                <div className="text-xs text-gray-500 mt-1">Utilizadores</div>
              </Card>
              <Card className="p-4 text-center">
                <div className="text-2xl font-bold text-gray-900">
                  {invites.filter((i) => !i.usado).length}
                </div>
                <div className="text-xs text-gray-500 mt-1">Convites pendentes</div>
              </Card>
            </div>

            {/* Digest button */}
            <Card className="p-4 mt-4">
              <h4 className="text-sm font-semibold text-gray-900 mb-2">Digest Semanal</h4>
              <p className="text-xs text-gray-500 mb-3">
                Envia um resumo de projetos, tarefas em atraso e milestones próximos a todos os utilizadores.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={handleSendDigest}
                disabled={sendingDigest}
              >
                <Send className="size-4 mr-2" />
                {sendingDigest ? "A enviar..." : "Enviar Digest"}
              </Button>
            </Card>
          </div>

          {/* Utilizadores + Convites */}
          <div className="lg:col-span-2 space-y-6">
            {/* Lista de utilizadores */}
            <Card className="p-6">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Users className="size-4" />
                Utilizadores ({users.length})
              </h3>
              {users.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-4">Sem utilizadores</p>
              ) : (
                <div className="divide-y divide-gray-100">
                  {users.map((u) => (
                    <div key={u.id} className="flex items-center justify-between py-3">
                      <div>
                        <div className="font-medium text-gray-900">{u.nome}</div>
                        <div className="text-sm text-gray-500">@{u.username} · {formatDate(u.criado_em)}</div>
                      </div>
                      <Badge variant={u.papel === "admin" ? "default" : "secondary"}>
                        {u.papel}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Convites */}
            <Card className="p-6">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Clock className="size-4" />
                Convites Gerados
              </h3>
              {invites.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-4">Nenhum convite gerado ainda</p>
              ) : (
                <div className="divide-y divide-gray-100">
                  {invites.map((inv) => (
                    <div key={inv.id} className="flex items-center justify-between py-3">
                      <div>
                        <div className="font-medium text-gray-900">{inv.email}</div>
                        <div className="text-sm text-gray-500">
                          Papel: {inv.papel} · {formatDate(inv.criado_em)}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={inv.usado ? "secondary" : "outline"}>
                          {inv.usado ? "Usado" : "Pendente"}
                        </Badge>
                        {!inv.usado && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => copyLink(inv as DbConvite & { link?: string })}
                            title="Copiar link de convite"
                          >
                            {copiedId === inv.id ? (
                              <Check className="size-4 text-green-600" />
                            ) : (
                              <Copy className="size-4" />
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
