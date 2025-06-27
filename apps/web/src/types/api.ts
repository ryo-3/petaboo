// このファイルは `npm run generate-api-types` コマンドで自動生成されます
// 手動で編集しないでください

export interface paths {
  '/notes': {
    get: {
      responses: {
        200: {
          content: {
            'application/json': {
              id: number
              title: string
              content: string | null
              createdAt: number
            }[]
          }
        }
      }
    }
    post: {
      requestBody: {
        content: {
          'application/json': {
            title: string
            content?: string
          }
        }
      }
      responses: {
        200: {
          content: {
            'application/json': {
              success: boolean
            }
          }
        }
        400: {
          content: {
            'application/json': {
              error: string
              issues?: any
            }
          }
        }
      }
    }
  }
}

export type Note = {
  id: number
  title: string
  content: string | null
  createdAt: number
}