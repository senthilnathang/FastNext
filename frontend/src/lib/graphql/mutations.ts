/**
 * GraphQL Mutations
 * Centralized GraphQL mutations for the application
 */
import { gql } from '@apollo/client';
import { USER_FRAGMENT, PROJECT_FRAGMENT, PAGE_FRAGMENT, COMPONENT_FRAGMENT } from './queries';

// User mutations
export const CREATE_USER = gql`
  mutation CreateUser($input: UserInput!) {
    createUser(input: $input) {
      success
      message
      errors
      user {
        ...UserFragment
      }
    }
  }
  ${USER_FRAGMENT}
`;

export const UPDATE_USER = gql`
  mutation UpdateUser($id: Int!, $input: UserUpdateInput!) {
    updateUser(id: $id, input: $input) {
      success
      message
      errors
      user {
        ...UserFragment
      }
    }
  }
  ${USER_FRAGMENT}
`;

export const DELETE_USER = gql`
  mutation DeleteUser($id: Int!) {
    deleteUser(id: $id) {
      success
      message
      errors
    }
  }
`;

// Project mutations
export const CREATE_PROJECT = gql`
  mutation CreateProject($input: ProjectInput!) {
    createProject(input: $input) {
      success
      message
      errors
      project {
        ...ProjectFragment
      }
    }
  }
  ${PROJECT_FRAGMENT}
`;

export const UPDATE_PROJECT = gql`
  mutation UpdateProject($id: Int!, $input: ProjectUpdateInput!) {
    updateProject(id: $id, input: $input) {
      success
      message
      errors
      project {
        ...ProjectFragment
      }
    }
  }
  ${PROJECT_FRAGMENT}
`;

export const DELETE_PROJECT = gql`
  mutation DeleteProject($id: Int!) {
    deleteProject(id: $id) {
      success
      message
      errors
    }
  }
`;

// Page mutations
export const CREATE_PAGE = gql`
  mutation CreatePage($input: PageInput!) {
    createPage(input: $input) {
      success
      message
      errors
      page {
        ...PageFragment
      }
    }
  }
  ${PAGE_FRAGMENT}
`;

export const UPDATE_PAGE = gql`
  mutation UpdatePage($id: Int!, $input: PageUpdateInput!) {
    updatePage(id: $id, input: $input) {
      success
      message
      errors
      page {
        ...PageFragment
      }
    }
  }
  ${PAGE_FRAGMENT}
`;

export const DELETE_PAGE = gql`
  mutation DeletePage($id: Int!) {
    deletePage(id: $id) {
      success
      message
      errors
    }
  }
`;

// Component mutations
export const CREATE_COMPONENT = gql`
  mutation CreateComponent($input: ComponentInput!) {
    createComponent(input: $input) {
      success
      message
      errors
      component {
        ...ComponentFragment
      }
    }
  }
  ${COMPONENT_FRAGMENT}
`;

export const UPDATE_COMPONENT = gql`
  mutation UpdateComponent($id: Int!, $input: ComponentUpdateInput!) {
    updateComponent(id: $id, input: $input) {
      success
      message
      errors
      component {
        ...ComponentFragment
      }
    }
  }
  ${COMPONENT_FRAGMENT}
`;

export const DELETE_COMPONENT = gql`
  mutation DeleteComponent($id: Int!) {
    deleteComponent(id: $id) {
      success
      message
      errors
    }
  }
`;

// Project member mutations
export const ADD_PROJECT_MEMBER = gql`
  mutation AddProjectMember($input: ProjectMemberInput!) {
    addProjectMember(input: $input) {
      success
      message
      errors
    }
  }
`;

export const REMOVE_PROJECT_MEMBER = gql`
  mutation RemoveProjectMember($projectId: Int!, $userId: Int!) {
    removeProjectMember(projectId: $projectId, userId: $userId) {
      success
      message
      errors
    }
  }
`;