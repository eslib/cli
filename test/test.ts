import test from 'ava'
import { check } from '../src'

test('sanity', async t => t.is(await check(), undefined))
