export const PROJECT_PAGINATION_SIZE_OPTIONS = [10, 20, 50, 100]

export const ANTD_DEFAULT_PAGINATION_SIZE_OPTIONS = [10, 20, 50, 100]

export const getPaginationSizeOptions = (currentPageSize?: number) => {
  const values = [
    currentPageSize,
    ...PROJECT_PAGINATION_SIZE_OPTIONS,
    ...ANTD_DEFAULT_PAGINATION_SIZE_OPTIONS,
  ]

  return Array.from(
    new Set(
      values.filter(
        (value): value is number =>
          typeof value === 'number' && Number.isFinite(value) && value > 0,
      ).map(value => Math.trunc(value)),
    ),
  ).sort((a, b) => a - b)
}
