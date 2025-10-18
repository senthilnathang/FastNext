/**
 * GraphQL Demo Page
 * Showcases the complete GraphQL implementation
 */
import { GraphQLDemo } from "@/components/graphql-examples";

export default function GraphQLDemoPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <GraphQLDemo />
    </div>
  );
}

export const metadata = {
  title: "GraphQL Demo - FastNext Framework",
  description:
    "Live demonstration of GraphQL queries, mutations, and real-time features",
};
