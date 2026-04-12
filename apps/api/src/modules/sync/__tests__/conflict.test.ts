import { describe, expect, it } from 'vitest'
import { resolveConflict } from '../conflict-resolver.js'

describe('resolveConflict', () => {
  const basePayload = { name: 'X' }

  it('medical_records siempre es append', () => {
    const r = resolveConflict({
      table: 'medical_records',
      localTimestamp: new Date(1000),
      serverTimestamp: new Date(2000),
      localPayload: basePayload,
      serverPayload: basePayload,
    })
    expect(r).toBe('append')
  })

  it('si no existe en servidor, gana el local', () => {
    const r = resolveConflict({
      table: 'patients',
      localTimestamp: new Date(1000),
      serverTimestamp: new Date(2000),
      localPayload: basePayload,
      serverPayload: null,
    })
    expect(r).toBe('local_wins')
  })

  it('last write wins: local más reciente', () => {
    const r = resolveConflict({
      table: 'patients',
      localTimestamp: new Date(2000),
      serverTimestamp: new Date(1000),
      localPayload: basePayload,
      serverPayload: basePayload,
    })
    expect(r).toBe('local_wins')
  })

  it('last write wins: server más reciente', () => {
    const r = resolveConflict({
      table: 'patients',
      localTimestamp: new Date(1000),
      serverTimestamp: new Date(2000),
      localPayload: basePayload,
      serverPayload: basePayload,
    })
    expect(r).toBe('server_wins')
  })
})
