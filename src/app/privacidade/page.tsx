import type { Metadata } from "next";
import { PaginaLegal } from "@/components/site/PaginaLegal";

export const metadata: Metadata = { title: "Política de Privacidade · Alfa Engenharia" };

export default function PrivacidadePage() {
  return (
    <PaginaLegal titulo="Política de Privacidade">
      <p>
        Esta política explica, em linguagem simples, quais dados pessoais o Portal do Cliente da Alfa
        Engenharia usa, para quê, por quanto tempo e quais são os seus direitos, conforme a Lei Geral de
        Proteção de Dados (Lei nº 13.709/2018, a LGPD).
      </p>

      <h2>1. Quem é o responsável pelos seus dados</h2>
      <p>
        [PREENCHER: razão social, CNPJ e endereço da Alfa Engenharia]. Encarregado pelo tratamento de
        dados pessoais (DPO): [PREENCHER: nome e e-mail].
      </p>

      <h2>2. Quais dados coletamos</h2>
      <ul>
        <li>Nome, CPF, e-mail e telefone, informados no seu contrato e importados do sistema de gestão da Alfa.</li>
        <li>Respostas que você der às pesquisas de satisfação (a participação é voluntária).</li>
        <li>Data e versão do aceite desta política.</li>
        <li>Um cookie de sessão, essencial para você continuar conectado enquanto navega.</li>
      </ul>
      <p>
        Nenhum dado financeiro nem dado do seu contrato é exibido ou guardado no portal. O CPF é guardado
        apenas de forma protegida (transformado em um código que não pode ser revertido) e é exibido à
        equipe somente de forma parcial.
      </p>

      <h2>3. Para que usamos seus dados</h2>
      <ul>
        <li>Confirmar que você é cliente e liberar o acompanhamento da sua obra.</li>
        <li>Mostrar somente os empreendimentos ligados ao seu cadastro.</li>
        <li>Avaliar a satisfação com o atendimento e a obra, para melhorarmos nosso serviço.</li>
        <li>Cumprir obrigações legais e proteger o portal contra acessos indevidos.</li>
      </ul>

      <h2>4. Base legal</h2>
      <p>
        [PREENCHER, com o jurídico: por exemplo, execução de contrato (art. 7º, V) para o acesso ao
        acompanhamento da obra; legítimo interesse (art. 7º, IX) para as pesquisas de satisfação e para a
        segurança do portal].
      </p>

      <h2>5. Com quem compartilhamos</h2>
      <p>
        Não vendemos seus dados. Usamos fornecedores de tecnologia para hospedar o portal e guardar as
        informações, sob contrato: Supabase (banco de dados e arquivos) e Vercel (hospedagem do site).
        [PREENCHER: confirmar regiões dos servidores e cláusulas de proteção de dados de cada fornecedor.]
      </p>

      <h2>6. Por quanto tempo guardamos</h2>
      <p>
        [PREENCHER: prazo de retenção, por exemplo enquanto durar o relacionamento contratual e pelo prazo
        legal aplicável depois dele]. Passado o prazo, os dados são eliminados ou anonimizados. As
        respostas de pesquisa podem ser mantidas sem identificação.
      </p>

      <h2>7. Seus direitos</h2>
      <p>Você pode, a qualquer momento, pedir:</p>
      <ul>
        <li>confirmação de que tratamos seus dados e acesso a uma cópia deles;</li>
        <li>correção de dados incompletos ou desatualizados;</li>
        <li>eliminação de dados tratados com base no seu consentimento ou que sejam desnecessários;</li>
        <li>informação sobre com quem compartilhamos seus dados;</li>
        <li>revisão de decisões tomadas de forma automatizada, se houver.</li>
      </ul>
      <p>Para exercer seus direitos, escreva para [PREENCHER: e-mail do encarregado]. Respondemos no prazo da lei.</p>

      <h2>8. Como protegemos seus dados</h2>
      <ul>
        <li>Conexão criptografada (HTTPS) em todo o portal.</li>
        <li>CPF guardado de forma protegida e nunca exibido por inteiro.</li>
        <li>Cada cliente vê apenas as próprias obras.</li>
        <li>Acesso da equipe por perfis, com registro de quem consultou ou alterou dados pessoais.</li>
        <li>Cópias de segurança e monitoramento do serviço.</li>
      </ul>

      <h2>9. Mudanças nesta política</h2>
      <p>
        Se o texto mudar de forma relevante, atualizamos a versão acima e pedimos que você tome ciência
        novamente no próximo acesso.
      </p>
    </PaginaLegal>
  );
}
