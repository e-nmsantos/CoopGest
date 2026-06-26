import { useState } from "react";
import { Card } from "../ui/card";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { 
  Building2, 
  Mail, 
  Phone, 
  MapPin, 
  User, 
  ExternalLink,
  MessageCircle 
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";

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

interface PartnerCardProps {
  partner: Partner;
}

const typeColors: Record<string, string> = {
  Cooperativa: "bg-green-100 text-green-700",
  ONG: "bg-blue-100 text-blue-700",
  Universidade: "bg-purple-100 text-purple-700",
  Empresa: "bg-orange-100 text-orange-700",
  Governo: "bg-red-100 text-red-700",
  Associação: "bg-pink-100 text-pink-700",
};

const countryFlags: Record<string, string> = {
  Portugal: "🇵🇹",
  Espanha: "🇪🇸",
  França: "🇫🇷",
  Alemanha: "🇩🇪",
  Itália: "🇮🇹",
  Bélgica: "🇧🇪",
};

export function PartnerCard({ partner }: PartnerCardProps) {
  const [open, setOpen] = useState(false);

  return (
    <Card className="p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="size-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
            <Building2 className="size-6 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{partner.name}</h3>
            <div className="flex items-center gap-2 mt-1">
              <Badge className={typeColors[partner.type] || "bg-gray-100 text-gray-700"}>
                {partner.type}
              </Badge>
              <span className="text-sm text-gray-500">
                {countryFlags[partner.country] || "🌍"} {partner.country}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Role */}
      {partner.role && (
        <div className="mb-4 p-3 bg-blue-50 rounded-lg">
          <p className="text-sm font-medium text-blue-900">{partner.role}</p>
        </div>
      )}

      {/* Contact Info */}
      <div className="space-y-2 mb-4">
        {partner.contactPerson && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <User className="size-4 text-gray-400" />
            <span>{partner.contactPerson}</span>
          </div>
        )}
        {partner.email && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Mail className="size-4 text-gray-400" />
            <a href={`mailto:${partner.email}`} className="hover:text-blue-600 transition-colors">
              {partner.email}
            </a>
          </div>
        )}
        {partner.phone && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Phone className="size-4 text-gray-400" />
            <a href={`tel:${partner.phone}`} className="hover:text-blue-600 transition-colors">
              {partner.phone}
            </a>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-4 border-t">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="flex-1">
              <ExternalLink className="size-4 mr-2" />
              Ver Detalhes
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3">
                <div className="size-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <Building2 className="size-5 text-white" />
                </div>
                {partner.name}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge className={typeColors[partner.type] || "bg-gray-100 text-gray-700"}>
                  {partner.type}
                </Badge>
                <span className="text-sm text-gray-500">
                  {countryFlags[partner.country] || "🌍"} {partner.country}
                </span>
              </div>

              {partner.role && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Papel no Projeto</h4>
                  <p className="text-gray-700 bg-blue-50 p-3 rounded-lg">{partner.role}</p>
                </div>
              )}

              {partner.contribution && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">
                    Contribuição / Responsabilidades
                  </h4>
                  <p className="text-gray-700">{partner.contribution}</p>
                </div>
              )}

              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Informações de Contacto</h4>
                <div className="space-y-2 bg-gray-50 p-4 rounded-lg">
                  {partner.contactPerson && (
                    <div className="flex items-center gap-2">
                      <User className="size-4 text-gray-500" />
                      <span className="text-gray-700">{partner.contactPerson}</span>
                    </div>
                  )}
                  {partner.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="size-4 text-gray-500" />
                      <a
                        href={`mailto:${partner.email}`}
                        className="text-blue-600 hover:underline"
                      >
                        {partner.email}
                      </a>
                    </div>
                  )}
                  {partner.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="size-4 text-gray-500" />
                      <a
                        href={`tel:${partner.phone}`}
                        className="text-blue-600 hover:underline"
                      >
                        {partner.phone}
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        <Button variant="outline" size="sm">
          <MessageCircle className="size-4" />
        </Button>
      </div>
    </Card>
  );
}