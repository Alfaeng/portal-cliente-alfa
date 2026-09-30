import type { Metadata } from "next";
import { PaginaLegal } from "@/components/site/PaginaLegal";

export const metadata: Metadata = { title: "Termos de Uso · Alfa Engenharia" };

export default function TermosPage() {
  return (
    <PaginaLegal titulo="Termos de Uso">
      <h2>1. O que é o portal</h2>
      <p>
        O Portal do Cliente é um canal da Alfa Engenharia para você acompanhar o andamento da sua obra:
        avanço geral, etapas e fotos atualizadas.
      </p>

      <h2>2. Acesso</h2>
      <p>
        O acesso é pessoal e destinado ao cliente identificado no cadastro. Não compartilhe seu acesso nem
        as fotos e informações do portal com terceiros sem autorização.
      </p>

      <h2>3. Caráter informativo</h2>
      <p>
        As informações do portal têm caráter informativo e refletem o último lançamento feito pela equipe
        da Alfa. Elas não substituem o contrato, o cronograma contratual nem os comunicados oficiais.
        [PREENCHER: ajustar com o jurídico.]
      </p>

      <h2>4. Uso adequado</h2>
      <ul>
        <li>Não tentar acessar dados de outros clientes ou áreas restritas.</li>
        <li>Não usar meios automatizados para consultar o portal em massa.</li>
        <li>Não tentar burlar as proteções de segurança do sistema.</li>
      </ul>

      <h2>5. Conteúdo</h2>
      <p>
        As fotos, textos e a marca Alfa Engenharia pertencem à Alfa e não podem ser usados comercialmente
        sem autorização.
      </p>

      <h2>6. Disponibilidade</h2>
      <p>
        Fazemos o possível para manter o portal disponível, mas ele pode ficar indisponível para manutenção
        ou por causas fora do nosso controle.
      </p>

      <h2>7. Privacidade</h2>
      <p>
        O tratamento dos seus dados pessoais segue a nossa Política de Privacidade, disponível em{" "}
        <a href="/privacidade" className="text-navy underline">/privacidade</a>.
      </p>

      <h2>8. Lei aplicável</h2>
      <p>[PREENCHER: legislação e foro aplicáveis, definidos pelo jurídico.]</p>
    </PaginaLegal>
  );
}
