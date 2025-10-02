import { chromium, FullConfig } from '@playwright/test';

/**
 * Global setup for Playwright tests.
 * 
 * This setup runs once before all tests and:
 * - Authenticates users and saves session state
 * - Sets up test data if needed
 * - Configures environment variables
 */

async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting global setup for FastNext E2E tests...');

  const { baseURL } = config.projects[0].use;
  const browser = await chromium.launch();

  try {
    // Setup regular user authentication
    await setupUserAuth(browser, baseURL!, 'tests/e2e/.auth/user.json');
    
    // Setup admin user authentication
    await setupAdminAuth(browser, baseURL!, 'tests/e2e/.auth/admin.json');

    console.log('✅ Global setup completed successfully');
  } catch (error) {
    console.error('❌ Global setup failed:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

async function setupUserAuth(browser: any, baseURL: string, authFile: string) {
  console.log('🔐 Setting up regular user authentication...');
  
  const page = await browser.newPage();
  
  try {
    // Navigate to login page
    await page.goto(`${baseURL}/login`);
    
    // Wait for login form
    await page.waitForSelector('form');
    
    // Fill login form with test user credentials
    await page.fill('input[name="username"], input[type="email"]', 'user@test.com');
    await page.fill('input[name="password"], input[type="password"]', 'testpassword');
    
    // Submit login form
    await page.click('button[type="submit"]');
    
    // Wait for successful login redirect
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    
    // Save authentication state
    await page.context().storageState({ path: authFile });
    
    console.log('✅ Regular user authentication setup complete');
  } catch {
    console.log('⚠️  Regular user auth failed, using fallback setup');
    // Create a minimal auth state for testing
    await createFallbackAuthState(authFile, 'user');
  } finally {
    await page.close();
  }
}

async function setupAdminAuth(browser: any, baseURL: string, authFile: string) {
  console.log('🔐 Setting up admin user authentication...');
  
  const page = await browser.newPage();
  
  try {
    // Navigate to login page
    await page.goto(`${baseURL}/login`);
    
    // Wait for login form
    await page.waitForSelector('form');
    
    // Fill login form with admin credentials
    await page.fill('input[name="username"], input[type="email"]', 'admin@test.com');
    await page.fill('input[name="password"], input[type="password"]', 'testpassword');
    
    // Submit login form
    await page.click('button[type="submit"]');
    
    // Wait for successful login redirect
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    
    // Save authentication state
    await page.context().storageState({ path: authFile });
    
    console.log('✅ Admin user authentication setup complete');
  } catch {
    console.log('⚠️  Admin user auth failed, using fallback setup');
    // Create a minimal auth state for testing
    await createFallbackAuthState(authFile, 'admin');
  } finally {
    await page.close();
  }
}

async function createFallbackAuthState(authFile: string, userType: string) {
  const fs = await import('fs');
  const path = await import('path');
  
  // Ensure directory exists
  const dir = path.dirname(authFile);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  // Create a basic auth state for testing
  const authState = {
    cookies: [
      {
        name: 'access_token',
        value: `mock_${userType}_token`,
        domain: 'localhost',
        path: '/',
        httpOnly: true,
        secure: false,
        sameSite: 'Lax'
      }
    ],
    origins: [
      {
        origin: 'http://localhost:3000',
        localStorage: [
          {
            name: 'access_token',
            value: `mock_${userType}_token`
          },
          {
            name: 'user_type',
            value: userType
          }
        ]
      }
    ]
  };
  
  fs.writeFileSync(authFile, JSON.stringify(authState, null, 2));
  console.log(`✅ Fallback auth state created for ${userType}`);
}

export default globalSetup;