import * as rand from 'crypto-random-string'
import { CompilerOptions, createProgram, getPreEmitDiagnostics, ModuleKind, ScriptTarget, ModuleResolutionKind, flattenDiagnosticMessageText } from 'typescript'
import { writeFile, unlink } from 'mz/fs'

const OPTIONS: CompilerOptions = {
  lib: [],
  module: ModuleKind.ES2015,
  moduleResolution: ModuleResolutionKind.NodeJs,
  rootDir: process.cwd(),
  strict: true,
  target: ScriptTarget.ES2015
}

/**
 * TODO: Avoid writing temp file to disk if possible
 */
export async function compile(ts: string): Promise<string[]> {

  let filename = rand(32)

  await writeFile(filename + '.ts', ts)

  let program = createProgram(['./node_modules/typescript/lib/lib.es2017.d.ts', filename], OPTIONS)
  let emitResult = program.emit()
  let allDiagnostics = getPreEmitDiagnostics(program).concat(emitResult.diagnostics)

  // TODO: try/finally
  await unlink(filename + '.ts')

  return allDiagnostics.map(diagnostic =>
    flattenDiagnosticMessageText(diagnostic.messageText, '\n')
  )
}
