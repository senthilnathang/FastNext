#!/usr/bin/env ts-node
/**
 * Frontend API Integration Verification Script
 * Verifies that all frontend services use the new /api/v1 endpoints
 */

import { readFileSync, existsSync } from 'fs'
import { join } from 'path'
import { glob } from 'glob'

interface CheckResult {
  file: string
  issues: string[]
  passed: boolean
}

class APIIntegrationVerifier {
  private basePath: string = 'src'
  private results: CheckResult[] = []
  
  constructor() {
    this.basePath = process.cwd() + '/src'
  }

  async verifyAllFiles(): Promise<void> {
    console.log('🔍 Frontend API Integration Verification')
    console.log('=' .repeat(50))
    
    // Check API service files
    await this.checkAPIServices()
    
    // Check tRPC routers
    await this.checkTRPCRouters()
    
    // Check for old API patterns
    await this.checkForOldPatterns()
    
    // Generate report
    this.generateReport()
  }

  private async checkAPIServices(): Promise<void> {
    console.log('\n📦 Checking API Service Files...')
    
    const serviceFiles = [
      'src/shared/services/api/config.ts',
      'src/shared/services/api/users.ts',
      'src/shared/services/api/roles.ts',
      'src/shared/services/permissions.ts',
      'src/shared/services/projects.ts',
      'src/shared/services/components.ts',
      'src/shared/services/pages.ts',
    ]
    
    for (const file of serviceFiles) {
      const result = this.checkFile(file)
      if (result) {
        this.results.push(result)
        const status = result.passed ? '✅' : '❌'
        console.log(`  ${status} ${file}`)
        if (!result.passed) {
          result.issues.forEach(issue => console.log(`    - ${issue}`))
        }
      }
    }
  }

  private async checkTRPCRouters(): Promise<void> {
    console.log('\n🔄 Checking tRPC Routers...')
    
    const trpcFiles = [
      'src/lib/trpc/routers/users.ts',
      'src/lib/trpc/routers/roles.ts',
      'src/lib/trpc/routers/permissions.ts',
      'src/lib/trpc/routers/projects.ts',
    ]
    
    for (const file of trpcFiles) {
      const result = this.checkTRPCFile(file)
      if (result) {
        this.results.push(result)
        const status = result.passed ? '✅' : '❌'
        console.log(`  ${status} ${file}`)
        if (!result.passed) {
          result.issues.forEach(issue => console.log(`    - ${issue}`))
        }
      }
    }
  }

  private async checkForOldPatterns(): Promise<void> {
    console.log('\n🔍 Scanning for Old API Patterns...')
    
    try {
      const allTsFiles = await glob('src/**/*.{ts,tsx}', { ignore: ['**/*.d.ts', '**/node_modules/**'] })
      
      for (const file of allTsFiles) {
        const result = this.checkForOldAPIPatterns(file)
        if (result && !result.passed) {
          this.results.push(result)
          console.log(`  ❌ ${file}`)
          result.issues.forEach(issue => console.log(`    - ${issue}`))
        }
      }
    } catch (error) {
      console.log(`  ⚠️  Could not scan files: ${error}`)
    }
  }

  private checkFile(filePath: string): CheckResult | null {
    if (!existsSync(filePath)) {
      return {
        file: filePath,
        issues: ['File not found'],
        passed: false
      }
    }

    const content = readFileSync(filePath, 'utf-8')
    const issues: string[] = []

    // Check for API_CONFIG import and usage
    if (filePath.includes('services/') && !filePath.includes('api/client') && !filePath.includes('api/config')) {
      if (!content.includes('API_CONFIG')) {
        issues.push('Missing API_CONFIG import/usage')
      }
      
      if (content.includes('apiClient.get(\'/') || 
          content.includes('apiClient.post(\'/') ||
          content.includes('apiClient.put(\'/') ||
          content.includes('apiClient.delete(\'/')
      ) {
        issues.push('Using hardcoded endpoints instead of API_CONFIG')
      }
    }

    // Check for proper v1 endpoints in config
    if (filePath.includes('api/config.ts')) {
      const requiredEndpoints = ['/api/v1/users', '/api/v1/roles', '/api/v1/permissions', '/api/v1/projects']
      
      for (const endpoint of requiredEndpoints) {
        if (!content.includes(endpoint)) {
          issues.push(`Missing endpoint: ${endpoint}`)
        }
      }
    }

    return {
      file: filePath,
      issues,
      passed: issues.length === 0
    }
  }

