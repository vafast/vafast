/**
 * Format 验证测试
 * 测试 FormatRegistry 是否正常工作
 * 
 * 注意：TypeCompiler 本身支持 FormatRegistry，
 * 只要确保使用同一个 TypeBox 实例即可
 */
import { describe, it, expect, beforeAll } from 'vitest'
import { Type } from '@sinclair/typebox'
import { FormatRegistry } from '@sinclair/typebox'
import { TypeCompiler } from '@sinclair/typebox/compiler'
import { validateSchemaOrThrow, validateSchema } from '../../src/utils/validators/validators'

// 邮箱正则
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/

describe('Format Validation', () => {
  beforeAll(() => {
    // 注册 email format
    FormatRegistry.Set('email', (value) => EMAIL_REGEX.test(value))
  })

  describe('TypeCompiler 支持 FormatRegistry', () => {
    it('should validate valid email', () => {
      const schema = Type.String({ format: 'email' })
      const compiler = TypeCompiler.Compile(schema)
      expect(compiler.Check('test@example.com')).toBe(true)
    })

    it('should reject invalid email', () => {
      const schema = Type.String({ format: 'email' })
      const compiler = TypeCompiler.Compile(schema)
      expect(compiler.Check('not-an-email')).toBe(false)
    })
  })

  describe('validateSchemaOrThrow', () => {
    it('should validate valid email in object', () => {
      const schema = Type.Object({
        id: Type.String(),
        name: Type.String(),
        email: Type.String({ format: 'email' }),
      })

      const data = {
        id: '123',
        name: 'Test',
        email: 'test@example.com',
      }

      expect(() => validateSchemaOrThrow(schema, data, '请求体')).not.toThrow()
    })

    it('should reject invalid email in object', () => {
      const schema = Type.Object({
        id: Type.String(),
        name: Type.String(),
        email: Type.String({ format: 'email' }),
      })

      const data = {
        id: '123',
        name: 'Test',
        email: 'not-an-email',
      }

      expect(() => validateSchemaOrThrow(schema, data, '请求体')).toThrow('请求体验证失败')
    })
  })

  describe('validateSchema', () => {
    it('should return success for valid data', () => {
      const schema = Type.Object({
        email: Type.String({ format: 'email' }),
      })

      const result = validateSchema(schema, { email: 'test@example.com' })
      expect(result.success).toBe(true)
    })

    it('should return errors for invalid data', () => {
      const schema = Type.Object({
        email: Type.String({ format: 'email' }),
      })

      const result = validateSchema(schema, { email: 'invalid' })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.errors.length).toBeGreaterThan(0)
      }
    })
  })
})
