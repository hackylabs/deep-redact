export const canonicaliseKey = (value: string): string => {
  return value.toLowerCase().trim().replaceAll(/[_-]/g, '')
}
