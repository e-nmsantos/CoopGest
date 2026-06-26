import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Plus } from "lucide-react";

interface AddPartnerDialogProps {
  onAddPartner: (partner: {
    name: string;
    type: string;
    country: string;
    contactPerson: string;
    email: string;
    phone: string;
    role: string;
    contribution: string;
  }) => void;
}

export function AddPartnerDialog({ onAddPartner }: AddPartnerDialogProps) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    type: "Cooperativa",
    country: "Portugal",
    contactPerson: "",
    email: "",
    phone: "",
    role: "",
    contribution: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAddPartner(formData);
    setFormData({
      name: "",
      type: "Cooperativa",
      country: "Portugal",
      contactPerson: "",
      email: "",
      phone: "",
      role: "",
      contribution: "",
    });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="size-4 mr-2" />
          Adicionar Parceiro
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Adicionar Novo Parceiro</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label htmlFor="name">Nome da Organização *</Label>
              <Input
                id="name"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Cooperativa Verde"
              />
            </div>

            <div>
              <Label htmlFor="type">Tipo de Organização</Label>
              <Select
                value={formData.type}
                onValueChange={(value) => setFormData({ ...formData, type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Cooperativa">Cooperativa</SelectItem>
                  <SelectItem value="ONG">ONG</SelectItem>
                  <SelectItem value="Universidade">Universidade</SelectItem>
                  <SelectItem value="Empresa">Empresa</SelectItem>
                  <SelectItem value="Governo">Governo</SelectItem>
                  <SelectItem value="Associação">Associação</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="country">País</Label>
              <Input
                id="country"
                value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="contactPerson">Pessoa de Contacto</Label>
              <Input
                id="contactPerson"
                value={formData.contactPerson}
                onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                placeholder="Nome completo"
              />
            </div>

            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="email@exemplo.com"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="phone">Telefone</Label>
            <Input
              id="phone"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="+351 XXX XXX XXX"
            />
          </div>

          <div>
            <Label htmlFor="role">Papel no Projeto</Label>
            <Input
              id="role"
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              placeholder="Ex: Coordenador técnico, Formador, etc."
            />
          </div>

          <div>
            <Label htmlFor="contribution">Contribuição / Responsabilidades</Label>
            <Textarea
              id="contribution"
              value={formData.contribution}
              onChange={(e) => setFormData({ ...formData, contribution: e.target.value })}
              placeholder="Descreva as principais contribuições deste parceiro..."
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit">Adicionar Parceiro</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
