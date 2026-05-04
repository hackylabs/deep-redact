export const canonicaliseKey = (value: string): string => {
  return value.toLowerCase().trim().replace(/[_-]/g, '')
}
