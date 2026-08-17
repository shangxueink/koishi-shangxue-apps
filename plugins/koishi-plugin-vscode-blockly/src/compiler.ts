import ts from 'typescript'

export function compileScript(source: string, filename: string) {
  if (filename.endsWith('.js')) return source
  const result = ts.transpileModule(source, {
    fileName: filename,
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
      experimentalDecorators: true,
      emitDecoratorMetadata: true,
    },
    reportDiagnostics: true,
  })
  const diagnostics = result.diagnostics ?? []
  if (diagnostics.length) {
    const messages = diagnostics
      .map(item => ts.flattenDiagnosticMessageText(item.messageText, '\n'))
      .join('\n')
    throw new Error(messages)
  }
  return result.outputText
}
