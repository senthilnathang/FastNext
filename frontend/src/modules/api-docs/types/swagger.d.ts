// Type definitions for Swagger UI components

declare module 'swagger-ui' {
  interface SwaggerUIOptions {
    domNode?: HTMLElement
    url?: string
    spec?: object
    deepLinking?: boolean
    showExtensions?: boolean
    showCommonExtensions?: boolean
    displayOperationId?: boolean
    tryItOutEnabled?: boolean
    filter?: boolean | string
    docExpansion?: 'list' | 'full' | 'none'
    operationsSorter?: 'alpha' | 'method' | ((a: any, b: any) => number)
    tagsSorter?: 'alpha' | ((a: any, b: any) => number)
    validatorUrl?: string | null
    supportedSubmitMethods?: string[]
    requestInterceptor?: (request: any) => any
    responseInterceptor?: (response: any) => any
    onComplete?: () => void
    onFailure?: (error: any) => void
    plugins?: any[]
    presets?: any[]
    layout?: string
  }

  function SwaggerUI(options: SwaggerUIOptions): any
  export default SwaggerUI
}

declare module 'swagger-ui-react' {
  interface SwaggerUIProps {
    url?: string
    spec?: object
    deepLinking?: boolean
    showExtensions?: boolean
    showCommonExtensions?: boolean
    displayOperationId?: boolean
    tryItOutEnabled?: boolean
    filter?: boolean | string
    docExpansion?: 'list' | 'full' | 'none'
    operationsSorter?: 'alpha' | 'method' | ((a: any, b: any) => number)
    tagsSorter?: 'alpha' | ((a: any, b: any) => number)
    validatorUrl?: string | null
    supportedSubmitMethods?: string[]
    requestInterceptor?: (request: any) => any
    responseInterceptor?: (response: any) => any
    onComplete?: () => void
    onFailure?: (error: any) => void
    plugins?: any[]
    presets?: any[]
    layout?: string
  }

  const SwaggerUI: React.ComponentType<SwaggerUIProps>
  export default SwaggerUI
}