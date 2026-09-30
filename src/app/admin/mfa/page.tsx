import Image from "next/image";
import { ALFA_LOGO_URL } from "@/lib/site-content";
import { MfaForm } from "@/components/admin/MfaForm";

export default function AdminMfaPage() {
  return (
    <div className="min-h-[70vh] bg-[#EDEFF2] py-11">
      <div className="wrap max-w-[430px] mx-auto">
        <div className="text-center mb-8">
          <span className="inline-flex items-center justify-center rounded bg-navy px-3 py-2">
            <Image src={ALFA_LOGO_URL} alt="Alfa Engenharia" width={90} height={24} className="h-5 w-auto" unoptimized />
          </span>
          <div className="font-jost text-[10px] tracking-[.24em] uppercase text-muted mt-2.5">
            Verificação em duas etapas
          </div>
        </div>
        <MfaForm />
      </div>
    </div>
  );
}
