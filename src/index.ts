import '@eslib/std'
import { black, blue, cyan, green, magenta, whiteBright } from 'cli-color'
import { ASSIGN_ERROR, AssignError } from 'eslib'
import { gte } from 'semver'
import { compile } from './compile'
import { readFileSync } from 'fs'

let formatError: {
  [error: number]: (e: AssignError) => string
} = {
    [ASSIGN_ERROR.INVALID_VERSION]: e =>
      `Version string ${magenta(e.meta.version)} for method ${green(e.meta.method)} on type ${blue(e.meta.type)} is invalid - please specify version as X.Y.Z (eg. ${magenta('1.2.3')})`,

    [ASSIGN_ERROR.ALREADY_EXISTS_NATIVE]: e =>
      `Skipping method ${green(e.meta.method)} on ${logPrettyType(e.meta.type)} (provided by ${cyan(e.meta.author)}) because it is already natively installed`,

    [ASSIGN_ERROR.ALREADY_EXISTS_EXTERNAL]: e =>
      `Skipping method ${green(e.meta.method)} on ${logPrettyType(e.meta.type)} (provided by ${cyan(e.meta.author)}) because it is already defined on ${logPrettyType(e.meta.type)} by some library outside of ESlib`,

    [ASSIGN_ERROR.ALREADY_EXISTS_INCOMPATIBLE_LIB]: e =>
      `Skipping method ${green(e.meta.method)} on ${logPrettyType(e.meta.type)} (provided by ${cyan(e.meta.author)}) because another method with the same name was already installed by ${cyan(e.meta.otherAuthor)}`,

    [ASSIGN_ERROR.ALREADY_EXISTS_INCOMPATIBLE_VERSION]: e =>
      `Skipping method ${green(e.meta.method)} at version ${magenta(e.meta.version)} (provided by ${cyan(e.meta.author)}) because a${gte(e.meta.otherVersion || '0.0.0', e.meta.version) ? ' newer' : 'n older'} version ${magenta(e.meta.otherVersion)} is already installed on ${logPrettyType(e.meta.type)}`,

    [ASSIGN_ERROR.RESERVED_WORD]: e =>
      `Skipping method ${green(e.meta.method)} on ${logPrettyType(e.meta.type)} (provided by ${cyan(e.meta.author)}) because it is a reserved word`
  }

// TODO: make it async
let isEslib = (packageName: string) => {
  let a = JSON.parse(readFileSync(process.cwd() + '/node_modules/' + packageName + '/package.json', 'utf8'))
  console.log(a)
  return a.eslib
}

/**
 * TODO: Do this less naively
 *
 * TODO: Support 3rd party extensions
 *  - {"eslib": true} in package.json?
 *  - Scan for calls to eslib.assign?
 */
let getInstalledLibs = (): string[] => {
  let deps: { [k: string]: string } = require(process.cwd() + '/package.json').dependencies
  return deps
    .entries()
    .map(([key]) => key)
    .filter(isEslib)
}

let generateTs = (libpaths: string[]): string =>
  libpaths.map(_ => `import '${_}'`).join('\n') + '\n'

let run = (libpaths: string[]) =>
  libpaths.forEach(require)

let type: {
  [error: number]: string
} = {
  [ASSIGN_ERROR.ALREADY_EXISTS_EXTERNAL]: black.bgWhite('ALREADY_EXISTS_EXTERNAL') + '           ',
  [ASSIGN_ERROR.ALREADY_EXISTS_INCOMPATIBLE_LIB]: black.bgWhite('ALREADY_EXISTS_INCOMPATIBLE_LIB') + '    ',
  [ASSIGN_ERROR.ALREADY_EXISTS_INCOMPATIBLE_VERSION]: black.bgWhite('ALREADY_EXISTS_INCOMPATIBLE_VERSION'),
  [ASSIGN_ERROR.ALREADY_EXISTS_NATIVE]: black.bgWhite('ALREADY_EXISTS_NATIVE') + '              ',
  [ASSIGN_ERROR.RESERVED_WORD]: black.bgWhite('RESERVED_WORD') + ' '.repeat(35 - 13),
  [ASSIGN_ERROR.INVALID_VERSION]: black.bgWhite('INVALID_VERSION') + ' '.repeat(35 - 15)
}

let warnES = (e: AssignError, message: string) =>
  console.warn(black.bgYellowBright(`ESLib warning`), type[e.error], message)

let warnTS = (message: string) =>
  console.warn(whiteBright.bgBlue('TypeScript error'), message)

export let check = async () => {
  let libs = getInstalledLibs()
  let ts = generateTs(libs)
  let diagnostics = await compile(ts)

  warnTS(diagnostics)

  // hacky! TODO: find a better API
  run(libs)
  let errors: AssignError[] = require('eslib').__errors

  errors
    .sort((a, b) => b.error - a.error)
    .forEach(_ => warnES(_, formatError[_.error](_)))
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
