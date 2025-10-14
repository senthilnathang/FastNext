declare module 'swagger-ui' {
  interface SwaggerUIConfig {
    domNode?: Element | null
    url?: string
    urls?: Array<{ url: string; name: string }>
    spec?: object
    validatorUrl?: string | null
    onComplete?: () => void
    onFailure?: (error: any) => void
    authorizations?: object
    docExpansion?: string
    apisSorter?: string
    operationsSorter?: string
    defaultModelRendering?: string
    defaultModelExpandDepth?: number
    defaultModelsExpandDepth?: number
    displayOperationId?: boolean
    displayRequestDuration?: boolean
    deepLinking?: boolean
    maxDisplayedTags?: number
    showExtensions?: boolean
    showCommonExtensions?: boolean
    filter?: boolean | string
    supportedSubmitMethods?: string[]
    requestInterceptor?: (request: any) => any
    responseInterceptor?: (response: any) => any
    tryItOutEnabled?: boolean
    plugins?: any[]
    layout?: string
    [key: string]: any
  }

  function SwaggerUI(config: SwaggerUIConfig): any
  export = SwaggerUI
}
