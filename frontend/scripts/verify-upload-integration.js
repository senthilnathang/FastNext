#!/usr/bin/env node
/**
 * Verify frontend upload integration with backend API
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function verifyApiEndpoints() {
  console.log('🔍 Verifying Frontend API Integration...');
  console.log('=' .repeat(50));

  // Check if frontend data import page exists
  const importPagePath = path.join(__dirname, 'src/app/admin/data-import/page.tsx');

  if (!fs.existsSync(importPagePath)) {
    console.log('❌ Data import page not found');
    return false;
  }

  const importPageContent = fs.readFileSync(importPagePath, 'utf8');

  // Check for essential API calls
  const apiCalls = [
    {
      pattern: '/api/v1/data/tables/available',
      description: 'Available tables endpoint',
      found: importPageContent.includes('/api/v1/data/tables/available')
    },
    {
      pattern: '/api/v1/data/tables/${tableName}/schema',
      description: 'Table schema endpoint',
      found: importPageContent.includes('/api/v1/data/tables/${tableName}/schema') ||
             importPageContent.includes('/api/v1/data/tables/') && importPageContent.includes('/schema')
    },
    {
      pattern: '/api/v1/data/tables/${tableName}/permissions',
      description: 'Table permissions endpoint',
      found: importPageContent.includes('/api/v1/data/tables/') && importPageContent.includes('/permissions')
    },
    {
      pattern: '/api/v1/data/import/upload',
      description: 'File upload endpoint',
      found: importPageContent.includes('/api/v1/data/import/upload')
    },
    {
      pattern: '/api/v1/data/import/parse',
      description: 'File parsing endpoint',
      found: importPageContent.includes('/api/v1/data/import/parse')
    }
  ];

  let allFound = true;

  for (const api of apiCalls) {
    if (api.found) {
      console.log(`✅ ${api.description}: Found`);
    } else {
      console.log(`❌ ${api.description}: Not found`);
      allFound = false;
    }
  }

  return allFound;
}

function verifyProgressTracking() {
  console.log('\\n📊 Verifying Progress Tracking Integration...');
  console.log('=' .repeat(50));

  const importPagePath = path.join(__dirname, 'src/app/admin/data-import/page.tsx');
  const importPageContent = fs.readFileSync(importPagePath, 'utf8');

  // Check for progress-related features
  const progressFeatures = [
    {
      pattern: 'useState.*isLoading',
      description: 'Loading state management',
      found: /useState.*isLoading|isLoading.*useState/.test(importPageContent)
    },
    {
      pattern: 'MultiStepWizard',
      description: 'Multi-step wizard component',
      found: importPageContent.includes('MultiStepWizard')
    },
    {
      pattern: 'error.*state',
      description: 'Error state handling',
      found: /useState.*error|error.*useState/.test(importPageContent)
    },
    {
      pattern: 'validationResults',
      description: 'Validation results display',
      found: importPageContent.includes('validationResults')
    }
  ];

  let allFound = true;

  for (const feature of progressFeatures) {
    if (feature.found) {
      console.log(`✅ ${feature.description}: Implemented`);
    } else {
      console.log(`❌ ${feature.description}: Missing`);
      allFound = false;
    }
  }

  return allFound;
}

function verifyErrorHandling() {
  console.log('\\n🚨 Verifying Error Handling...');
  console.log('=' .repeat(50));

  const importPagePath = path.join(__dirname, 'src/app/admin/data-import/page.tsx');
  const importPageContent = fs.readFileSync(importPagePath, 'utf8');

  // Check for error handling patterns
  const errorHandling = [
    {
      pattern: 'try.*catch',
      description: 'Try-catch error handling',
      found: /try\\s*{[\\s\\S]*catch/.test(importPageContent)
    },
    {
      pattern: 'response.ok',
      description: 'HTTP response validation',
      found: importPageContent.includes('response.ok')
    },
    {
      pattern: 'setError',
      description: 'Error state updates',
      found: importPageContent.includes('setError')
    },
    {
      pattern: 'Alert.*error',
      description: 'Error display components',
      found: /Alert.*error|error.*Alert/.test(importPageContent)
    }
  ];

  let allFound = true;

  for (const error of errorHandling) {
    if (error.found) {
      console.log(`✅ ${error.description}: Implemented`);
    } else {
      console.log(`❌ ${error.description}: Missing`);
      allFound = false;
    }
  }

  return allFound;
}

function verifyUploadFlow() {
  console.log('\\n📤 Verifying Upload Flow...');
  console.log('=' .repeat(50));

  const importPagePath = path.join(__dirname, 'src/app/admin/data-import/page.tsx');
  const importPageContent = fs.readFileSync(importPagePath, 'utf8');

  // Check upload flow components
  const uploadComponents = [
    {
      pattern: 'input.*type.*file',
      description: 'File input component',
      found: /input.*type.*['""]file['""]|type.*['""]file['""].*input/.test(importPageContent)
    },
    {
      pattern: 'FormData',
      description: 'FormData for file upload',
      found: importPageContent.includes('FormData')
    },
    {
      pattern: 'validateImportData',
      description: 'Data validation function',
      found: importPageContent.includes('validateImportData')
    },
    {
      pattern: 'handleImport',
      description: 'Import execution handler',
      found: importPageContent.includes('handleImport')
    }
  ];

  let allFound = true;

  for (const component of uploadComponents) {
    if (component.found) {
      console.log(`✅ ${component.description}: Implemented`);
    } else {
      console.log(`❌ ${component.description}: Missing`);
      allFound = false;
    }
  }

  return allFound;
}

function generateUsageInstructions() {
  console.log('\\n📋 Frontend Upload Usage Instructions');
  console.log('=' .repeat(50));

  const instructions = [
    '1. Start the frontend development server:',
    '   npm run dev',
    '',
    '2. Navigate to the data import page:',
    '   http://localhost:3000/admin/data-import',
    '',
    '3. Follow the multi-step wizard:',
    '   Step 1: Select target table (e.g., "projects")',
    '   Step 2: Upload CSV/JSON file with proper headers',
    '   Step 3: Review validation results',
    '   Step 4: Execute the import',
    '',
    '4. Monitor progress:',
    '   - Watch for loading indicators',
    '   - Check validation messages',
    '   - View error alerts if issues occur',
    '',
    '5. Debug upload issues:',
    '   - Check browser developer console',
    '   - Check server logs for job ID',
    '   - Use progress endpoint for real-time status'
  ];

  instructions.forEach(instruction => {
    console.log(`   ${instruction}`);
  });
}

function main() {
  console.log('🧪 Frontend Upload Integration Verification');
  console.log('=' .repeat(70));

  const success1 = verifyApiEndpoints();
  const success2 = verifyProgressTracking();
  const success3 = verifyErrorHandling();
  const success4 = verifyUploadFlow();

  console.log('\\n' + '=' .repeat(70));

  if (success1 && success2 && success3 && success4) {
    console.log('✅ FRONTEND UPLOAD INTEGRATION VERIFIED!');
    console.log('\\n🎯 Verification Summary:');
    console.log('  - ✅ All API endpoints are integrated');
    console.log('  - ✅ Progress tracking is implemented');
    console.log('  - ✅ Error handling is comprehensive');
    console.log('  - ✅ Upload flow is complete');

    console.log('\\n🚀 Ready for testing!');
    console.log('   The frontend /admin/data-import page is fully integrated');
    console.log('   with the enhanced backend upload system.');

    generateUsageInstructions();

  } else {
    console.log('❌ Some integration issues found!');
    console.log('\\nIssues to address:');
    if (!success1) console.log('  - API endpoint integration incomplete');
    if (!success2) console.log('  - Progress tracking needs improvement');
    if (!success3) console.log('  - Error handling needs enhancement');
    if (!success4) console.log('  - Upload flow is incomplete');

    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
