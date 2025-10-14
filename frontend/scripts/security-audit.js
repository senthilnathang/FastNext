#!/usr/bin/env node

/**
 * Security Audit Script for FastNext
 * Analyzes dependencies for vulnerabilities and security issues
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

class SecurityAuditor {
  constructor() {
    this.vulnerabilities = [];
    this.warnings = [];
    this.info = [];
    this.packageJsonPath = path.join(process.cwd(), 'package.json');
    this.lockFilePath = path.join(process.cwd(), 'package-lock.json');
  }

  async runAudit() {
    console.log('🔍 Starting Security Audit for FastNext...\n');

    try {
      // 1. NPM Audit
      await this.runNpmAudit();

      // 2. Dependency Analysis
      await this.analyzeDependencies();

      // 3. Bundle Analysis
      await this.analyzeBundleSize();

      // 4. License Check
      await this.checkLicenses();

      // 5. Outdated Packages
      await this.checkOutdatedPackages();

      // 6. Security Headers Check
      await this.checkSecurityHeaders();

      // 7. Generate Report
      this.generateReport();

    } catch (error) {
      console.error('❌ Security audit failed:', error.message);
      process.exit(1);
    }
  }

  async runNpmAudit() {
    console.log('📋 Running NPM Security Audit...');

    try {
      const auditResult = execSync('npm audit --json', {
        encoding: 'utf8',
        stdio: 'pipe'
      });

      const audit = JSON.parse(auditResult);

      if (audit.vulnerabilities) {
        Object.entries(audit.vulnerabilities).forEach(([pkg, vuln]) => {
          this.vulnerabilities.push({
            type: 'npm-vulnerability',
            package: pkg,
            severity: vuln.severity,
            title: vuln.title,
            url: vuln.url,
            range: vuln.range
          });
        });
      }

      console.log(`   Found ${Object.keys(audit.vulnerabilities || {}).length} vulnerabilities`);

    } catch (error) {
      if (error.status === 1) {
        // NPM audit found vulnerabilities
        try {
          const audit = JSON.parse(error.stdout);
          if (audit.vulnerabilities) {
            Object.entries(audit.vulnerabilities).forEach(([pkg, vuln]) => {
              this.vulnerabilities.push({
                type: 'npm-vulnerability',
                package: pkg,
                severity: vuln.severity,
                title: vuln.title,
                url: vuln.url
              });
            });
          }
        } catch {
          this.warnings.push({
            type: 'audit-error',
            message: 'Failed to parse NPM audit results'
          });
        }
      } else {
        this.warnings.push({
          type: 'audit-error',
          message: `NPM audit failed: ${error.message}`
        });
      }
    }
  }

  async analyzeDependencies() {
    console.log('📦 Analyzing Dependencies...');

    if (!fs.existsSync(this.packageJsonPath)) {
      this.warnings.push({
        type: 'missing-file',
        message: 'package.json not found'
      });
      return;
    }

    const packageJson = JSON.parse(fs.readFileSync(this.packageJsonPath, 'utf8'));
    const allDeps = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies
    };

    // Check for suspicious packages
    const suspiciousPatterns = [
      /^[a-z]{1,2}$/,  // Very short names
      /^\d+$/,         // Only numbers
      /test|debug|temp/i // Test/debug packages
    ];

    Object.keys(allDeps).forEach(dep => {
      suspiciousPatterns.forEach(pattern => {
        if (pattern.test(dep)) {
          this.warnings.push({
            type: 'suspicious-package',
            package: dep,
            reason: 'Unusual package name pattern'
          });
        }
      });
    });

    // Check for known problematic packages
    const problematicPackages = [
      'lodash', // Security issues in old versions
      'moment', // Large bundle size, deprecated
      'request', // Deprecated
      'babel-polyfill' // Large bundle impact
    ];

    problematicPackages.forEach(pkg => {
      if (allDeps[pkg]) {
        this.warnings.push({
          type: 'problematic-package',
          package: pkg,
          reason: this.getPackageIssue(pkg)
        });
      }
    });

    console.log(`   Analyzed ${Object.keys(allDeps).length} dependencies`);
  }

  getPackageIssue(pkg) {
    const issues = {
      'lodash': 'Has had security vulnerabilities, consider lodash-es',
      'moment': 'Large bundle size and deprecated, use date-fns or dayjs',
      'request': 'Deprecated package, use axios or fetch',
      'babel-polyfill': 'Large bundle impact, use core-js directly'
    };
    return issues[pkg] || 'Known issues with this package';
  }

  async analyzeBundleSize() {
    console.log('📊 Analyzing Bundle Size...');

    try {
      // Run bundle analyzer if available
      if (fs.existsSync(path.join(process.cwd(), 'node_modules', '@next', 'bundle-analyzer'))) {
        execSync('npm run analyze 2>/dev/null || true', { stdio: 'pipe' });
      }

      // Check for large dependencies
      const packageJson = JSON.parse(fs.readFileSync(this.packageJsonPath, 'utf8'));
      const largeDependencies = [
        '@emotion/react',
        '@mui/material',
        'antd',
        'lodash',
        'moment',
        'rxjs'
      ];

      largeDependencies.forEach(dep => {
        if (packageJson.dependencies?.[dep] || packageJson.devDependencies?.[dep]) {
          this.info.push({
            type: 'large-dependency',
            package: dep,
            message: 'Large dependency detected - consider bundle impact'
          });
        }
      });

    } catch (error) {
      this.warnings.push({
        type: 'bundle-analysis-error',
        message: `Bundle analysis failed: ${error.message}`
      });
    }
  }

  async checkLicenses() {
    console.log('📄 Checking Licenses...');

    try {
      const result = execSync('npx license-checker --json --onlyAllow "MIT;Apache-2.0;BSD-2-Clause;BSD-3-Clause;ISC" 2>/dev/null || echo "{}"', {
        encoding: 'utf8',
        stdio: 'pipe'
      });

      const licenses = JSON.parse(result);
      const restrictiveLicenses = ['GPL', 'AGPL', 'LGPL', 'CDDL', 'EPL'];

      Object.entries(licenses).forEach(([pkg, info]) => {
        if (info.licenses) {
          const license = Array.isArray(info.licenses) ? info.licenses.join(',') : info.licenses;
          restrictiveLicenses.forEach(restrictive => {
            if (license.includes(restrictive)) {
              this.warnings.push({
                type: 'restrictive-license',
                package: pkg,
                license: license
              });
            }
          });
        }
      });

    } catch {
      this.warnings.push({
        type: 'license-check-error',
        message: 'License check failed - install license-checker'
      });
    }
  }

  async checkOutdatedPackages() {
    console.log('🔄 Checking for Outdated Packages...');

    try {
      const result = execSync('npm outdated --json', {
        encoding: 'utf8',
        stdio: 'pipe'
      });

      const outdated = JSON.parse(result);
      Object.entries(outdated).forEach(([pkg, info]) => {
        const currentMajor = parseInt(info.current.split('.')[0]);
        const latestMajor = parseInt(info.latest.split('.')[0]);

        if (latestMajor > currentMajor) {
          this.warnings.push({
            type: 'major-update-available',
            package: pkg,
            current: info.current,
            latest: info.latest
          });
        }
      });

    } catch (error) {
      // npm outdated returns non-zero exit code when packages are outdated
      if (error.stdout) {
        try {
          const outdated = JSON.parse(error.stdout);
          this.info.push({
            type: 'outdated-packages',
            count: Object.keys(outdated).length,
            message: 'Some packages have updates available'
          });
        } catch {
          // Ignore parse errors
        }
      }
    }
  }

  async checkSecurityHeaders() {
    console.log('🛡️  Checking Security Configuration...');

    // Check if security middleware exists
    const middlewarePath = path.join(process.cwd(), 'middleware.ts');
    if (!fs.existsSync(middlewarePath)) {
      this.warnings.push({
        type: 'missing-middleware',
        message: 'No middleware.ts found - security middleware missing'
      });
    } else {
      const middlewareContent = fs.readFileSync(middlewarePath, 'utf8');

      // Check for security features
      const securityFeatures = [
        { pattern: /CSP|Content-Security-Policy/i, name: 'Content Security Policy' },
        { pattern: /X-Frame-Options/i, name: 'X-Frame-Options' },
        { pattern: /X-XSS-Protection/i, name: 'XSS Protection' },
        { pattern: /rateLimit/i, name: 'Rate Limiting' },
        { pattern: /HSTS|Strict-Transport-Security/i, name: 'HSTS' }
      ];

      securityFeatures.forEach(feature => {
        if (!feature.pattern.test(middlewareContent)) {
          this.warnings.push({
            type: 'missing-security-feature',
            feature: feature.name,
            message: `${feature.name} not found in middleware`
          });
        }
      });
    }

    // Check next.config.ts
    const nextConfigPath = path.join(process.cwd(), 'next.config.ts');
    if (fs.existsSync(nextConfigPath)) {
      const configContent = fs.readFileSync(nextConfigPath, 'utf8');

      if (!configContent.includes('headers()')) {
        this.warnings.push({
          type: 'missing-security-headers',
          message: 'No security headers configured in next.config.ts'
        });
      }
    }
  }

  generateReport() {
    console.log('\n📋 Security Audit Report');
    console.log('========================\n');

    // Summary
    const criticalVulns = this.vulnerabilities.filter(v => v.severity === 'critical').length;
    const highVulns = this.vulnerabilities.filter(v => v.severity === 'high').length;
    const totalVulns = this.vulnerabilities.length;

    console.log(`🚨 Vulnerabilities: ${totalVulns} total (${criticalVulns} critical, ${highVulns} high)`);
    console.log(`⚠️  Warnings: ${this.warnings.length}`);
    console.log(`ℹ️  Info: ${this.info.length}\n`);

    // Critical vulnerabilities
    if (criticalVulns > 0) {
      console.log('🚨 CRITICAL VULNERABILITIES:');
      this.vulnerabilities
        .filter(v => v.severity === 'critical')
        .forEach(v => {
          console.log(`   • ${v.package}: ${v.title}`);
          if (v.url) console.log(`     ${v.url}`);
        });
      console.log();
    }

    // High vulnerabilities
    if (highVulns > 0) {
      console.log('🔴 HIGH SEVERITY VULNERABILITIES:');
      this.vulnerabilities
        .filter(v => v.severity === 'high')
        .forEach(v => {
          console.log(`   • ${v.package}: ${v.title}`);
        });
      console.log();
    }

    // Warnings
    if (this.warnings.length > 0) {
      console.log('⚠️  WARNINGS:');
      this.warnings.forEach(w => {
        console.log(`   • ${w.type}: ${w.message || w.reason}`);
        if (w.package) console.log(`     Package: ${w.package}`);
      });
      console.log();
    }

    // Recommendations
    console.log('💡 RECOMMENDATIONS:');

    if (totalVulns > 0) {
      console.log('   • Run "npm audit fix" to resolve vulnerabilities');
    }

    if (this.warnings.some(w => w.type === 'outdated-packages')) {
      console.log('   • Update outdated packages with "npm update"');
    }

    if (this.warnings.some(w => w.type === 'missing-security-feature')) {
      console.log('   • Implement missing security features in middleware');
    }

    console.log('   • Regularly run security audits');
    console.log('   • Keep dependencies updated');
    console.log('   • Review and update security policies');

    // Write detailed report to file
    this.writeDetailedReport();

    // Exit with error code if critical issues found
    if (criticalVulns > 0) {
      console.log('\n❌ Security audit failed due to critical vulnerabilities');
      process.exit(1);
    } else if (totalVulns > 0) {
      console.log('\n⚠️  Security audit completed with vulnerabilities found');
      process.exit(1);
    } else {
      console.log('\n✅ Security audit passed');
      process.exit(0);
    }
  }

  writeDetailedReport() {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        vulnerabilities: this.vulnerabilities.length,
        warnings: this.warnings.length,
        info: this.info.length
      },
      vulnerabilities: this.vulnerabilities,
      warnings: this.warnings,
      info: this.info
    };

    const reportPath = path.join(process.cwd(), 'security-audit-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📄 Detailed report saved to: ${reportPath}`);
  }
}

// Run the audit
if (import.meta.url === `file://${process.argv[1]}`) {
  const auditor = new SecurityAuditor();
  auditor.runAudit().catch(error => {
    console.error('Audit failed:', error);
    process.exit(1);
  });
}

export default SecurityAuditor;
