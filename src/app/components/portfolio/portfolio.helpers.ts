import { formatMoney } from "../../lib/currency";

export function healthColor(status: string) {
  switch (status) {
    case "Excelente":
    case "Bom":
      return "bg-green-100 text-green-800";
    case "Atenção":
      return "bg-amber-100 text-amber-800";
    case "Crítico":
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-700";
  }
}

export function healthBarColor(status: string) {
  switch (status) {
    case "Excelente":
    case "Bom":
      return "#16a34a";
    case "Atenção":
      return "#d97706";
    case "Crítico":
      return "#dc2626";
    default:
      return "#9ca3af";
  }
}

export function priorityColor(priority: string) {
  switch (priority?.toLowerCase()) {
    case "alta":
      return "bg-red-100 text-red-800";
    case "média":
    case "media":
      return "bg-amber-100 text-amber-800";
    case "baixa":
      return "bg-green-100 text-green-800";
    default:
      return "bg-gray-100 text-gray-700";
  }
}

export function money(v: number) {
  return formatMoney(Number(v || 0));
}
