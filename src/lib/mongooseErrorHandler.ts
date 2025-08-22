import { NextResponse } from "next/server"

// Mongoose error types
interface MongooseValidationError {
  name: 'ValidationError'
  errors: Record<string, { message: string }>
}

interface MongooseDuplicateKeyError {
  code: 11000
  keyPattern: Record<string, unknown>
  keyValue: Record<string, unknown>
}

interface MongooseCastError {
  name: 'CastError'
  message: string
  value: unknown
  path: string
}

// Configuration for compound unique constraints
interface CompoundUniqueConstraint {
  fields: string[]
  message: string | ((values: Record<string, unknown>) => string)
}

/**
 * Generic utility for handling Mongoose errors with type safety
 * @param error - The error object from Mongoose
 * @param options - Configuration options for error handling
 * @returns NextResponse if it's a Mongoose error, null otherwise
 */
export function handleMongooseError(
  error: unknown,
  options?: {
    customMessages?: Record<string, string>
    compoundUniqueConstraints?: CompoundUniqueConstraint[]
  }
): NextResponse | null {
  // Handle Mongoose validation errors
  if (isMongooseValidationError(error)) {
    const firstError = Object.values(error.errors)[0]
    return NextResponse.json({
      success: false,
      error: firstError.message
    }, { status: 400 })
  }

  // Handle Mongoose duplicate key errors
  if (isMongooseDuplicateKeyError(error)) {
    const duplicateField = Object.keys(error.keyPattern)[0]

    // Check for custom message
    if (options?.customMessages && options.customMessages[duplicateField]) {
      return NextResponse.json({
        success: false,
        error: options.customMessages[duplicateField]
      }, { status: 409 })
    }

    // Handle compound unique constraint violations
    if (options?.compoundUniqueConstraints) {
      for (const constraint of options.compoundUniqueConstraints) {
        if (constraint.fields.includes(duplicateField) && error.keyValue) {
          const keyValue = error.keyValue

          // Check if all constraint fields are present
          const hasAllFields = constraint.fields.every(field => keyValue[field] !== undefined)

          if (hasAllFields) {
            let message: string
            if (typeof constraint.message === 'function') {
              message = constraint.message(keyValue)
            } else {
              message = constraint.message
            }

            return NextResponse.json({
              success: false,
              error: message
            }, { status: 409 })
          }
        }
      }
    }

    // Generic duplicate field message
    return NextResponse.json({
      success: false,
      error: `${duplicateField} already exists`
    }, { status: 409 })
  }

  // Handle Mongoose cast errors
  if (isMongooseCastError(error)) {
    return NextResponse.json({
      success: false,
      error: `Invalid ${error.path}: ${error.message}`
    }, { status: 400 })
  }

  // Not a Mongoose error, return null
  return null
}

// Type guard functions
function isMongooseValidationError(error: unknown): error is MongooseValidationError {
  return Boolean(error &&
         typeof error === 'object' &&
         'name' in error &&
         error.name === 'ValidationError' &&
         'errors' in error)
}

function isMongooseDuplicateKeyError(error: unknown): error is MongooseDuplicateKeyError {
  return Boolean(error &&
         typeof error === 'object' &&
         'code' in error &&
         error.code === 11000 &&
         'keyPattern' in error)
}

function isMongooseCastError(error: unknown): error is MongooseCastError {
  return Boolean(error &&
         typeof error === 'object' &&
         'name' in error &&
         error.name === 'CastError' &&
         'message' in error &&
         'path' in error)
}

/**
 * Helper function to check if error is a Mongoose error
 * @param error - The error object to check
 * @returns true if it's a Mongoose error, false otherwise
 */
export function isMongooseError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false
  }

  const errorObj = error as Record<string, unknown>

  // Check for ValidationError
  if (errorObj.name === 'ValidationError') {
    return true
  }

  // Check for CastError
  if (errorObj.name === 'CastError') {
    return true
  }

  // Check for duplicate key error
  if (errorObj.code === 11000) {
    return true
  }

  return false
}
