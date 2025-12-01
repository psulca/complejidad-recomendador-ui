# Configuración de Supabase

## Variables de Entorno

Crea un archivo `.env.local` en la raíz del proyecto con las siguientes variables:

```env
NEXT_PUBLIC_SUPABASE_URL=https://kfwqfwsaywbjivnixzit.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtmd3Fmd3NheXdiaml2bml4eml0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ0OTc1ODYsImV4cCI6MjA4MDA3MzU4Nn0.rv_N6xxq01PCBA9kXM8xrOXyVcWGrt5QUr8s-XHm190
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
```

## Proyecto de Supabase

- **Project ID**: kfwqfwsaywbjivnixzit
- **URL**: https://kfwqfwsaywbjivnixzit.supabase.co
- **Región**: us-east-1

## Rutas Disponibles

### Frontend
- `/login` - Página de inicio de sesión
- `/register` - Página de registro
- `/auth/callback` - Callback para OAuth (Google)

### API Routes (Next.js)
- `/api/auth/register` - Registro de usuario (Supabase + Backend)
- `/api/auth/login` - Inicio de sesión (Supabase + Backend)
- `/api/auth/logout` - Cerrar sesión
- `/api/auth/me` - Obtener usuario actual
- `/api/cursos` - Obtener catálogo de cursos
- `/api/usuario/[id]` - Obtener datos de usuario
- `/api/planificar` - Generar plan de estudios
- `/api/grafo` - Obtener grafo de cursos

## Funcionalidades Implementadas

1. ✅ Registro de usuarios con email y contraseña
2. ✅ Inicio de sesión con email y contraseña
3. ✅ Autenticación con Google (OAuth)
4. ✅ Middleware para manejar sesiones
5. ✅ Cliente de Supabase configurado para cliente y servidor

## Notas

- Las credenciales de Supabase ya están configuradas en el proyecto
- El proyecto de Supabase está activo y listo para usar
- La autenticación con Google requiere configuración adicional en el dashboard de Supabase

