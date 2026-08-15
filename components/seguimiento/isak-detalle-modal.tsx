'use client'

import { useState } from 'react'

import { Modal } from '@/components/ui/modal'
import {
  clasificarImo,
  formatearFechaCorta,
  imo,
  isakCompleto,
  perimetrosCorregidos,
  sumaPliegues6,
  sumaPliegues8,
  type MedicionIsakRaw,
} from '@/lib/seguimiento'

type Medicion = MedicionIsakRaw & { fecha_medicion: string }

// Badge que abre el detalle de solo lectura de una evaluación ISAK puntual
// del histórico — hoy esos 13 campos solo se podían ver abriendo "Editar",
// mezclando lectura con edición.
export function IsakDetalleModal({ medicion }: { medicion: Medicion }) {
  const [open, setOpen] = useState(false)

  if (!isakCompleto(medicion)) {
    return <span className="text-gray-400">—</span>
  }

  const s6 = sumaPliegues6(medicion)
  const s8 = sumaPliegues8(medicion)
  const corregidos = perimetrosCorregidos(medicion)
  const imoValor = imo(medicion.kg_tejido_muscular, medicion.kg_tejido_oseo)
  const clasif = clasificarImo(imoValor)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs font-medium px-2 py-0.5 rounded-full border text-blue-700 bg-blue-50 border-blue-200 hover:bg-blue-100"
      >
        ISAK
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={`Datos ISAK — ${formatearFechaCorta(medicion.fecha_medicion)}`}
      >
        <div className="space-y-4">
          <Grupo titulo="Pliegues cutáneos (mm)">
            <Dato label="Tríceps" value={medicion.pliegue_triceps_mm} />
            <Dato label="Subescapular" value={medicion.pliegue_subescapular_mm} />
            <Dato label="Bíceps" value={medicion.pliegue_biceps_mm} />
            <Dato label="Cresta ilíaca" value={medicion.pliegue_cresta_iliaca_mm} />
            <Dato label="Supraespinal" value={medicion.pliegue_supraespinal_mm} />
            <Dato label="Abdominal" value={medicion.pliegue_abdominal_mm} />
            <Dato label="Muslo" value={medicion.pliegue_muslo_mm} />
            <Dato label="Pierna" value={medicion.pliegue_pierna_mm} />
          </Grupo>

          <Grupo titulo="Perímetros (cm)">
            <Dato label="Brazo relajado" value={medicion.perimetro_brazo_cm} />
            <Dato label="Muslo medio" value={medicion.perimetro_muslo_cm} />
            <Dato label="Pierna" value={medicion.perimetro_pierna_cm} />
          </Grupo>

          <Grupo titulo="Composición tisular (kg)">
            <Dato label="Tejido muscular" value={medicion.kg_tejido_muscular} />
            <Dato label="Tejido óseo" value={medicion.kg_tejido_oseo} />
          </Grupo>

          <Grupo titulo="Calculado">
            <Dato label="Σ 6 pliegues" value={s6} suffix=" mm" />
            <Dato label="Σ 8 pliegues" value={s8} suffix=" mm" />
            <Dato label="Brazo corregido" value={corregidos.brazo} suffix=" cm" />
            <Dato label="Muslo corregido" value={corregidos.muslo} suffix=" cm" />
            <Dato label="Pierna corregida" value={corregidos.pierna} suffix=" cm" />
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500">IMO</p>
              <p className="font-heading font-semibold text-gray-900 mt-0.5">
                {imoValor ?? '—'}
                {clasif ? (
                  <span className={`ml-2 inline-block text-xs font-medium rounded-full px-2 py-0.5 ${clasif.color}`}>
                    {clasif.label}
                  </span>
                ) : null}
              </p>
            </div>
          </Grupo>
        </div>
      </Modal>
    </>
  )
}

function Grupo({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div>
      <span className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{titulo}</span>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">{children}</div>
    </div>
  )
}

function Dato({ label, value, suffix = '' }: { label: string; value: number | null; suffix?: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
      <p className="font-heading font-semibold text-gray-900 mt-0.5">
        {value != null ? `${value}${suffix}` : '—'}
      </p>
    </div>
  )
}
