import { useState, useEffect, useCallback } from "react";
import { Header } from "../components/layout/Header";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Skeleton } from "../components/ui/skeleton";
import { Bell, BellOff, CheckCheck, Info, AlertTriangle, CheckCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { pt } from "date-fns/locale";
import { toast } from "sonner";
import { apiGet, apiPatch, apiPost } from "../lib/apiClient";

interface Notification {
  id: number;
  destinatario: string;
  assunto: string;
  mensagem: string;
  estado: string;
  criado_em: string;
}

interface NotificationsResponse {
  items?: Notification[];
  unread_count?: number;
}

function notificationIcon(assunto: string) {
  const lower = assunto.toLowerCase();
  if (lower.includes("erro") || lower.includes("falha") || lower.includes("avis")) {
    return <AlertTriangle className="size-5 text-amber-500" />;
  }
  if (lower.includes("conclu") || lower.includes("aprovad") || lower.includes("sucesso")) {
    return <CheckCircle className="size-5 text-green-500" />;
  }
  return <Info className="size-5 text-blue-500" />;
}

export function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    apiGet<NotificationsResponse | Notification[]>("/api/notifications")
      .then((data) => {
        // Backend may return { items: [...], unread_count: N } or a plain array
        if (Array.isArray(data)) {
          setNotifications(data);
        } else {
          setNotifications(data.items ?? []);
        }
      })
      .catch(() => toast.error("Erro ao carregar notificações"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const markOneRead = async (n: Notification) => {
    if (n.estado === "lido") return;
    try {
      await apiPatch<null>(`/api/notifications/${n.id}/read`);
      setNotifications((prev) =>
        prev.map((item) => (item.id === n.id ? { ...item, estado: "lido" } : item))
      );
    } catch {
      toast.error("Erro ao marcar notificação como lida");
    }
  };

  const markAllRead = async () => {
    setMarkingAll(true);
    try {
      // POST /api/notifications/mark-all-read
      await apiPost<null>("/api/notifications/mark-all-read");
      setNotifications((prev) => prev.map((n) => ({ ...n, estado: "lido" })));
      toast.success("Todas as notificações marcadas como lidas");
    } catch {
      toast.error("Erro ao marcar todas como lidas");
    } finally {
      setMarkingAll(false);
    }
  };

  const unreadCount = notifications.filter((n) => n.estado !== "lido").length;

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-gray-50">
      <Header />

      <div className="flex-1 min-h-0 overflow-auto p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
              <Bell className="size-6" />
              Notificações
            </h1>
            <p className="text-gray-600 mt-1">
              {unreadCount > 0
                ? `${unreadCount} notificação${unreadCount !== 1 ? "ões" : ""} não lida${unreadCount !== 1 ? "s" : ""}`
                : "Todas as notificações lidas"}
            </p>
          </div>
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={markAllRead}
              disabled={markingAll}
              className="gap-2"
            >
              <CheckCheck className="size-4" />
              {markingAll ? "A marcar..." : "Marcar todas como lidas"}
            </Button>
          )}
        </div>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Card key={i} className="p-4">
                <div className="flex items-start gap-3">
                  <Skeleton className="size-8 rounded-full shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-3 w-2/3" />
                    <Skeleton className="h-3 w-1/4" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <Card className="p-12 text-center">
            <BellOff className="size-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">Sem notificações</p>
            <p className="text-gray-400 text-sm mt-1">Quando houver actividade, as notificações aparecem aqui.</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {notifications.map((n) => {
              const isUnread = n.estado !== "lido";
              return (
                <Card
                  key={n.id}
                  className={`p-4 cursor-pointer transition-colors hover:bg-gray-50 ${
                    isUnread ? "border-blue-200 bg-blue-50/40" : "bg-white"
                  }`}
                  onClick={() => void markOneRead(n)}
                >
                  <div className="flex items-start gap-3">
                    <div className="shrink-0 mt-0.5">{notificationIcon(n.assunto)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {isUnread && (
                          <span className="size-2 bg-blue-500 rounded-full shrink-0" />
                        )}
                        <span
                          className={`text-sm font-medium truncate ${
                            isUnread ? "text-gray-900" : "text-gray-600"
                          }`}
                        >
                          {n.assunto}
                        </span>
                      </div>
                      {n.mensagem && (
                        <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{n.mensagem}</p>
                      )}
                      <span className="text-xs text-gray-400 mt-1 block">
                        {formatDistanceToNow(new Date(n.criado_em), { addSuffix: true, locale: pt })}
                      </span>
                    </div>
                    {isUnread && (
                      <span className="text-xs text-blue-600 shrink-0 whitespace-nowrap self-center">
                        Clique para marcar
                      </span>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
