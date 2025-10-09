import type { Meta, StoryObj } from '@storybook/nextjs'
import { GraphQLDemo } from './GraphQLDemo'
import { MockedProvider } from '@apollo/client/testing'
import { GET_USERS, GET_PROJECTS } from '@/lib/graphql/queries'

const usersMock = {
  request: {
    query: GET_USERS,
    variables: { first: 10 },
  },
  result: {
    data: {
      users: {
        edges: [
          {
            id: 1,
            username: 'john_doe',
            email: 'john@example.com',
            full_name: 'John Doe',
            is_active: true,
            is_verified: true,
            is_superuser: false,
            avatar_url: null,
            bio: null,
            location: null,
            website: null,
            created_at: '2024-01-01T00:00:00Z',
            updated_at: null,
            last_login_at: null,
          },
          {
            id: 2,
            username: 'jane_smith',
            email: 'jane@example.com',
            full_name: 'Jane Smith',
            is_active: true,
            is_verified: true,
            is_superuser: false,
            avatar_url: null,
            bio: null,
            location: null,
            website: null,
            created_at: '2024-01-02T00:00:00Z',
            updated_at: null,
            last_login_at: null,
          },
        ],
        pageInfo: {
          hasNextPage: false,
          hasPreviousPage: false,
          startCursor: null,
          endCursor: null,
        },
        totalCount: 2,
      },
    },
  },
}

const projectsMock = {
  request: {
    query: GET_PROJECTS,
    variables: { first: 10 },
  },
  result: {
    data: {
      projects: {
        edges: [
          {
            id: 1,
            name: 'FastNext Demo',
            description: 'A demo project showcasing the FastNext framework',
            user_id: 1,
            is_public: true,
            settings: {},
            created_at: '2024-01-01T00:00:00Z',
            updated_at: null,
            owner: {
              id: 1,
              username: 'john_doe',
              email: 'john@example.com',
              full_name: 'John Doe',
              is_active: true,
              is_verified: true,
              is_superuser: false,
              avatar_url: null,
              bio: null,
              location: null,
              website: null,
              created_at: '2024-01-01T00:00:00Z',
              updated_at: null,
              last_login_at: null,
            },
          },
        ],
        pageInfo: {
          hasNextPage: false,
          hasPreviousPage: false,
          startCursor: null,
          endCursor: null,
        },
        totalCount: 1,
      },
    },
  },
}

const mocks = [usersMock, projectsMock]

const meta: Meta<typeof GraphQLDemo> = {
  title: 'Examples/GraphQLDemo',
  component: GraphQLDemo,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'A comprehensive demo component showing GraphQL integration with Apollo Client. Includes tabs for testing queries, browsing users, and managing projects.',
      },
    },
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <MockedProvider mocks={mocks} addTypename={false}>
        <div className="min-h-screen bg-background p-6">
          <Story />
        </div>
      </MockedProvider>
    ),
  ],
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const WithLoadingState: Story = {
  decorators: [
    (Story) => (
      <MockedProvider mocks={[]} addTypename={false}>
        <div className="min-h-screen bg-background p-6">
          <Story />
        </div>
      </MockedProvider>
    ),
  ],
}

export const WithErrorState: Story = {
  decorators: [
    (Story) => {
      const errorMocks = [
        {
          request: {
            query: GET_USERS,
            variables: { first: 10 },
          },
          error: new Error('GraphQL Error: Failed to fetch users'),
        },
      ]
      
      return (
        <MockedProvider mocks={errorMocks} addTypename={false}>
          <div className="min-h-screen bg-background p-6">
            <Story />
          </div>
        </MockedProvider>
      )
    },
  ],
}

export const WithEmptyData: Story = {
  decorators: [
    (Story) => {
      const emptyMocks = [
        {
          request: {
            query: GET_USERS,
            variables: { first: 10 },
          },
          result: {
            data: {
              users: {
                edges: [],
                pageInfo: {
                  hasNextPage: false,
                  hasPreviousPage: false,
                  startCursor: null,
                  endCursor: null,
                },
                totalCount: 0,
              },
            },
          },
        },
        {
          request: {
            query: GET_PROJECTS,
            variables: { first: 10 },
          },
          result: {
            data: {
              projects: {
                edges: [],
                pageInfo: {
                  hasNextPage: false,
                  hasPreviousPage: false,
                  startCursor: null,
                  endCursor: null,
                },
                totalCount: 0,
              },
            },
          },
        },
      ]
      
      return (
        <MockedProvider mocks={emptyMocks} addTypename={false}>
          <div className="min-h-screen bg-background p-6">
            <Story />
          </div>
        </MockedProvider>
      )
    },
  ],
}