#!/usr/bin/env node

/**
 * Bundle Analyzer for Security Assessment
 * Analyzes webpack bundles for security issues and optimization opportunities
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

class BundleSecurityAnalyzer {
  constructor() {
    this.buildDir = path.join(process.cwd(), '.next');
    this.issues = [];
    this.recommendations = [];
    this.bundleInfo = {};
  }

  async analyze() {
    console.log('📦 Starting Bundle Security Analysis...\n');

    try {
      // 1. Check if build exists
      await this.checkBuildExists();
      
      // 2. Analyze bundle composition
      await this.analyzeBundleComposition();
      
      // 3. Check for security issues
      await this.checkSecurityIssues();
      
      // 4. Analyze dependencies
      await this.analyzeDependencies();
      
      // 5. Check for exposed secrets
      await this.checkForSecrets();
      
      // 6. Performance impact analysis
      await this.analyzePerformanceImpact();
      
      // 7. Generate report
      this.generateReport();
      
    } catch (error) {
      console.error('❌ Bundle analysis failed:', error.message);
      process.exit(1);
    }
  }

  async checkBuildExists() {
    if (!fs.existsSync(this.buildDir)) {
      console.log('🔨 No build found, running build...');
      try {
        execSync('npm run build', { stdio: 'inherit' });
      } catch {
        throw new Error('Build failed. Cannot analyze bundle.');
      }
    }
  }

  async analyzeBundleComposition() {
    console.log('🔍 Analyzing Bundle Composition...');
    
    try {
      // Get build info
      const buildManifest = path.join(this.buildDir, 'build-manifest.json');
      if (fs.existsSync(buildManifest)) {
        const manifest = JSON.parse(fs.readFileSync(buildManifest, 'utf8'));
        this.bundleInfo.pages = Object.keys(manifest.pages || {}).length;
        this.bundleInfo.assets = manifest.pages;
      }

      // Analyze static directory
      const staticDir = path.join(this.buildDir, 'static');
      if (fs.existsSync(staticDir)) {
        const chunks = this.getChunkFiles(staticDir);
        this.bundleInfo.chunks = chunks;
        
        // Check chunk sizes
        chunks.forEach(chunk => {
          if (chunk.size > 1024 * 1024) { // > 1MB
            this.issues.push({
              type: 'large-chunk',
              file: chunk.name,
              size: chunk.size,
              severity: 'warning',
              message: `Large chunk detected (${this.formatSize(chunk.size)})`
            });
          }
        });
      }

      console.log(`   Found ${this.bundleInfo.chunks?.length || 0} chunks`);
      
    } catch (error) {
      this.issues.push({
        type: 'analysis-error',
        severity: 'warning',
        message: `Bundle composition analysis failed: ${error.message}`
      });
    }
  }

  getChunkFiles(dir) {
    const chunks = [];
    
    function walkDir(currentDir) {
      const files = fs.readdirSync(currentDir);
      
      files.forEach(file => {
        const filePath = path.join(currentDir, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory()) {
          walkDir(filePath);
        } else if (file.endsWith('.js') || file.endsWith('.css')) {
          chunks.push({
            name: file,
            path: filePath,
            size: stat.size,
            type: file.endsWith('.js') ? 'javascript' : 'css'
          });
        }
      });
    }
    
    walkDir(dir);
    return chunks;
  }

  async checkSecurityIssues() {
    console.log('🔒 Checking for Security Issues...');
    
    const chunks = this.bundleInfo.chunks || [];
    
    for (const chunk of chunks) {
      try {
        const content = fs.readFileSync(chunk.path, 'utf8');
        
        // Check for exposed API keys/secrets
        const secretPatterns = [
          { pattern: /sk_live_[a-zA-Z0-9]{24,}/, name: 'Stripe Live Key' },
          { pattern: /pk_live_[a-zA-Z0-9]{24,}/, name: 'Stripe Publishable Key' },
          { pattern: /AKIA[0-9A-Z]{16}/, name: 'AWS Access Key' },
          { pattern: /AIza[0-9A-Za-z\\-_]{35}/, name: 'Google API Key' },
          { pattern: /ya29\\.[0-9A-Za-z\\-_]+/, name: 'Google OAuth Token' },
          { pattern: /[a-zA-Z0-9]{32,}/, name: 'Potential Secret' } // Generic long strings
        ];
        
        secretPatterns.forEach(({ pattern, name }) => {
          const matches = content.match(pattern);
          if (matches) {
            this.issues.push({
              type: 'exposed-secret',
              file: chunk.name,
              severity: 'critical',
              secretType: name,
              message: `Potential ${name} found in bundle`
            });
          }
        });
        
        // Check for eval usage
        if (content.includes('eval(') || content.includes('new Function(')) {
          this.issues.push({
            type: 'unsafe-eval',
            file: chunk.name,
            severity: 'high',
            message: 'Unsafe eval usage detected'
          });
        }
        
        // Check for innerHTML usage
        if (content.includes('innerHTML') && !content.includes('DOMPurify')) {
          this.issues.push({
            type: 'unsafe-html',
            file: chunk.name,
            severity: 'medium',
            message: 'innerHTML usage without sanitization'
          });
        }
        
        // Check for console.log in production
        if (process.env.NODE_ENV === 'production' && content.includes('console.log')) {
          this.issues.push({
            type: 'debug-code',
            file: chunk.name,
            severity: 'low',
            message: 'Console.log statements in production build'
          });
        }
        
      } catch (error) {
        console.warn(`   Could not analyze ${chunk.name}: ${error.message}`);
      }
    }
  }

  async analyzeDependencies() {
    console.log('📚 Analyzing Bundle Dependencies...');
    
    try {
      // Use webpack-bundle-analyzer if available
      const analyzerPath = path.join(process.cwd(), 'node_modules', 'webpack-bundle-analyzer');
      if (fs.existsSync(analyzerPath)) {
        // Generate bundle analysis
        execSync('npx webpack-bundle-analyzer .next/static/chunks/*.js --mode=json --report=bundle-report.json', {
          stdio: 'pipe'
        });
        
        if (fs.existsSync('bundle-report.json')) {
          const report = JSON.parse(fs.readFileSync('bundle-report.json', 'utf8'));
          this.analyzeBundleReport(report);
        }
      }
      
      // Check for duplicate dependencies
      const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
      const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
      
      // Check for potential duplicates
      const potentialDuplicates = this.findPotentialDuplicates(deps);
      potentialDuplicates.forEach(duplicate => {
        this.issues.push({
          type: 'duplicate-dependency',
          severity: 'warning',
          packages: duplicate,
          message: `Potential duplicate dependencies: ${duplicate.join(', ')}`
        });
      });
      
    } catch (error) {
      console.warn(`   Dependency analysis failed: ${error.message}`);
    }
  }

  findPotentialDuplicates(deps) {
    const duplicates = [];
    const packages = Object.keys(deps);
    
    // Check for similar package names that might be duplicates
    const similarityGroups = [
      ['lodash', 'lodash-es', 'lodash.get', 'lodash.set'],
      ['moment', 'dayjs', 'date-fns'],
      ['axios', 'fetch', 'node-fetch', 'isomorphic-fetch'],
      ['react-router', 'reach-router', 'next/router'],
      ['styled-components', 'emotion', '@emotion/styled']
    ];
    
    similarityGroups.forEach(group => {
      const found = packages.filter(pkg => group.includes(pkg));
      if (found.length > 1) {
        duplicates.push(found);
      }
    });
    
    return duplicates;
  }

  analyzeBundleReport(report) {
    // Analyze webpack bundle report for security issues
    if (report.children) {
      report.children.forEach(child => {
        if (child.modules) {
          child.modules.forEach(module => {
            // Check for large modules
            if (module.size > 500 * 1024) { // > 500KB
              this.issues.push({
                type: 'large-module',
                module: module.name,
                size: module.size,
                severity: 'warning',
                message: `Large module: ${this.formatSize(module.size)}`
              });
            }
            
            // Check for suspicious module names
            if (module.name.includes('node_modules') && 
                (module.name.includes('test') || module.name.includes('demo'))) {
              this.issues.push({
                type: 'test-code-in-bundle',
                module: module.name,
                severity: 'warning',
                message: 'Test/demo code included in production bundle'
              });
            }
          });
        }
      });
    }
  }

  async checkForSecrets() {
    console.log('🔑 Checking for Exposed Secrets...');
    
    // Check build output for common secret patterns
    const buildFiles = this.getAllBuildFiles();
    
    buildFiles.forEach(file => {
      if (file.endsWith('.js') || file.endsWith('.html')) {
        try {
          const content = fs.readFileSync(file, 'utf8');
          
          // Environment variable leaks
          const envLeakPatterns = [
            /process\.env\.[A-Z_]+/g,
            /NODE_ENV.*production/g,
            /API_KEY.*['"]/g,
            /SECRET.*['"]/g
          ];
          
          envLeakPatterns.forEach(pattern => {
            const matches = content.match(pattern);
            if (matches && matches.length > 0) {
              this.issues.push({
                type: 'env-leak',
                file: path.basename(file),
                severity: 'medium',
                matches: matches.slice(0, 5), // Limit to first 5 matches
                message: 'Environment variables exposed in bundle'
              });
            }
          });

        } catch {
          // Ignore files that can't be read
        }
      }
    });
  }

  getAllBuildFiles() {
    const files = [];
    
    function walkDir(dir) {
      if (!fs.existsSync(dir)) return;
      
      const items = fs.readdirSync(dir);
      items.forEach(item => {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          walkDir(fullPath);
        } else {
          files.push(fullPath);
        }
      });
    }
    
    walkDir(this.buildDir);
    return files;
  }

  async analyzePerformanceImpact() {
    console.log('⚡ Analyzing Performance Impact...');
    
    const chunks = this.bundleInfo.chunks || [];
    let totalSize = 0;
    let jsSize = 0;
    let cssSize = 0;
    
    chunks.forEach(chunk => {
      totalSize += chunk.size;
      if (chunk.type === 'javascript') {
        jsSize += chunk.size;
      } else if (chunk.type === 'css') {
        cssSize += chunk.size;
      }
    });
    
    this.bundleInfo.totalSize = totalSize;
    this.bundleInfo.jsSize = jsSize;
    this.bundleInfo.cssSize = cssSize;
    
    // Performance recommendations
    if (jsSize > 1024 * 1024) { // > 1MB JS
      this.recommendations.push({
        type: 'performance',
        message: `Large JavaScript bundle (${this.formatSize(jsSize)}). Consider code splitting.`
      });
    }
    
    if (chunks.length > 50) {
      this.recommendations.push({
        type: 'performance',
        message: `Many chunks (${chunks.length}). Consider chunk optimization.`
      });
    }
  }

  formatSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  generateReport() {
    console.log('\n📋 Bundle Security Analysis Report');
    console.log('==================================\n');

    // Summary
    const critical = this.issues.filter(i => i.severity === 'critical').length;
    const high = this.issues.filter(i => i.severity === 'high').length;
    const medium = this.issues.filter(i => i.severity === 'medium').length;
    const low = this.issues.filter(i => i.severity === 'low').length;

    console.log('📊 BUNDLE STATISTICS:');
    console.log(`   Total Size: ${this.formatSize(this.bundleInfo.totalSize || 0)}`);
    console.log(`   JavaScript: ${this.formatSize(this.bundleInfo.jsSize || 0)}`);
    console.log(`   CSS: ${this.formatSize(this.bundleInfo.cssSize || 0)}`);
    console.log(`   Chunks: ${this.bundleInfo.chunks?.length || 0}`);
    console.log(`   Pages: ${this.bundleInfo.pages || 0}\n`);

    console.log('🚨 SECURITY ISSUES:');
    console.log(`   Critical: ${critical}`);
    console.log(`   High: ${high}`);
    console.log(`   Medium: ${medium}`);
    console.log(`   Low: ${low}\n`);

    // Critical issues
    if (critical > 0) {
      console.log('🚨 CRITICAL ISSUES:');
      this.issues
        .filter(i => i.severity === 'critical')
        .forEach(issue => {
          console.log(`   • ${issue.type}: ${issue.message}`);
          if (issue.file) console.log(`     File: ${issue.file}`);
        });
      console.log();
    }

    // High severity issues
    if (high > 0) {
      console.log('🔴 HIGH SEVERITY ISSUES:');
      this.issues
        .filter(i => i.severity === 'high')
        .forEach(issue => {
          console.log(`   • ${issue.type}: ${issue.message}`);
          if (issue.file) console.log(`     File: ${issue.file}`);
        });
      console.log();
    }

    // Recommendations
    if (this.recommendations.length > 0) {
      console.log('💡 RECOMMENDATIONS:');
      this.recommendations.forEach(rec => {
        console.log(`   • ${rec.message}`);
      });
      console.log();
    }

    // Save detailed report
    this.saveDetailedReport();

    // Exit with appropriate code
    if (critical > 0) {
      console.log('❌ Bundle analysis failed due to critical security issues');
      process.exit(1);
    } else if (high > 0) {
      console.log('⚠️  Bundle analysis completed with high severity issues');
      process.exit(1);
    } else {
      console.log('✅ Bundle security analysis passed');
      process.exit(0);
    }
  }

  saveDetailedReport() {
    const report = {
      timestamp: new Date().toISOString(),
      bundleInfo: this.bundleInfo,
      issues: this.issues,
      recommendations: this.recommendations,
      summary: {
        critical: this.issues.filter(i => i.severity === 'critical').length,
        high: this.issues.filter(i => i.severity === 'high').length,
        medium: this.issues.filter(i => i.severity === 'medium').length,
        low: this.issues.filter(i => i.severity === 'low').length
      }
    };

    const reportPath = path.join(process.cwd(), 'bundle-security-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`📄 Detailed report saved to: ${reportPath}`);
  }
}

// Run the analyzer
if (import.meta.url === `file://${process.argv[1]}`) {
  const analyzer = new BundleSecurityAnalyzer();
  analyzer.analyze().catch(error => {
    console.error('Analysis failed:', error);
    process.exit(1);
  });
}

export default BundleSecurityAnalyzer;