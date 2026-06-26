import os
import sys
from datetime import timedelta

PACKAGE_DIR = os.path.dirname(__file__)
PROJECT_ROOT = os.path.dirname(PACKAGE_DIR)
DATA_DIR = os.path.dirname(sys.executable) if getattr(sys, "frozen", False) else PROJECT_ROOT

DB_PATH = os.environ.get("DB_PATH") or os.path.join(
    DATA_DIR,
    "projetos.db",
)

UPLOAD_FOLDER = os.path.join(os.path.dirname(DB_PATH), "uploads")
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

MAX_BACKUP_FILE_BYTES = int(os.environ.get("MAX_BACKUP_FILE_BYTES", 25 * 1024 * 1024))
MAX_BACKUP_TOTAL_BYTES = int(os.environ.get("MAX_BACKUP_TOTAL_BYTES", 100 * 1024 * 1024))
MAX_CONTENT_LENGTH = int(os.environ.get("MAX_CONTENT_LENGTH", 25 * 1024 * 1024))

ALLOWED_UPLOAD_EXTENSIONS = {
    "pdf", "doc", "docx", "jpg", "jpeg", "png", "gif", "webp", "xls", "xlsx", "csv",
    "txt", "md", "odt", "ods", "odp",
}

VALID_PROJECT_STATUS = {"Em curso", "Planeamento", "Concluído", "Suspenso"}
VALID_IMPACT_CATEGORIES = {"social", "ambiental", "economico"}
VALID_SKILL_CATEGORIES = {"técnica", "gestão", "comunicação", "especializada"}
VALID_SKILL_LEVELS = {1, 2, 3, 4, 5}
VALID_TASK_STATES = {"Por fazer", "Em curso", "Concluída"}
VALID_PARTNER_TYPES = {"Cooperativa", "ONG", "Universidade", "Empresa", "Governo", "Associação"}

SKILL_MEMBER_COLORS = ["#3b82f6", "#8b5cf6", "#10b981", "#f59e0b", "#ec4899", "#6366f1"]
DEFAULT_PROJECT_SKILLS = [
    ("Gestão de Projetos", "gestão"),
    ("Facilitação de Reuniões", "gestão"),
    ("Design Gráfico", "técnica"),
    ("Desenvolvimento Web", "técnica"),
    ("Comunicação Social", "comunicação"),
    ("Redação de Propostas", "comunicação"),
    ("Economia Circular", "especializada"),
    ("Permacultura", "especializada"),
]

KANBAN_ESTADO_MAP = {"todo": "Por fazer", "doing": "Em curso", "done": "Concluída"}
KANBAN_ESTADO_REVERSE = {v: k for k, v in KANBAN_ESTADO_MAP.items()}
KANBAN_PRIORITY_MAP = {"urgent": "Urgente", "high": "Alta", "medium": "Normal", "low": "Baixa"}
KANBAN_PRIORITY_REVERSE = {v: k for k, v in KANBAN_PRIORITY_MAP.items()}

PROJECT_ROLE_RANK = {
    "leitor": 1,
    "membro": 2,
    "gestor": 3,
}

