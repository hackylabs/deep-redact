export type TableData = Array<{ [key: string]: string | number | boolean }>

export const renderTable = (data: TableData): string => {
  const keys = Object.keys(data[0])
  const header = `| ${keys.join(' | ')} |`
  const divider = `| ${keys.map(() => '---').join(' | ')} |`

  return [
    header,
    divider,
    ...data.map((row) => `| ${keys.map((key) => row[key]).join(' | ')} |`),
  ].join('\n')
}
