import { Card } from "../ui/card";
import { PartnerCard } from "./PartnerCard";

interface Partner {
  id: string;
  name: string;
  type: string;
  country: string;
  contactPerson: string;
  email: string;
  phone: string;
  role: string;
  contribution: string;
  logo?: string;
}

interface PartnersSectionProps {
  partners: Partner[];
}

export function PartnersSection({ partners }: PartnersSectionProps) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold text-gray-900">
          Parceiros do Projeto ({partners.length})
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          Organizações e instituições parceiras neste projeto
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="text-sm text-gray-600">Total de Parceiros</div>
          <div className="text-2xl font-bold text-gray-900">{partners.length}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-gray-600">Cooperativas</div>
          <div className="text-2xl font-bold text-green-600">
            {partners.filter((p) => p.type === "Cooperativa").length}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-gray-600">Universidades</div>
          <div className="text-2xl font-bold text-purple-600">
            {partners.filter((p) => p.type === "Universidade").length}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-gray-600">ONGs</div>
          <div className="text-2xl font-bold text-blue-600">
            {partners.filter((p) => p.type === "ONG").length}
          </div>
        </Card>
      </div>

      {/* Partners Grid */}
      {partners.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-gray-500">Nenhum parceiro associado a este projeto</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {partners.map((partner) => (
            <PartnerCard key={partner.id} partner={partner} />
          ))}
        </div>
      )}
    </div>
  );
}
