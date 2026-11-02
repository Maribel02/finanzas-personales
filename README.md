# Mi Balance — Gestión y control de gastos personales

Primera versión funcional de una aplicación web para el trabajo de grado. Interfaz en español y moneda inicial COP.

## Funcionalidades incluidas

- Resumen mensual de ingresos, gastos y balance.
- Registro, edición y eliminación de movimientos.
- Categorías separadas para ingresos y gastos.
- Filtros por tipo, categoría y texto.
- Presupuestos mensuales por categoría y barra de avance.
- Reportes por categoría y período.
- Exportación CSV de los movimientos filtrados.
- Diseño adaptable a escritorio y móvil.
- Inicio de sesión y registro con Supabase Auth.
- Nombre de usuario editable desde Configuración.
- Sincronización en la nube de movimientos y presupuestos por cuenta.
- Caché local del navegador y esquema SQL con Row Level Security.

## Requisitos

- Node.js 20 o superior recomendado.
- npm (se instala junto con Node.js).

Descarga Node.js desde https://nodejs.org/

## Ejecutar en tu computador

1. Descomprime el archivo ZIP.
2. Abre una terminal dentro de la carpeta `finanzas-personales`.
3. Instala dependencias:

   ```bash
   npm install
   ```

4. Configura Supabase siguiendo la sección siguiente.
5. Inicia el servidor de desarrollo:

   ```bash
   npm run dev
   ```

6. Abre la URL local que indique Vite en la terminal, normalmente `http://localhost:5173`.

Para comprobar que compila:

```bash
npm run build
```

## Configurar Supabase (una sola vez por entorno)

1. En [Supabase](https://supabase.com/), crea un proyecto y espera a que termine de aprovisionarse.
2. En el panel del proyecto, abre **SQL Editor** y ejecuta el contenido de `supabase/schema.sql`.
3. En **Project Settings / API** (o **Connect**, según la interfaz), copia la URL del proyecto y la clave pública `publishable` o `anon`. **No uses `service_role` en el navegador.**
4. En la raíz del proyecto, copia `.env.example` con el nombre `.env.local`.
5. Reemplaza los valores de `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` por los de tu proyecto. No compartas ni subas `.env.local` a Git.
6. En la terminal, detén Vite con `Ctrl+C` y vuelve a ejecutar `npm run dev`. Vite solo lee variables de entorno al iniciar.
7. Crea una cuenta desde la pantalla de Mi Balance. Si Supabase exige confirmar el correo, abre el correo de confirmación y luego inicia sesión.
8. Entra a **Configuración → Perfil de usuario**, cambia el nombre y pulsa **Guardar nombre**.

### Datos de demostración y sincronización

La primera cuenta crea su propio espacio de datos. Los movimientos y presupuestos se sincronizan con Supabase y quedan asociados al usuario autenticado; las políticas RLS impiden leer o modificar filas de otras cuentas. Si ya tenías movimientos guardados en el modo local, exporta primero un CSV como respaldo. La sincronización inicial no importa automáticamente datos de un navegador anterior a la nube.

Esta versión guarda movimientos y presupuestos en un campo `jsonb` por usuario para facilitar la transición desde el prototipo local. Antes de una entrega final o despliegue productivo, recomendamos migrar a tablas normalizadas, probar recuperación de cuenta, reglas de validación, concurrencia y políticas RLS. La moneda todavía se calcula en COP; el selector USD es solo una vista previa y no convierte valores.

## Estructura del proyecto

```text
finanzas-personales/
├── index.html
├── package.json
├── vite.config.ts
├── tsconfig.json
├── tsconfig.app.json
├── tsconfig.node.json
├── .env.example
├── supabase/
│   └── schema.sql
├── src/
│   ├── lib/
│   │   └── supabase.ts
│   ├── main.tsx
│   ├── vite-env.d.ts
│   ├── App.tsx
│   └── styles.css
└── docs/
    └── plan-pruebas.md
```

## Modelo de datos objetivo

- **Usuario:** administrado por Supabase Auth.
- **Categoría:** usuario, nombre, tipo y color.
- **Movimiento:** usuario, categoría, tipo, descripción, valor, fecha y notas.
- **Presupuesto:** usuario, categoría, mes y límite.

El archivo `supabase/schema.sql` contiene el esquema inicial y políticas RLS para limitar el acceso a los datos por usuario. Debe revisarse y probarse en un proyecto Supabase antes de usarlo con información real.

## Pruebas funcionales iniciales

Consulta `docs/plan-pruebas.md`. Registra resultados reales de ejecución antes de incluirlos como evidencia en el trabajo de grado.

## Alcance de esta entrega

Esta entrega es un MVP local funcional para validar el flujo de uso. La integración real de Supabase Auth, sincronización remota, pruebas automatizadas y despliegue quedan como siguientes etapas; no se deben considerar completadas hasta implementarlas y verificarlas.
