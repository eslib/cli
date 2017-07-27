import * as rand from 'crypto-random-string'
import { CompilerOptions, createProgram, getPreEmitDiagnostics, ModuleKind, ScriptTarget, ModuleResolutionKind, formatDiagnostics } from 'typescript'
import { writeFile, unlink } from 'mz/fs'

const OPTIONS: CompilerOptions = {
  lib: [],
  module: ModuleKind.ES2015,
  moduleResolution: ModuleResolutionKind.NodeJs,
  noEmitOnError: false,
  project: '../nullproject',
  rootDir: '../nullproject',
  skipLibCheck: true,
  skipDefaultLibCheck: true,
  strict: true,
  target: ScriptTarget.ES2015,
  types: [],
  typeRoots: []
}

/**
 * TODO: Avoid writing temp files to disk
 */
export async function compile(ts: string): Promise<string> {
  console.log('compile', ts)

  let filename = rand(32)

  await writeFile(filename + '.ts', ts)

  let program = createProgram(['./node_modules/typescript/lib/lib.es2017.d.ts', filename + '.ts'], OPTIONS)
  let emitResult = program.emit()
  let allDiagnostics = getPreEmitDiagnostics(program).concat(emitResult.diagnostics)

  // TODO: try/finally
  await unlink(filename + '.js')
  await unlink(filename + '.ts')

  console.log(allDiagnostics)

  return formatDiagnostics(allDiagnostics, {
    getCanonicalFileName: () => '',
    getCurrentDirectory: () => process.cwd(),
    getNewLine: () => '\n'
  })
}
