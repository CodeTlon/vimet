import nextCoreWebVitals from 'eslint-config-next/core-web-vitals'
import nextTypescript from 'eslint-config-next/typescript'

const eslintConfig = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    // Deuda conocida (KNOWN_ISSUES): 19 usos de setState dentro de useEffect en componentes viejos. Se refactorizan de a uno;
    // mientras tanto avisan sin trabar el CI, y el codigo nuevo no deberia sumar mas.
    rules: { 'react-hooks/set-state-in-effect': 'warn' },
  },
  { ignores: ['.next/**', 'node_modules/**', 'public/gif.worker.js'] },
]

export default eslintConfig
