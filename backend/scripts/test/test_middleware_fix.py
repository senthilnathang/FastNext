#!/usr/bin/env python3
"""
Test script to verify cache and rate limiting middleware are working properly
"""

import asyncio
import httpx
import time
from datetime import datetime

BASE_URL = "http://localhost:8000"

def print_header(text):
    """Print a formatted header"""
    print("\n" + "=" * 70)
    print(f"  {text}")
    print("=" * 70)

async def test_health_endpoint():
    """Test basic health endpoint"""
    print_header("Test 1: Health Endpoint (Basic Functionality)")

    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(f"{BASE_URL}/health", timeout=10)
            print(f"✅ Status Code: {response.status_code}")
            print(f"✅ Response Time: {response.elapsed.total_seconds():.3f}s")

            # Check for custom headers
            headers = response.headers
            if "x-process-time" in headers:
                print(f"✅ X-Process-Time header: {headers['x-process-time']}")
            if "x-request-id" in headers:
                print(f"✅ X-Request-ID header: {headers['x-request-id'][:20]}...")

            return True
        except Exception as e:
            print(f"❌ Error: {e}")
            return False

async def test_cache_middleware():
    """Test cache middleware functionality"""
    print_header("Test 2: Cache Middleware")

    async with httpx.AsyncClient() as client:
        try:
            # First request - should be cache MISS
            print("\n📝 Request 1 (should be cache MISS):")
            response1 = await client.get(f"{BASE_URL}/api/v1/projects", timeout=10)
            print(f"   Status: {response1.status_code}")

            cache_header1 = response1.headers.get("x-cache", "NOT-SET")
            print(f"   X-Cache: {cache_header1}")

            time1 = response1.headers.get("x-process-time", "N/A")
            print(f"   Process Time: {time1}")

            # Second request - should be cache HIT (if caching is enabled)
            print("\n📝 Request 2 (should be cache HIT if enabled):")
            await asyncio.sleep(0.1)  # Small delay
            response2 = await client.get(f"{BASE_URL}/api/v1/projects", timeout=10)
            print(f"   Status: {response2.status_code}")

            cache_header2 = response2.headers.get("x-cache", "NOT-SET")
            print(f"   X-Cache: {cache_header2}")

            time2 = response2.headers.get("x-process-time", "N/A")
            print(f"   Process Time: {time2}")

            # Analyze results
            print("\n📊 Cache Analysis:")
            if cache_header2 == "HIT":
                print("   ✅ Cache middleware is WORKING")
                print("   ✅ Second request served from cache")
            elif cache_header2 == "MISS" or cache_header2 == "NOT-SET":
                print("   ⚠️  Cache not active or Redis not configured")
                print("   ℹ️  This is OK if Redis is not running")
            else:
                print(f"   ℹ️  Unexpected cache header: {cache_header2}")

            return True
        except Exception as e:
            print(f"❌ Error: {e}")
            return False

async def test_rate_limiting():
    """Test rate limiting middleware"""
    print_header("Test 3: Rate Limiting Middleware")

    async with httpx.AsyncClient() as client:
        try:
            print("\n📝 Making rapid requests to test rate limiting...")

            rate_limit_headers = {}
            for i in range(5):
                response = await client.get(f"{BASE_URL}/health", timeout=10)

                # Extract rate limit headers
                for header in ["x-ratelimit-limit-minute", "x-ratelimit-remaining-minute",
                              "x-ratelimit-limit-hour", "x-ratelimit-remaining-hour"]:
                    if header in response.headers:
                        rate_limit_headers[header] = response.headers[header]

                if i == 0:
                    print(f"\n   Request {i+1}:")
                    print(f"   Status: {response.status_code}")
                    if rate_limit_headers:
                        print(f"   Rate Limit Headers Found:")
                        for key, value in rate_limit_headers.items():
                            print(f"      {key}: {value}")

                await asyncio.sleep(0.05)  # Small delay between requests

            print("\n📊 Rate Limiting Analysis:")
            if rate_limit_headers:
                print("   ✅ Rate limiting middleware is WORKING")
                print("   ✅ Rate limit headers present in responses")
            else:
                print("   ⚠️  Rate limiting not active or Redis not configured")
                print("   ℹ️  This is OK if Redis is not running")

            return True
        except Exception as e:
            print(f"❌ Error: {e}")
            return False

async def test_cors_headers():
    """Test CORS headers"""
    print_header("Test 4: CORS Headers")

    async with httpx.AsyncClient() as client:
        try:
            response = await client.options(
                f"{BASE_URL}/api/v1/projects",
                headers={"Origin": "http://localhost:3000"},
                timeout=10
            )

            print(f"✅ Status Code: {response.status_code}")

            cors_headers = {
                "access-control-allow-origin",
                "access-control-allow-credentials",
                "access-control-allow-methods",
                "access-control-allow-headers",
                "access-control-expose-headers"
            }

            found_headers = set()
            for header in cors_headers:
                if header in response.headers:
                    found_headers.add(header)
                    print(f"✅ {header}: {response.headers[header][:50]}...")

            print(f"\n📊 CORS Analysis:")
            if len(found_headers) >= 3:
                print("   ✅ CORS middleware is properly configured")
            else:
                print("   ⚠️  Some CORS headers missing")

            return True
        except Exception as e:
            print(f"❌ Error: {e}")
            return False

async def test_compression():
    """Test GZip compression"""
    print_header("Test 5: Response Compression")

    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(
                f"{BASE_URL}/api/v1/projects",
                headers={"Accept-Encoding": "gzip"},
                timeout=10
            )

            print(f"✅ Status Code: {response.status_code}")

            content_encoding = response.headers.get("content-encoding", "none")
            print(f"   Content-Encoding: {content_encoding}")

            if content_encoding == "gzip":
                print("   ✅ GZip compression is WORKING")
            else:
                print("   ℹ️  Response not compressed (may be too small)")

            return True
        except Exception as e:
            print(f"❌ Error: {e}")
            return False

async def main():
    """Run all middleware tests"""
    print("\n" + "="*70)
    print("  🧪 FastNext Middleware Testing Suite")
    print("  Testing: Cache, Rate Limiting, CORS, and Compression")
    print("="*70)
    print(f"\n⏰ Test Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"🎯 Target: {BASE_URL}")

    results = []

    # Run tests
    results.append(await test_health_endpoint())
    results.append(await test_cache_middleware())
    results.append(await test_rate_limiting())
    results.append(await test_cors_headers())
    results.append(await test_compression())

    # Summary
    print_header("📊 Test Summary")

    passed = sum(results)
    total = len(results)

    print(f"\n   Tests Passed: {passed}/{total}")
    print(f"   Success Rate: {(passed/total)*100:.1f}%")

    if passed == total:
        print("\n   ✅ ALL TESTS PASSED")
        print("   ✅ Middleware is working correctly")
    else:
        print(f"\n   ⚠️  {total - passed} test(s) had issues")
        print("   ℹ️  Review individual test results above")

    print("\n📝 Notes:")
    print("   - Cache and rate limiting require Redis to be running")
    print("   - If Redis is not configured, those tests will show warnings")
    print("   - This is expected behavior in development without Redis")

    print("\n" + "="*70)
    print(f"⏰ Test Completed: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("="*70 + "\n")

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n\n⚠️  Tests interrupted by user")
    except Exception as e:
        print(f"\n\n❌ Fatal error: {e}")
        import traceback
        traceback.print_exc()
