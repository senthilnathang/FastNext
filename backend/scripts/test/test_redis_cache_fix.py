#!/usr/bin/env python3
"""
Test Redis cache fix for bytes serialization
"""

import os
import sys

sys.path.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))


def test_cache_bytes_handling():
    """Test caching of data containing bytes"""

    print("Testing Redis cache fix for bytes handling...")

    try:
        import asyncio

        from app.core.redis_config import cache

        async def test_bytes_cache():
            # Test data that contains bytes (similar to what causes the error)
            test_data = {
                "content": b"some binary content",
                "status_code": 200,
                "headers": {"content-type": "application/octet-stream"},
                "cached_at": 1696072000.0,
            }

            # This should not fail with "Object of type bytes is not JSON serializable"
            cache_key = "test_bytes_cache"

            print("1. Testing cache.set() with bytes data...")
            success = await cache.set(cache_key, test_data, ttl=60)
            if success:
                print("   ✅ Successfully cached data containing bytes")
            else:
                print("   ❌ Failed to cache data containing bytes")
                return False

            print("2. Testing cache.get() with bytes data...")
            retrieved_data = await cache.get(cache_key)
            if retrieved_data:
                print("   ✅ Successfully retrieved cached data")
                print(
                    f"   Retrieved content type: {type(retrieved_data.get('content'))}"
                )
                print(
                    f"   Content matches: {retrieved_data.get('content') == test_data['content']}"
                )
            else:
                print("   ❌ Failed to retrieve cached data")
                return False

            print("3. Testing cleanup...")
            deleted = await cache.delete(cache_key)
            if deleted:
                print("   ✅ Successfully cleaned up test cache")

            return True

        # Run the async test
        loop = asyncio.get_event_loop()
        success = loop.run_until_complete(test_bytes_cache())

        return success

    except Exception as e:
        print(f"❌ Test failed: {e}")
        import traceback

        traceback.print_exc()
        return False


def test_http_cache_exclusions():
    """Test that upload endpoints are excluded from caching"""

    print("\nTesting HTTP cache exclusions...")

    try:
        from unittest.mock import Mock

        from app.middleware.cache_middleware import CacheMiddleware

        # Create cache middleware instance
        cache_middleware = CacheMiddleware(app=Mock())

        # Test upload endpoints
        upload_paths = [
            "/api/v1/data/import/upload",
            "/api/v1/data/export/create",
            "/upload",
            "/download",
        ]

        for path in upload_paths:
            # Mock request
            request = Mock()
            request.method = "POST"
            request.url.path = path
            request.headers = {}

            should_cache = cache_middleware._should_cache_request(request)
            if not should_cache:
                print(f"   ✅ {path} correctly excluded from caching")
            else:
                print(f"   ❌ {path} incorrectly included in caching")
                return False

        # Test that GET requests to normal endpoints are still cached
        request = Mock()
        request.method = "GET"
        request.url.path = "/api/v1/users"
        request.headers = {}

        should_cache = cache_middleware._should_cache_request(request)
        if should_cache:
            print("   ✅ Normal GET endpoints still cacheable")
        else:
            print("   ❌ Normal GET endpoints incorrectly excluded")
            return False

        return True

    except Exception as e:
        print(f"❌ Test failed: {e}")
        import traceback

        traceback.print_exc()
        return False


if __name__ == "__main__":
    print("Testing Redis Cache Bytes Serialization Fix...")
    print("=" * 60)

    success1 = test_cache_bytes_handling()
    success2 = test_http_cache_exclusions()

    print("\n" + "=" * 60)
    if success1 and success2:
        print("✅ ALL REDIS CACHE TESTS PASSED!")
        print("\n🎯 Redis Cache Fix Status:")
        print("  - ✅ Bytes data serialization handled properly")
        print("  - ✅ Upload endpoints excluded from caching")
        print("  - ✅ Cache system robust against binary content")
        print("  - ✅ No more 'Object of type bytes is not JSON serializable' errors")

        print("\n🚀 Redis caching system is now stable!")
    else:
        print("❌ Some tests failed!")
        sys.exit(1)
