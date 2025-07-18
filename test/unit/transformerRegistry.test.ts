import { describe, it, expect, vi, beforeEach } from 'vitest'
import { TransformerRegistry } from '../../src/utils/TransformerRegistry'
import type { Transformer } from '../../src/types'

describe('TransformerRegistry', () => {
  let registry: TransformerRegistry

  beforeEach(() => {
    registry = new TransformerRegistry()
  })

  it('should add and get type transformers', () => {
    const transformer: Transformer = (v) => v
    registry.addTypeTransformer('string', transformer)
    const transformers = registry.getTransformersForValue('hello')
    expect(transformers).toEqual([transformer])
  })

  it('should add and get constructor transformers', () => {
    const transformer: Transformer = (v) => v
    registry.addConstructorTransformer(Date, transformer)
    const transformers = registry.getTransformersForValue(new Date())
    expect(transformers).toEqual([transformer])
  })

  it('should add and get fallback transformers', () => {
    const transformer: Transformer = (v) => v
    registry.addFallbackTransformer(transformer)
    const transformers = registry.getTransformersForValue(123)
    expect(transformers).toEqual([transformer])
  })

  it('should apply transformers in the correct order', () => {
    const typeTransformer = vi.fn((v) => v)
    const constructorTransformer = vi.fn((v) => v)
    const fallbackTransformer = vi.fn((v) => v)

    registry.addTypeTransformer('object', typeTransformer)
    registry.addConstructorTransformer(Object, constructorTransformer)
    registry.addFallbackTransformer(fallbackTransformer)

    registry.applyTransformers({})

    expect(typeTransformer).toHaveBeenCalled()
    expect(constructorTransformer).toHaveBeenCalled()
    expect(fallbackTransformer).toHaveBeenCalled()
  })

  it('should apply transformers to a value', () => {
    const transformer = (v: unknown) => (typeof v === 'number' ? v * 2 : v)
    registry.addTypeTransformer('number', transformer)
    const result = registry.applyTransformers(10)
    expect(result).toBe(20)
  })

  it('should not apply transformers to strings', () => {
    const transformer = vi.fn((v) => v)
    registry.addTypeTransformer('string', transformer)
    const result = registry.applyTransformers('hello')
    expect(result).toBe('hello')
    expect(transformer).not.toHaveBeenCalled()
  })

  it('should clear all transformers', () => {
    registry.addTypeTransformer('string', (v) => v)
    registry.addConstructorTransformer(Date, (v) => v)
    registry.addFallbackTransformer((v) => v)
    registry.clear()
    const registered = registry.getRegisteredTransformers()
    expect(registered.types.size).toBe(0)
    expect(registered.constructors.size).toBe(0)
    expect(registered.fallback.length).toBe(0)
  })

  it('should get all registered transformers', () => {
    const typeTransformer: Transformer = (v) => v
    const constructorTransformer: Transformer = (v) => v
    const fallbackTransformer: Transformer = (v) => v

    registry.addTypeTransformer('string', typeTransformer)
    registry.addConstructorTransformer(Date, constructorTransformer)
    registry.addFallbackTransformer(fallbackTransformer)

    const registered = registry.getRegisteredTransformers()
    expect(registered.types.get('string')).toEqual([typeTransformer])
    expect(registered.constructors.get(Date)).toEqual([constructorTransformer])
    expect(registered.fallback).toEqual([fallbackTransformer])
  })
}) 