  private checkTRPCFile(filePath: string): CheckResult | null {
    if (!existsSync(filePath)) {
      return {
        file: filePath,
        issues: ['File not found'],
        passed: false
      }
    }

    const content = readFileSync(filePath, 'utf-8')
    const issues: string[] = []

    // Check for API_CONFIG import
    if (!content.includes('API_CONFIG')) {
      issues.push('Missing API_CONFIG import')
    }

    // Check for old endpoint patterns
    const oldPatterns = [
      'apiClient.get(\'/users',
      'apiClient.get(\'/roles',
      'apiClient.get(\'/permissions', 
      'apiClient.get(\'/projects',
      'apiClient.post(\'/users',
      'apiClient.post(\'/roles',
      'apiClient.post(\'/permissions',
      'apiClient.post(\'/projects'
    ]

    for (const pattern of oldPatterns) {
      if (content.includes(pattern)) {
        issues.push(`Found old endpoint pattern: ${pattern}`)
      }
    }

    return {
      file: filePath,
      issues,
      passed: issues.length === 0
    }
  }

  private checkForOldAPIPatterns(filePath: string): CheckResult | null {
    const content = readFileSync(filePath, 'utf-8')
    const issues: string[] = []

    // Look for old API patterns that weren't updated
    const problematicPatterns = [
      { pattern: /apiClient\.(get|post|put|delete)\(['"`]\/(?!api\/v1\/)/g, description: 'Direct endpoint without /api/v1 prefix' },
      { pattern: /['"`]\/api\/(?!v1\/)/g, description: 'API call without v1 versioning' },
      { pattern: /fetch\(['"`][^'"`]*\/(?:users|roles|permissions|projects)(?!\/api\/v1)/g, description: 'Direct fetch without proper API structure' }
    ]

    for (const { pattern, description } of problematicPatterns) {
      const matches = content.match(pattern)
      if (matches) {
        issues.push(`${description}: ${matches[0]}`)
      }
    }

    if (issues.length === 0) return null

    return {
      file: filePath,
      issues,
      passed: false
    }
  }

  private generateReport(): void {
    console.log('\n' + '='.repeat(50))
    
    const totalFiles = this.results.length
    const passedFiles = this.results.filter(r => r.passed).length
    const failedFiles = totalFiles - passedFiles
    const totalIssues = this.results.reduce((sum, r) => sum + r.issues.length, 0)

    console.log('📊 Verification Summary:')
    console.log(`  Total files checked: ${totalFiles}`)
    console.log(`  Passed: ${passedFiles} ✅`)
    console.log(`  Failed: ${failedFiles} ❌`) 
    console.log(`  Total issues: ${totalIssues}`)

    if (failedFiles === 0) {
      console.log('\n🎉 All API integrations are properly updated!')
      console.log('✨ Frontend is ready for the new /api/v1 structure')
    } else {
      console.log('\n⚠️  Some files need attention:')
      this.results
        .filter(r => !r.passed)
        .forEach(result => {
          console.log(`\n📄 ${result.file}:`)
          result.issues.forEach(issue => console.log(`   - ${issue}`))
        })
    }

    console.log('\n🔧 Recommendations:')
    console.log('  1. All service files should import and use API_CONFIG')
    console.log('  2. Replace hardcoded endpoints with API_CONFIG.ENDPOINTS.*')
    console.log('  3. Ensure all tRPC routers use the new v1 endpoints')
    console.log('  4. Update any remaining direct API calls')
  }
}

// Run verification if called directly
if (require.main === module) {
  const verifier = new APIIntegrationVerifier()
  verifier.verifyAllFiles().catch(console.error)
}

export { APIIntegrationVerifier }