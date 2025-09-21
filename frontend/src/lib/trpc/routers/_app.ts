import { router } from '../server'
import { usersRouter } from './users'
import { projectsRouter } from './projects'
import { rolesRouter } from './roles'
import { permissionsRouter } from './permissions'

export const appRouter = router({
  users: usersRouter,
  projects: projectsRouter,
  roles: rolesRouter,
  permissions: permissionsRouter,
})

export type AppRouter = typeof appRouter