/**
 * GraphQL Provider Component
 * Provides Apollo Client to the React component tree
 */
'use client';

import React from 'react';
import { ApolloProvider } from '@apollo/client';
import { getApolloClient } from './client';

interface GraphQLProviderProps {
  children: React.ReactNode;
}

export function GraphQLProvider({ children }: GraphQLProviderProps) {
  // Use React.useMemo to ensure client is created only once
  const client = React.useMemo(() => getApolloClient(), []);

  return (
    <ApolloProvider client={client}>
      {children}
    </ApolloProvider>
  );
}
