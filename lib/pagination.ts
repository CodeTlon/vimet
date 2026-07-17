export const PAGE_SIZE = 10

export function parsePage(value: string | undefined): number {
  const n = Number(value)
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 1
}

export function pageRange(page: number, size = PAGE_SIZE): [number, number] {
  const from = (page - 1) * size
  return [from, from + size - 1]
}

export function totalPages(count: number | null, size = PAGE_SIZE): number {
  return Math.max(1, Math.ceil((count ?? 0) / size))
}
