import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCrudNotifications } from "@/shared/hooks/useCrudNotifications";
import { projectsApi } from "@/shared/services/api/projects";
import type {
  CreateProjectRequest,
  UpdateProjectRequest,
} from "@/shared/types";

export const useProjects = () => {
  return useQuery({
    queryKey: ["projects"],
    queryFn: () => projectsApi.getProjects(),
  });
};

export const useProject = (id: number) => {
  return useQuery({
    queryKey: ["projects", id],
    queryFn: () => projectsApi.getProject(id),
    enabled: !!id,
  });
};

export const useCreateProject = () => {
  const queryClient = useQueryClient();
  const { notifyCreateSuccess, notifyError } = useCrudNotifications({
    resourceName: "Project",
  });

  return useMutation({
    mutationFn: (data: CreateProjectRequest) => projectsApi.createProject(data),
    onSuccess: (data) => {
      notifyCreateSuccess(data);
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
    onError: (error) => {
      notifyError(error, "create");
    },
  });
};

export const useUpdateProject = () => {
  const queryClient = useQueryClient();
  const { notifyUpdateSuccess, notifyError } = useCrudNotifications({
    resourceName: "Project",
  });

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateProjectRequest }) =>
      projectsApi.updateProject(id, data),
    onSuccess: (data, { id }) => {
      notifyUpdateSuccess(data);
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["projects", id] });
    },
    onError: (error) => {
      notifyError(error, "update");
    },
  });
};

export const useDeleteProject = () => {
  const queryClient = useQueryClient();
  const { notifyDeleteSuccess, notifyError } = useCrudNotifications({
    resourceName: "Project",
  });

  return useMutation({
    mutationFn: (id: number) => projectsApi.deleteProject(id),
    onSuccess: () => {
      notifyDeleteSuccess(null);
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
    onError: (error) => {
      notifyError(error, "delete");
    },
  });
};
