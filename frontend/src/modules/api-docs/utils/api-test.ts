/**
 * Utility functions to test API documentation integration
 */

export interface APITestResult {
  success: boolean
  message: string
  data?: any
  error?: string
}

/**
 * Test if the API server is responding
 */
export async function testAPIConnection(baseUrl: string = 'http://localhost:8000'): Promise<APITestResult> {
  try {
    const healthUrl = `${baseUrl}/health`
    const response = await fetch(healthUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    })

    if (!response.ok) {
      return {
        success: false,
        message: `API server responded with status ${response.status}`,
        error: `HTTP ${response.status}`
      }
    }

    const data = await response.json()
    
    if (data.status !== 'healthy') {
      return {
        success: false,
        message: 'API server is not healthy',
        data,
        error: 'UNHEALTHY_STATUS'
      }
    }

    return {
      success: true,
      message: 'API server is healthy and responding',
      data
    }
  } catch (error) {
    return {
      success: false,
      message: `Cannot connect to API server at ${baseUrl}`,
      error: error instanceof Error ? error.message : String(error)
    }
  }
}

/**
 * Test if OpenAPI specification is available
 */
export async function testOpenAPISpec(baseUrl: string = 'http://localhost:8000'): Promise<APITestResult> {
  try {
    const openApiUrl = `${baseUrl}/api/v1/openapi.json`
    const response = await fetch(openApiUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    })

    if (!response.ok) {
      return {
        success: false,
        message: `OpenAPI spec not available: HTTP ${response.status}`,
        error: `HTTP ${response.status}`
      }
    }

    const spec = await response.json()
    
    // Basic validation of OpenAPI spec
    if (!spec.openapi || !spec.info || !spec.paths) {
      return {
        success: false,
        message: 'Invalid OpenAPI specification format',
        data: spec,
        error: 'INVALID_SPEC'
      }
    }

    return {
      success: true,
      message: `OpenAPI specification available with ${Object.keys(spec.paths).length} endpoints`,
      data: {
        version: spec.info.version,
        title: spec.info.title,
        endpointCount: Object.keys(spec.paths).length
      }
    }
  } catch (error) {
    return {
      success: false,
      message: 'Failed to fetch OpenAPI specification',
      error: error instanceof Error ? error.message : String(error)
    }
  }
}

/**
 * Test FastAPI docs endpoint availability
 */
export async function testFastAPIDocsEndpoint(baseUrl: string = 'http://localhost:8000'): Promise<APITestResult> {
  try {
    const docsUrl = `${baseUrl}/docs`
    const response = await fetch(docsUrl, {
      method: 'GET',
      headers: {
        'Accept': 'text/html'
      }
    })

    if (!response.ok) {
      return {
        success: false,
        message: `FastAPI docs endpoint not available: HTTP ${response.status}`,
        error: `HTTP ${response.status}`
      }
    }

    const content = await response.text()
    
    // Check if it's actually Swagger UI
    if (!content.includes('swagger-ui') && !content.includes('Swagger UI')) {
      return {
        success: false,
        message: 'FastAPI docs endpoint does not serve Swagger UI',
        error: 'NOT_SWAGGER_UI'
      }
    }

    return {
      success: true,
      message: 'FastAPI docs endpoint is available and serving Swagger UI'
    }
  } catch (error) {
    return {
      success: false,
      message: 'Failed to access FastAPI docs endpoint',
      error: error instanceof Error ? error.message : String(error)
    }
  }
}

/**
 * Run all API documentation tests
 */
export async function runAllAPITests(baseUrl?: string): Promise<{
  overall: APITestResult
  individual: {
    connection: APITestResult
    openapi: APITestResult
    docs: APITestResult
  }
}> {
  const apiUrl = baseUrl || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
  
  console.log(`Running API documentation tests against: ${apiUrl}`)
  
  const tests = {
    connection: await testAPIConnection(apiUrl),
    openapi: await testOpenAPISpec(apiUrl),
    docs: await testFastAPIDocsEndpoint(apiUrl)
  }
  
  const allPassed = Object.values(tests).every(test => test.success)
  
  const overall: APITestResult = {
    success: allPassed,
    message: allPassed 
      ? 'All API documentation tests passed' 
      : 'Some API documentation tests failed',
    data: {
      passed: Object.values(tests).filter(test => test.success).length,
      failed: Object.values(tests).filter(test => !test.success).length,
      total: Object.values(tests).length
    }
  }
  
  return {
    overall,
    individual: tests
  }
}