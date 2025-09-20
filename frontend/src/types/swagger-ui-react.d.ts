declare module 'swagger-ui-react' {
  import { ComponentType } from 'react'

  interface SwaggerUIProps {
    url?: string
    spec?: object
    onComplete?: (system: any) => void
    onFailure?: (error: any) => void
    requestInterceptor?: (request: any) => any
    responseInterceptor?: (response: any) => any
    tryItOutEnabled?: boolean
    displayOperationId?: boolean
    showExtensions?: boolean
    showCommonExtensions?: boolean
    deepLinking?: boolean
    presets?: any[]
    layout?: string
    dom_id?: string
    [key: string]: any
  }

  const SwaggerUI: ComponentType<SwaggerUIProps> & {
    presets?: {
      apis?: any
      standalone?: any
    }
  }

  export default SwaggerUI
}