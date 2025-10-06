import { router } from '../server'
import { usersRouter } from './users'
import { projectsRouter } from './projects'
import { rolesRouter } from './roles'
import { permissionsRouter } from './permissions'
import { pagesRouter } from './pages'
import { componentsRouter } from './components'

export const appRouter = router({
  users: usersRouter,
  projects: projectsRouter,
  pages: pagesRouter,
  components: componentsRouter,
  roles: rolesRouter,
  permissions: permissionsRouter,
})

export type AppRouter = typeof appRouter