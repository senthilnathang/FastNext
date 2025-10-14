import { initTRPC, TRPCError } from '@trpc/server'
import { createTRPCContext } from './context'
import superjson from 'superjson'

const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
  errorFormatter(opts) {
    const { shape, error } = opts
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.code === 'BAD_REQUEST' && error.cause
            ? error.cause
            : null,
      },
    }
  },
})

export const router = t.router
export const publicProcedure = t.procedure

const isAuthenticated = t.middleware(async ({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED' })
  }
  return next({
    ctx: {
      user: ctx.user,
    },
  })
})

export const protectedProcedure = t.procedure.use(isAuthenticated)
