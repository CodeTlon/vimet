import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Política de privacidad' }

const LAST_UPDATE = '10 de mayo de 2026'

export default function PrivacidadPage() {
  return (
    <main className="bg-white min-h-screen pt-28 pb-20">
      <div className="container-vimet max-w-3xl">
        <p className="text-xs text-gray-400 uppercase tracking-wider mb-3">Legal</p>
        <h1 className="font-heading text-3xl sm:text-4xl font-extrabold text-gray-900 mb-2">
          Política de privacidad
        </h1>
        <p className="text-sm text-gray-400 mb-10">Última actualización: {LAST_UPDATE}</p>

        <div className="prose prose-gray max-w-none text-gray-700 leading-relaxed space-y-8">

          <section>
            <h2 className="font-heading text-xl font-semibold text-gray-900 mb-3">1. Responsable del tratamiento</h2>
            <p>
              Los datos personales recopilados a través de este sitio son tratados por <strong>VIMET — Vida y Metabolismo</strong>,
              integrado por Avril Jerushalmi (nutricionista) y Gerónimo Gallardo (entrenador), con sede en
              Instituto VIANETT, Av. Pedro Simón Laplace 5573, Córdoba, Argentina.
              Podés contactarnos en cualquier momento a través del formulario en{' '}
              <a href="/contacto" className="text-vimet-orange hover:underline">/contacto</a>.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold text-gray-900 mb-3">2. Datos que recopilamos</h2>
            <p>Según el tipo de interacción, podemos recopilar:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li><strong>Datos de contacto:</strong> nombre, apellido, email, teléfono.</li>
              <li><strong>Datos de salud:</strong> historia clínica, diagnósticos, medicación, mediciones antropométricas, evaluaciones funcionales y evolución del proceso, ingresados por el profesional tratante.</li>
              <li><strong>Datos de uso:</strong> información técnica del dispositivo y navegación (mediante cookies de sesión estrictamente necesarias para el funcionamiento del sistema).</li>
            </ul>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold text-gray-900 mb-3">3. Finalidad del tratamiento</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Brindar los servicios de nutrición y entrenamiento contratados.</li>
              <li>Gestionar turnos y seguimiento clínico del paciente.</li>
              <li>Enviar comunicaciones relacionadas con el servicio (recordatorios, respuestas a consultas).</li>
              <li>Cumplir obligaciones legales y profesionales.</li>
            </ul>
            <p className="mt-3">
              No utilizamos tus datos para fines publicitarios de terceros ni los vendemos bajo ninguna circunstancia.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold text-gray-900 mb-3">4. Base legal</h2>
            <p>
              El tratamiento se basa en el <strong>consentimiento del titular</strong> al registrarse y utilizar el servicio,
              y en la <strong>ejecución del contrato</strong> de prestación de servicios de salud.
              Los datos de salud son tratados bajo secreto profesional conforme a la legislación vigente en Argentina.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold text-gray-900 mb-3">5. Almacenamiento y seguridad</h2>
            <p>
              Los datos se almacenan en <strong>Supabase</strong> (infraestructura en la nube con cifrado en tránsito y en reposo),
              desplegados mediante <strong>Vercel</strong>. Las comunicaciones de contacto se procesan a través de <strong>Resend</strong>.
              Estos proveedores cumplen estándares internacionales de seguridad (SOC 2, ISO 27001).
            </p>
            <p className="mt-2">
              Los datos de salud se conservan mientras la relación profesional esté activa y por un período mínimo de
              5 años posterior al último contacto, conforme a la normativa sanitaria argentina.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold text-gray-900 mb-3">6. Tus derechos</h2>
            <p>
              De acuerdo con la <strong>Ley 25.326 de Protección de Datos Personales</strong> (Argentina), tenés derecho a:
            </p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li><strong>Acceso:</strong> solicitar qué datos tenemos sobre vos.</li>
              <li><strong>Rectificación:</strong> corregir datos inexactos o incompletos.</li>
              <li><strong>Cancelación:</strong> solicitar la eliminación de tus datos cuando ya no sean necesarios.</li>
              <li><strong>Oposición:</strong> oponerte al tratamiento en determinadas circunstancias.</li>
            </ul>
            <p className="mt-3">
              Para ejercer cualquiera de estos derechos, contactanos a través de{' '}
              <a href="/contacto" className="text-vimet-orange hover:underline">nuestro formulario</a>.
              Responderemos en un plazo máximo de 30 días hábiles.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold text-gray-900 mb-3">7. Cambios en esta política</h2>
            <p>
              Podemos actualizar esta política periódicamente. Cualquier cambio significativo será notificado
              a los usuarios registrados por email. La versión vigente siempre estará disponible en esta página.
            </p>
          </section>

        </div>
      </div>
    </main>
  )
}
