import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Términos y condiciones' }

const LAST_UPDATE = '10 de mayo de 2026'

export default function TerminosPage() {
  return (
    <main className="bg-white min-h-screen pt-28 pb-20">
      <div className="container-vimet max-w-3xl">
        <p className="text-xs text-gray-400 uppercase tracking-wider mb-3">Legal</p>
        <h1 className="font-heading text-3xl sm:text-4xl font-extrabold text-gray-900 mb-2">
          Términos y condiciones
        </h1>
        <p className="text-sm text-gray-400 mb-10">Última actualización: {LAST_UPDATE}</p>

        <div className="prose prose-gray max-w-none text-gray-700 leading-relaxed space-y-8">

          <section>
            <h2 className="font-heading text-xl font-semibold text-gray-900 mb-3">1. Aceptación</h2>
            <p>
              Al registrarte y utilizar los servicios de <strong>VIMET — Vida y Metabolismo</strong>, aceptás
              los presentes términos en su totalidad. Si no estás de acuerdo con alguno de ellos,
              te pedimos que no utilices la plataforma.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold text-gray-900 mb-3">2. Descripción del servicio</h2>
            <p>
              VIMET ofrece servicios profesionales de <strong>nutrición</strong> (a cargo de Avril Jerushalmi, Lic. en Nutrición)
              y <strong>entrenamiento físico</strong> (a cargo de Gerónimo Gallardo, entrenador) de forma presencial en Córdoba
              y virtual para cualquier ubicación.
            </p>
            <p className="mt-2">
              Los servicios incluyen evaluación inicial, plan personalizado, seguimiento periódico y acceso
              a un área privada con ficha clínica, planes y evolución.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold text-gray-900 mb-3">3. No reemplaza la atención médica</h2>
            <p>
              Los servicios de VIMET son complementarios al tratamiento médico y <strong>no reemplazan ni
              sustituyen el diagnóstico, prescripción o seguimiento de un médico</strong>.
              Los ajustes de medicación, estudios de laboratorio y decisiones clínicas son responsabilidad
              exclusiva del médico tratante.
            </p>
            <p className="mt-2">
              Casos que requieren derivación (niños menores de 13 años, obesidad mórbida con IMC &gt; 40,
              parámetros de laboratorio extremadamente alterados, indicios de TCA) serán referidos
              al profesional correspondiente.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold text-gray-900 mb-3">4. Obligaciones del paciente</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Brindar información veraz y completa sobre su estado de salud.</li>
              <li>Informar cualquier cambio relevante en su condición médica, medicación o estudios.</li>
              <li>Seguir las indicaciones bajo su propia responsabilidad y criterio, en conjunto con su equipo médico.</li>
              <li>Mantener la confidencialidad de sus credenciales de acceso.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold text-gray-900 mb-3">5. Turnos, cancelaciones y señas</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>La reserva de turnos puede requerir el pago de una seña para confirmar el horario.</li>
              <li>Las cancelaciones y reprogramaciones deben realizarse con al menos 24 horas de anticipación a través de WhatsApp.</li>
              <li>Las cancelaciones fuera de plazo o las inasistencias sin aviso pueden implicar la pérdida de la seña abonada.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold text-gray-900 mb-3">6. Formas de pago</h2>
            <p>
              Los servicios se abonan mediante transferencia bancaria o efectivo. Los montos y modalidades
              se informan al momento de acordar el plan. VIMET se reserva el derecho de actualizar los
              aranceles con previo aviso.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold text-gray-900 mb-3">7. Propiedad intelectual</h2>
            <p>
              Los planes nutricionales, rutinas de entrenamiento y demás materiales elaborados por los
              profesionales de VIMET son de uso exclusivo del paciente para quien fueron diseñados.
              Queda prohibida su reproducción, distribución o comercialización sin autorización expresa.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold text-gray-900 mb-3">8. Limitación de responsabilidad</h2>
            <p>
              VIMET no se responsabiliza por resultados específicos, ya que estos dependen del seguimiento
              del plan, el estado de salud individual y factores externos. El compromiso del equipo es
              brindar el mejor acompañamiento profesional posible dentro de su área de competencia.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold text-gray-900 mb-3">9. Legislación aplicable</h2>
            <p>
              Estos términos se rigen por las leyes de la República Argentina. Cualquier controversia
              será sometida a la jurisdicción de los tribunales ordinarios de la ciudad de Córdoba.
            </p>
          </section>

        </div>
      </div>
    </main>
  )
}
