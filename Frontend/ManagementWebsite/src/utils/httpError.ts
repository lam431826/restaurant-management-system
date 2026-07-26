export interface HttpError {
  response?: {
    status?: number
    data?: {
      error?: string
      message?: string
      fieldErrors?: Record<string, string>
    }
  }
}

export const asHttpError = (error: unknown): HttpError => error as HttpError
