import { useEffect, useState } from "react";
import { apiGet } from "../lib/apiClient";
import type { PortfolioData } from "../components/portfolio/portfolio.types";

export function usePortfolio() {
  const [data, setData] = useState<PortfolioData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    apiGet<PortfolioData>("/api/portfolio/dashboard")
      .then((d) => {
        setData(d);
        setError(null);
      })
      .catch(() => {
        setError("Não foi possível carregar o portfólio. Verifica a tua sessão.");
      })
      .finally(() => setLoading(false));
  }, []);

  return { data, loading, error };
}
