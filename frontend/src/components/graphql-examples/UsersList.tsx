/**
 * UsersList Component
 * Example GraphQL implementation with users query
 */
'use client';

import React, { useState } from 'react';
import { useUsers, usePagination } from '@/lib/graphql';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/components/ui/avatar';
import { Spinner } from '@/shared/components/ui/spinner';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';
import { Search, User, Mail, Calendar, ExternalLink } from 'lucide-react';

export function UsersList() {
  const [searchTerm, setSearchTerm] = useState('');
  const { variables, loadMore, reset } = usePagination();
  
  const { data, loading, error, fetchMore } = useUsers({
    ...variables,
    search: searchTerm || undefined,
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    reset();
  };

  const handleLoadMore = () => {
    if (data?.users.pageInfo.hasNextPage && data.users.pageInfo.endCursor) {
      fetchMore({
        variables: {
          ...variables,
          after: data.users.pageInfo.endCursor,
        },
        updateQuery: (prev, { fetchMoreResult }) => {
          if (!fetchMoreResult) return prev;
          
          return {
            users: {
              ...fetchMoreResult.users,
              edges: [...prev.users.edges, ...fetchMoreResult.users.edges],
            },
          };
        },
      });
    }
  };

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          Error loading users: {error.message}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Users ({data?.users.totalCount || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="flex gap-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users by name, email, or username..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button type="submit" variant="outline">
              Search
            </Button>
            {searchTerm && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setSearchTerm('');
                  reset();
                }}
              >
                Clear
              </Button>
            )}
          </form>

          {loading && !data && (
            <div className="flex items-center justify-center py-8">
              <Spinner className="h-8 w-8" />
              <span className="ml-2">Loading users...</span>
            </div>
          )}

          {data?.users.edges && (
            <div className="space-y-4">
              {data.users.edges.map((user) => (
                <Card key={user.id} className="p-4">
                  <div className="flex items-start space-x-4">
                    <Avatar>
                      <AvatarImage src={user.avatarUrl || undefined} alt={user.username} />
                      <AvatarFallback>
                        {user.fullName
                          ? user.fullName.split(' ').map(n => n[0]).join('').toUpperCase()
                          : user.username.substring(0, 2).toUpperCase()
                        }
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">
                          {user.fullName || user.username}
                        </h3>
                        <div className="flex gap-1">
                          {user.isActive ? (
                            <Badge variant="default">Active</Badge>
                          ) : (
                            <Badge variant="destructive">Inactive</Badge>
                          )}
                          {user.isVerified && (
                            <Badge variant="secondary">Verified</Badge>
                          )}
                          {user.isSuperuser && (
                            <Badge variant="outline">Admin</Badge>
                          )}
                        </div>
                      </div>

                      <div className="text-sm text-muted-foreground space-y-1">
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4" />
                          <span>@{user.username}</span>
                          <span>•</span>
                          <span>{user.email}</span>
                        </div>
                        
                        {user.location && (
                          <div className="flex items-center gap-2">
                            <span>{user.location}</span>
                          </div>
                        )}

                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          <span>
                            Joined {new Date(user.createdAt).toLocaleDateString()}
                          </span>
                          {user.lastLoginAt && (
                            <>
                              <span>•</span>
                              <span>
                                Last login {new Date(user.lastLoginAt).toLocaleDateString()}
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      {user.bio && (
                        <p className="text-sm">{user.bio}</p>
                      )}

                      {user.website && (
                        <a
                          href={user.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                        >
                          <ExternalLink className="h-3 w-3" />
                          Website
                        </a>
                      )}
                    </div>
                  </div>
                </Card>
              ))}

              {data.users.pageInfo.hasNextPage && (
                <div className="flex justify-center">
                  <Button
                    onClick={handleLoadMore}
                    disabled={loading}
                    variant="outline"
                  >
                    {loading ? (
                      <>
                        <Spinner className="h-4 w-4 mr-2" />
                        Loading...
                      </>
                    ) : (
                      'Load More'
                    )}
                  </Button>
                </div>
              )}

              {data.users.edges.length === 0 && searchTerm && (
                <div className="text-center py-8 text-muted-foreground">
                  <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No users found matching "{searchTerm}"</p>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setSearchTerm('');
                      reset();
                    }}
                    className="mt-2"
                  >
                    Clear search
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}