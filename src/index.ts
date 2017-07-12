import { black, blue, cyan, green, magenta } from 'cli-color'
import { ASSIGN_ERROR, AssignError } from 'eslib'
import '@eslib/std'
import { gte } from 'semver'
import { ModuleKind, transpileModule, ScriptTarget } from 'typescript'

let formatError: {
  [error: number]: (e: AssignError) => string
} = {
  [ASSIGN_ERROR.INVALID_VERSION]: e => `Version string ${magenta(e.meta.version)} for method ${green(e.meta.method)} on type ${blue(e.meta.type)} is invalid - please specify version as X.Y.Z (eg. ${magenta('1.2.3')})`,
  [ASSIGN_ERROR.ALREADY_EXISTS_NATIVE]: e => `Skipping method ${green(e.meta.method)} on ${logPrettyType(e.meta.type)} (provided by ${cyan(e.meta.author)}) because it is already natively installed`,
  [ASSIGN_ERROR.ALREADY_EXISTS_EXTERNAL]: e => `Skipping method ${green(e.meta.method)} on ${logPrettyType(e.meta.type)} (provided by ${cyan(e.meta.author)}) because it is already defined on ${logPrettyType(e.meta.type)} by some library outside of ESlib`,
  [ASSIGN_ERROR.ALREADY_EXISTS_INCOMPATIBLE_LIB]: e => `Skipping method ${green(e.meta.method)} on ${logPrettyType(e.meta.type)} (provided by ${cyan(e.meta.author)}) because another method with the same name was already installed by ${cyan(e.meta.otherAuthor)}`,
  [ASSIGN_ERROR.ALREADY_EXISTS_INCOMPATIBLE_VERSION]: e => `Skipping method ${green(e.meta.method)} at version ${magenta(e.meta.version)} (provided by ${cyan(e.meta.author)}) because a${gte(e.meta.otherVersion || '0.0.0', e.meta.version) ? ' newer' : 'n older'} version ${magenta(e.meta.otherVersion)} is already installed on ${logPrettyType(e.meta.type)}`,
  [ASSIGN_ERROR.RESERVED_WORD]: e => `Skipping method ${green(e.meta.method)} on ${logPrettyType(e.meta.type)} (provided by ${cyan(e.meta.author)}) because it is a reserved word`
}

let compile = (ts: string) =>
  transpileModule(ts, {
    compilerOptions: {
      module: ModuleKind.None,
      target: ScriptTarget.ES5
    }
  })

let getInstalledLibs = (): string[] => {
  let deps: { [k: string]: string } = require(process.cwd() + '/package.json').dependencies
  return deps
    .entries()
    .map(([key]) => key)
    .filter(_ => _.startsWith('@eslib/'))
}

let generateTs = (libpaths: string[]): string =>
  libpaths.map(_ => `require('${_}')`).join('\n') + '\n'

let run = (libpaths: string[]) =>
  libpaths.forEach(require)

let warn = (message: string) =>
  console.warn(black.bgYellowBright(`ESLib warning`), message)

function main() {
  let libs = getInstalledLibs()
  let { diagnostics } = compile(generateTs(libs))
  console.log(diagnostics)
  run(libs)
  let errors: AssignError[] = require('eslib').__errors

  errors
    .sort((a, b) => b.error - a.error)
    .forEach(_ => warn(formatError[_.error](_)))
}

let prettyTypes = new Map<object, string>()
prettyTypes.set(Array, 'Array')
prettyTypes.set(Boolean, 'Boolean')
prettyTypes.set(Function, 'Function')
prettyTypes.set(Math, 'Math')
prettyTypes.set(Number, 'Number')
prettyTypes.set(String, 'String')
prettyTypes.set(Object, 'Object')
prettyTypes.set(Array.prototype, 'Array.prototype')
prettyTypes.set(Boolean.prototype, 'Boolean.prototype')
prettyTypes.set(Function.prototype, 'Function.prototype')
prettyTypes.set(Number.prototype, 'Number.prototype')
prettyTypes.set(Object.prototype, 'Object.prototype')
prettyTypes.set(String.prototype, 'String.prototype')

function logPrettyType(type: object): string {
  return blue(prettyTypes.get(type) || type)
}

main()
