"""
GraphQL Integration Tests
Test the GraphQL implementation with the backend
"""

import asyncio
import json
import logging
from typing import Any, Dict

import httpx

logger = logging.getLogger(__name__)


class GraphQLTester:
    """Test GraphQL implementation"""

    def __init__(self, base_url: str = "http://localhost:8000"):
        self.base_url = base_url
        self.graphql_url = f"{base_url}/api/v1/graphql"

    async def test_graphql_endpoint(self) -> Dict[str, Any]:
        """Test if GraphQL endpoint is accessible"""

        try:
            async with httpx.AsyncClient() as client:
                # Test GET request (GraphiQL interface)
                response = await client.get(self.graphql_url)

                return {
                    "endpoint_accessible": response.status_code == 200,
                    "status_code": response.status_code,
                    "content_type": response.headers.get("content-type", ""),
                    "has_graphiql": (
                        "GraphQL Interface" in response.text
                        if response.status_code == 200
                        else False
                    ),
                }
        except Exception as e:
            return {"endpoint_accessible": False, "error": str(e)}

    async def test_graphql_query(
        self, query: str, variables: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """Test a GraphQL query"""

        payload = {"query": query, "variables": variables or {}}

        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    self.graphql_url,
                    json=payload,
                    headers={"Content-Type": "application/json"},
                )

                return {
                    "success": response.status_code == 200,
                    "status_code": response.status_code,
                    "response": (
                        response.json()
                        if response.status_code == 200
                        else response.text
                    ),
                    "headers": dict(response.headers),
                }
        except Exception as e:
            return {"success": False, "error": str(e)}

    async def test_basic_queries(self) -> Dict[str, Any]:
        """Test basic GraphQL queries"""

        test_results = {}

        # Test queries
        queries = {
            "users": "query { users { edges { id username email } totalCount } }",
            "projects": "query { projects { edges { id name description } totalCount } }",
            "roles": "query { roles { id name description } }",
            "permissions": "query { permissions { id name description } }",
        }

        for query_name, query in queries.items():
            logger.info(f"Testing {query_name} query...")
            result = await self.test_graphql_query(query)
            test_results[query_name] = result

        return test_results

    async def test_mutations(self) -> Dict[str, Any]:
        """Test GraphQL mutations"""

        test_results = {}

        # Test mutations
        mutations = {
            "createProject": {
                "query": """
                    mutation CreateProject($input: ProjectInput!) {
                        createProject(input: $input) {
                            success
                            message
                            project { id name }
                        }
                    }
                """,
                "variables": {
                    "input": {
                        "name": "Test GraphQL Project",
                        "description": "Created via GraphQL mutation test",
                        "isPublic": False,
                    }
                },
            }
        }

        for mutation_name, mutation_data in mutations.items():
            logger.info(f"Testing {mutation_name} mutation...")
            result = await self.test_graphql_query(
                mutation_data["query"], mutation_data["variables"]
            )
            test_results[mutation_name] = result

        return test_results

    async def test_authentication(self, token: str = None) -> Dict[str, Any]:
        """Test GraphQL with authentication"""

        headers = {}
        if token:
            headers["Authorization"] = f"Bearer {token}"

        query = "query { me { id username email } }"

        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    self.graphql_url,
                    json={"query": query},
                    headers={**headers, "Content-Type": "application/json"},
                )

                return {
                    "success": response.status_code == 200,
                    "status_code": response.status_code,
                    "response": (
                        response.json()
                        if response.status_code == 200
                        else response.text
                    ),
                    "authenticated": token is not None,
                }
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "authenticated": token is not None,
            }

    async def run_comprehensive_test(self) -> Dict[str, Any]:
        """Run comprehensive GraphQL integration test"""

        logger.info("🚀 Starting GraphQL Integration Tests...")

        results = {"timestamp": asyncio.get_event_loop().time(), "tests": {}}

        # Test 1: Endpoint accessibility
        logger.info("\n📡 Testing GraphQL endpoint accessibility...")
        results["tests"]["endpoint"] = await self.test_graphql_endpoint()

        # Test 2: Basic queries
        logger.info("\n🔍 Testing basic GraphQL queries...")
        results["tests"]["queries"] = await self.test_basic_queries()

        # Test 3: Mutations
        logger.info("\n✏️ Testing GraphQL mutations...")
        results["tests"]["mutations"] = await self.test_mutations()

        # Test 4: Authentication (without token)
        logger.info("\n🔒 Testing authentication (no token)...")
        results["tests"]["auth_no_token"] = await self.test_authentication()

        # Test 5: Authentication (with mock token)
        logger.info("\n🔐 Testing authentication (with token)...")
        results["tests"]["auth_with_token"] = await self.test_authentication(
            "mock_token"
        )

        logger.info("\n✅ GraphQL Integration Tests Complete!")

        return results

    def print_test_summary(self, results: Dict[str, Any]):
        """Print a summary of test results"""

        logger.info("\n" + "=" * 60)
        logger.info("📊 GRAPHQL INTEGRATION TEST SUMMARY")
        logger.info("=" * 60)

        # Endpoint test
        endpoint_result = results["tests"]["endpoint"]
        status = "✅ PASS" if endpoint_result.get("endpoint_accessible") else "❌ FAIL"
        logger.info(f"GraphQL Endpoint: {status}")
        if endpoint_result.get("has_graphiql"):
            logger.info("  • GraphiQL Interface: ✅ Available")

        # Query tests
        logger.info(f"\nQuery Tests:")
        for query_name, query_result in results["tests"]["queries"].items():
            status = "✅ PASS" if query_result.get("success") else "❌ FAIL"
            logger.info(f"  • {query_name}: {status}")

        # Mutation tests
        logger.info(f"\nMutation Tests:")
        for mutation_name, mutation_result in results["tests"]["mutations"].items():
            status = "✅ PASS" if mutation_result.get("success") else "❌ FAIL"
            logger.info(f"  • {mutation_name}: {status}")

        # Authentication tests
        logger.info(f"\nAuthentication Tests:")
        auth_no_token = results["tests"]["auth_no_token"]
        auth_with_token = results["tests"]["auth_with_token"]

        logger.info(
            f"  • Without token: {'✅ PASS' if not auth_no_token.get('success') else '❌ FAIL'}"
        )
        logger.info(
            f"  • With token: {'✅ PASS' if auth_with_token.get('success') else '❌ FAIL'}"
        )

        logger.info("\n" + "=" * 60)
        logger.info("🔗 GraphQL Endpoint: http://localhost:8000/api/v1/graphql")
        logger.info("📖 Documentation: Available in GraphiQL interface")
        logger.info("=" * 60)


async def main():
    """Run GraphQL integration tests"""

    tester = GraphQLTester()
    results = await tester.run_comprehensive_test()
    tester.print_test_summary(results)

    # Save detailed results
    with open("graphql_test_results.json", "w") as f:
        json.dump(results, f, indent=2)

    logger.info("\n💾 Detailed results saved to: graphql_test_results.json")


if __name__ == "__main__":
    asyncio.run(main())
