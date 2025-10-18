// API Documentation Types
export interface SwaggerUIProps {
  className?: string;
  apiUrl?: string;
  showToolbar?: boolean;
  useStrictMode?: boolean;
}

export interface SwaggerConfig {
  url: string;
  deepLinking: boolean;
  showExtensions: boolean;
  showCommonExtensions: boolean;
  displayOperationId: boolean;
  tryItOutEnabled: boolean;
  requestInterceptor?: (request: any) => any;
  responseInterceptor?: (response: any) => any;
  onComplete?: () => void;
  onFailure?: (error: any) => void;
}
