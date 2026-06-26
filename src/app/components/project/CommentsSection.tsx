import { useState } from "react";
import { Button } from "../ui/button";
import { Textarea } from "../ui/textarea";
import { Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { pt } from "date-fns/locale";
import { toast } from "sonner";
import { useAuth } from "../../contexts/AuthContext";
import { apiDelete, apiPost } from "../../lib/apiClient";

interface DbComment {
  id: number;
  projeto_id: number;
  user_nome: string;
  texto: string;
  criado_em: string;
}

interface CommentsSectionProps {
  projectId: string;
  initialComments?: DbComment[];
}

function getInitials(name: string) {
  return name.split(' ').slice(0, 2).map((w) => w[0]?.toUpperCase() || '').join('');
}

const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ec4899', '#6366f1'];
function colorFor(name: string) {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffffffff;
  return COLORS[Math.abs(h) % COLORS.length];
}

export function CommentsSection({ projectId, initialComments = [] }: CommentsSectionProps) {
  const { user } = useAuth();
  const [comments, setComments] = useState<DbComment[]>(initialComments);
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!text.trim()) return;
    setSubmitting(true);
    try {
      const raw = await apiPost<DbComment>(`/api/projects/${projectId}/comments`, { texto: text.trim() });
      setComments((prev) => [raw, ...prev]);
      setText('');
      toast.success('Comentário adicionado');
    } catch {
      toast.error('Erro ao adicionar comentário');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    setComments((prev) => prev.filter((c) => c.id !== id));
    try {
      await apiDelete<null>(`/api/comments/${id}`);
      toast.success('Comentário eliminado');
    } catch {
      toast.error('Erro ao eliminar comentário');
    }
  };

  return (
    <div className="space-y-6">
      {/* Input */}
      <div className="space-y-2">
        <Textarea
          placeholder="Escreva um comentário..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
        />
        <div className="flex justify-end">
          <Button onClick={handleSubmit} disabled={submitting || !text.trim()}>
            {submitting ? 'A guardar...' : 'Comentar'}
          </Button>
        </div>
      </div>

      {/* Lista */}
      {comments.length === 0 ? (
        <div className="text-center py-8 text-gray-400 text-sm">Sem comentários ainda. Seja o primeiro!</div>
      ) : (
        <div className="space-y-4">
          {comments.map((c) => (
            <div key={c.id} className="flex gap-3 group">
              <div
                className="size-9 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0"
                style={{ backgroundColor: colorFor(c.user_nome) }}
              >
                {getInitials(c.user_nome)}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-gray-900 text-sm">{c.user_nome}</span>
                  <span className="text-xs text-gray-400">
                    {formatDistanceToNow(new Date(c.criado_em), { addSuffix: true, locale: pt })}
                  </span>
                </div>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{c.texto}</p>
              </div>
              {(user?.nome === c.user_nome || user?.papel === 'admin') && (
                <button
                  onClick={() => handleDelete(c.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-600 mt-1"
                  title="Eliminar comentário"
                >
                  <Trash2 className="size-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
