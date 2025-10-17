import crypto from 'crypto';
import * as React from 'react';

interface SRIResource {
  url: string;
  integrity: string;
  crossorigin?: 'anonymous' | 'use-credentials';
}

// Pre-computed SRI hashes for common CDN resources
export const SRI_HASHES: Record<string, SRIResource> = {
  // No external CDN resources - all assets should be self-hosted
};

// Generate SRI hash for a given content
export function generateSRIHash(content: string, algorithm: 'sha256' | 'sha384' | 'sha512' = 'sha384'): string {
  const hash = crypto.createHash(algorithm).update(content, 'utf8').digest('base64');
  return `${algorithm}-${hash}`;
}

// Generate SRI hash from URL
export async function generateSRIFromURL(url: string, algorithm: 'sha256' | 'sha384' | 'sha512' = 'sha384'): Promise<string> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
    }

    const content = await response.text();
    return generateSRIHash(content, algorithm);
  } catch (error) {
    console.error(`Error generating SRI hash for ${url}:`, error);
    throw error;
  }
}

// Verify SRI hash
export function verifySRIHash(content: string, expectedHash: string): boolean {
  try {
    const [algorithm, expectedHashValue] = expectedHash.split('-');
    if (!algorithm || !expectedHashValue) {
      return false;
    }

    const actualHash = crypto.createHash(algorithm).update(content, 'utf8').digest('base64');
    return actualHash === expectedHashValue;
  } catch (error) {
    console.error('Error verifying SRI hash:', error);
    return false;
  }
}

// React component for secure script loading with SRI
export interface SecureScriptProps {
  src: string;
  integrity?: string;
  crossOrigin?: 'anonymous' | 'use-credentials';
  async?: boolean;
  defer?: boolean;
  onLoad?: () => void;
  onError?: (error: Event) => void;
}

export function SecureScript({
  src,
  integrity,
  crossOrigin = 'anonymous',
  async = true,
  defer = false,
  onLoad,
  onError
}: SecureScriptProps) {
  // Check if we have a pre-computed hash
  const knownResource = Object.values(SRI_HASHES).find(resource => resource.url === src);
  const finalIntegrity = integrity || knownResource?.integrity;

  if (!finalIntegrity) {
    console.warn(`No SRI hash provided for script: ${src}. This is a security risk.`);
  }

  const script = document.createElement('script');
  script.src = src;
  if (finalIntegrity) script.integrity = finalIntegrity;
  if (crossOrigin) script.crossOrigin = crossOrigin;
  script.async = async;
  script.defer = defer;
  if (onLoad) script.onload = onLoad;
  if (onError) script.onerror = (event) => onError(event instanceof Event ? event : new Event('error'));

  return script;
}

// React component for secure stylesheet loading with SRI
export interface SecureStylesheetProps {
  href: string;
  integrity?: string;
  crossOrigin?: 'anonymous' | 'use-credentials';
  media?: string;
  onLoad?: () => void;
  onError?: (error: Event) => void;
}

export function SecureStylesheet({
  href,
  integrity,
  crossOrigin = 'anonymous',
  media = 'all',
  onLoad,
  onError
}: SecureStylesheetProps) {
  const knownResource = Object.values(SRI_HASHES).find(resource => resource.url === href);
  const finalIntegrity = integrity || knownResource?.integrity;

  if (!finalIntegrity) {
    console.warn(`No SRI hash provided for stylesheet: ${href}. This is a security risk.`);
  }

  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = href;
  if (finalIntegrity) link.integrity = finalIntegrity;
  if (crossOrigin) link.crossOrigin = crossOrigin;
  if (media) link.media = media;
  if (onLoad) link.onload = onLoad;
  if (onError) link.onerror = (event) => onError(event instanceof Event ? event : new Event('error'));

  return link;
}

// Hook for dynamically loading scripts with SRI
export function useSecureScript(src: string, integrity?: string) {
  const [loaded, setLoaded] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    // Check if script is already loaded
    const existingScript = document.querySelector(`script[src="${src}"]`);
    if (existingScript) {
      setLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.crossOrigin = 'anonymous';

    // Set integrity if provided
    const knownResource = Object.values(SRI_HASHES).find(resource => resource.url === src);
    const finalIntegrity = integrity || knownResource?.integrity;

    if (finalIntegrity) {
      script.integrity = finalIntegrity;
    } else {
      console.warn(`No SRI hash provided for script: ${src}. This is a security risk.`);
    }

    script.onload = () => {
      setLoaded(true);
      setError(null);
    };

    script.onerror = () => {
      setError(`Failed to load script: ${src}`);
      setLoaded(false);
    };

    document.head.appendChild(script);

    return () => {
      document.head.removeChild(script);
    };
  }, [src, integrity]);

  return { loaded, error };
}

// Utility to validate external resources before loading
export async function validateExternalResource(url: string, expectedIntegrity?: string): Promise<{
  isValid: boolean;
  actualIntegrity?: string;
  error?: string;
}> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      return {
        isValid: false,
        error: `HTTP ${response.status}: ${response.statusText}`
      };
    }

    const content = await response.text();
    const actualIntegrity = generateSRIHash(content);

    if (expectedIntegrity) {
      const isValid = verifySRIHash(content, expectedIntegrity);
      return {
        isValid,
        actualIntegrity,
        error: isValid ? undefined : 'Integrity hash mismatch'
      };
    }

    return {
      isValid: true,
      actualIntegrity
    };
  } catch (error) {
    return {
      isValid: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Batch validate multiple resources
export async function validateResourceBatch(resources: Array<{
  url: string;
  expectedIntegrity?: string;
}>): Promise<Array<{
  url: string;
  isValid: boolean;
  actualIntegrity?: string;
  error?: string;
}>> {
  const validationPromises = resources.map(async (resource) => {
    const result = await validateExternalResource(resource.url, resource.expectedIntegrity);
    return {
      url: resource.url,
      ...result
    };
  });

  return Promise.all(validationPromises);
}

// Development helper to generate SRI hashes for your resources
export class SRIGenerator {
  static async generateForURLs(urls: string[]): Promise<Record<string, SRIResource>> {
    const result: Record<string, SRIResource> = {};

    for (const url of urls) {
      try {
        const integrity = await generateSRIFromURL(url);
        result[url] = {
          url,
          integrity,
          crossorigin: 'anonymous'
        };

      } catch (error) {
        console.error(`Failed to generate SRI for ${url}:`, error);
      }
    }

    return result;
  }

  static async generateForFiles(files: Array<{ path: string; content: string }>): Promise<Record<string, string>> {
    const result: Record<string, string> = {};

    for (const file of files) {
      const integrity = generateSRIHash(file.content);
      result[file.path] = integrity;
    }

    return result;
  }
}
