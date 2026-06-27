import { useState, useEffect, useCallback } from "react";
import { Bell } from "lucide-react";
import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { formatDistanceToNow } from "date-fns";
import { pt } from "date-fns/locale";
import { Link } from "react-router";
import { apiGet, apiPatch } from "../../lib/apiClient";

interface Notification {
  id: number;
  destinatario: string;
  assunto: string;
  mensagem: string;
  estado: string;
  criado_em: string;
}

export function NotificationBell() {
  const [items, setItems] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const load = useCallback(() => {
    apiGet<{ items?: Notification[]; unread_count?: number }>("/api/notifications")
      .then((data) => {
        setItems(data.items || []);
        setUnreadCount(data.unread_count || 0);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 60_000);
    return () => clearInterval(interval);
  }, [load]);

  const markAllRead = async () => {
    await apiPatch<null>("/api/notifications/read-all");
    setUnreadCount(0);
    setItems((prev) => prev.map((n) => ({ ...n, estado: "lido" })));
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="relative">
          <Bell className="size-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 size-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notificações</span>
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="text-xs text-blue-600 hover:underline font-normal"
            >
              Marcar como lidas
            </button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {items.length === 0 ? (
          <div className="px-3 py-4 text-sm text-gray-400 text-center">Sem notificações</div>
        ) : (
          items.slice(0, 10).map((n) => (
            <DropdownMenuItem key={n.id} className="flex flex-col items-start gap-0.5 py-2 cursor-default">
              <div className="flex items-center gap-2 w-full">
                {n.estado !== 'lido' && (
                  <span className="size-2 bg-blue-500 rounded-full shrink-0" />
                )}
                <span className={`text-sm font-medium truncate flex-1 ${n.estado !== 'lido' ? '' : 'text-gray-500 font-normal'}`}>
                  {n.assunto}
                </span>
              </div>
              <span className="text-xs text-gray-400 ml-4">
                {formatDistanceToNow(new Date(n.criado_em), { addSuffix: true, locale: pt })}
              </span>
            </DropdownMenuItem>
          ))
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link
            to="/notificacoes"
            className="w-full text-center text-xs text-blue-600 hover:text-blue-800 py-1 justify-center"
          >
            Ver todas as notificações
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
