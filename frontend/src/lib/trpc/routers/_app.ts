import { router } from "../server";
import { componentsRouter } from "./components";
import { pagesRouter } from "./pages";
import { permissionsRouter } from "./permissions";
import { rolesRouter } from "./roles";
import { usersRouter } from "./users";

export const appRouter = router({
  users: usersRouter,
  pages: pagesRouter,
  components: componentsRouter,
  roles: rolesRouter,
  permissions: permissionsRouter,
});

export type AppRouter = typeof appRouter;
