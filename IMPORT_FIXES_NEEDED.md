# Import Path Fixes Required

Based on the build errors, here are the systematic fixes needed:

## 1. Critical Issues to Fix

### Auth Hook Client Directive
- Add "use client" to `modules/auth/hooks/useAuth.ts`

### Component Import Path Updates
Most components still have old relative paths that need updating:

```typescript
// FROM:
import { useAuth } from '../../contexts/AuthContext'
import { Button } from '../ui/button'  
import { Card } from '../ui/card'

// TO:
import { useAuth } from '@/modules/auth'
import { Button } from '@/shared/components/button'
import { Card } from '@/shared/components/card'
```

### Specific Files Needing Updates:
1. `modules/auth/components/UpdateProfileForm.tsx`
2. `modules/auth/components/ChangePasswordForm.tsx` 
3. `modules/auth/components/SecuritySettings.tsx`
4. All files in `shared/components/` with `../ui/` imports
5. All files with `@/lib/utils` should use `@/shared/utils`
6. All files with `@/lib/api/` should use `@/shared/services`

## 2. Quick Fix Strategy
Since there are 257 errors, we need to fix the most critical ones first:

1. Fix auth hook client directive
2. Update auth component imports
3. Fix shared component imports
4. Test a subset of pages

## 3. Next Steps
1. Apply critical fixes
2. Test build again  
3. Fix remaining issues iteratively