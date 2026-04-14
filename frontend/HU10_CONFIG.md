# Configuración de Frontend para HU10

## Variables de Entorno

El archivo `.env` contiene las variables necesarias para que el frontend se comunique con el backend:

```env
VITE_API_URL=http://localhost:8000
VITE_ENV=development
```

## Configuración de Vite (vite.config.js)

```javascript
server: {
  host: '0.0.0.0',           // Accesible desde cualquier IP
  port: 5173,                 // Puerto estándar de Vite
  proxy: {
    '/api': {
      target: 'http://localhost:8000',  // Redirige a FastAPI
      changeOrigin: true,
      rewrite: (path) => path.replace(/^\/api/, '/api')
    }
  }
}
```

### Beneficios del Proxy:
- ✅ Evita problemas de CORS en desarrollo
- ✅ URLs locales: `http://localhost:5173/api/rendimientos`
- ✅ Redirige automáticamente a `http://localhost:8000/api/rendimientos`

## Estructura de Componentes Vue.js

### HU10Panel.vue
- **Ubicación**: `frontend/src/components/HU10Panel.vue`
- **Propósito**: Panel principal con interfaz interactiva
- **Características**:
  - Selector de material (dropdown)
  - Input para área en m²
  - Configuración de recintos
  - Visualización de matriz de rendimientos (BD dinámica)
  - Cálculo automático en tiempo real
  - Botón para guardar simulación
  - Validaciones (rango m², material válido)

### Composable useRendimientos.js (Futuro)
```javascript
// Ejemplo de cómo podría verse
import { ref } from 'vue'

export function useRendimientos() {
  const rendimientos = ref([])
  const loading = ref(false)
  
  const fetchRendimientos = async () => {
    loading.value = true
    const response = await fetch('/api/rendimientos')
    rendimientos.value = await response.json()
    loading.value = false
  }
  
  return { rendimientos, loading, fetchRendimientos }
}
```

## Instalación de Dependencias

```bash
cd frontend
npm install
```

### Dependencias Incluidas:
- **vue**: Framework frontend (3.4+)
- **vite**: Build tool y dev server
- **@vitejs/plugin-vue**: Plugin de Vite para Vue
- **tailwindcss**: (Opcional) Para estilos CSS
- **axios**: (Opcional) Para peticiones HTTP

## Desarrollo

### Ejecutar en Modo Desarrollo
```bash
npm run dev
```

Accesible en: `http://localhost:5173`

### Build para Producción
```bash
npm run build
```

Genera archivos optimizados en `dist/`

## API Integration

El componente HU10Panel integra los siguientes endpoints:

### 1. Cargar Rendimientos (Al montar)
```javascript
const cargarRendimientos = async () => {
  const response = await fetch(`${API_URL}/api/rendimientos`)
  rendimientos.value = await response.json()
}
```

### 2. Actualizar Estimación (Tiempo real)
```javascript
const updateEstimacion = () => {
  const rendimiento = rendimientos.value.find(
    r => r.material_estructural_id == formData.materialEstructuralId
  )
  cantidad = m2 * rendimiento.factor_rendimiento
}
```

### 3. Crear Simulación (Al guardar)
```javascript
const crearSimulacion = async () => {
  const response = await fetch(`${API_URL}/api/simulacion/parametros`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(formData)
  })
  const resultado = await response.json()
  // resultado.estimacion_insumos contiene el cálculo
}
```

## Flujo de Datos

```
┌─────────────────────────────────────────────────────┐
│ Usuario interactúa con HU10Panel.vue                │
└──────────────────┬──────────────────────────────────┘
                   │
        ┌──────────▼──────────┐
        │ ¿Cambió el área?    │
        └──────────┬──────────┘
                   │ Sí
        ┌──────────▼──────────────────┐
        │ updateEstimacion()           │
        │ (cálculo local en tiempo     │
        │  real: m² × factor)          │
        └──────────┬──────────────────┘
                   │
        ┌──────────▼──────────────────┐
        │ Mostrar estimación           │
        │ (no requiere servidor)       │
        └──────────────────────────────┘

        ┌──────────────────────────────┐
        │ ¿Presionó Guardar?           │
        └──────────┬───────────────────┘
                   │ Sí
        ┌──────────▼──────────────────────┐
        │ POST /api/simulacion/parametros │
        │ (Backend calcula y valida)      │
        └──────────┬──────────────────────┘
                   │
        ┌──────────▼──────────────────────┐
        │ Mostrar resultado guardado      │
        │ + ID simulación                 │
        └────────────────────────────────┘
```

## Validaciones Cliente

El componente valida antes de enviar:

```javascript
// 1. Campos completados
if (!formData.materialEstructuralId || !formData.m2Totales) {
  error = 'Por favor completa los campos requeridos'
}

// 2. Rango m²
if (formData.m2Totales < 15 || formData.m2Totales > 200) {
  error = 'El área debe estar entre 15 y 200 m²'
}

// 3. Material válido
if (![1, 2, 3, 4].includes(formData.materialEstructuralId)) {
  error = 'Material inválido'
}
```

El backend realiza validaciones adicionales.

## Estilos CSS

El componente incluye:
- **Gradient Background**: Purple (667eea → 764ba2)
- **Card Layout**: Grid 2 columnas en desktop, 1 en mobile
- **Responsive Design**: Funciona en tablets y teléfonos
- **Animaciones**: Hover effects, transitions suaves
- **Color Scheme**: 
  - Primary: #667eea
  - Success: Verde
  - Error: Rojo
  - Background: Blanco/Gris

## Performance

- ✅ Cálculos en cliente (no requieren servidor)
- ✅ Lazy loading de matriz (una sola petición)
- ✅ Memoización de resultados (sin recargas innecesarias)
- ✅ Debounce no necesario (validaciones instantáneas)

## Testing

### Unit Tests (Future)
```javascript
describe('HU10Panel', () => {
  it('calcula correctamente: 100m² Madera = 50 sacos', () => {
    const cantidad = 100 * 0.5
    expect(cantidad).toBe(50)
  })
  
  it('rechaza m² < 15', () => {
    expect(validar(10)).toBeFalsy()
  })
})
```

### E2E Tests (Cypress)
```javascript
describe('HU10 Feature', () => {
  it('crea simulación exitosa', () => {
    cy.visit('http://localhost:5173')
    cy.get('#material').select('1')
    cy.get('#area').type('100')
    cy.get('.btn-primary').click()
    cy.contains('✅ Simulación').should('be.visible')
  })
})
```

## Deployment

### Producción (Docker)
```dockerfile
FROM node:20-alpine as builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
RUN npm install -g serve
COPY --from=builder /app/dist ./dist
EXPOSE 5173
CMD ["serve", "-s", "dist", "-l", "5173"]
```

### Netlify / Vercel
```bash
npm run build
# Desplegar carpeta 'dist' a Netlify/Vercel
```

## Variables de Entorno en Producción

```env
# Para AWS/Heroku/etc
VITE_API_URL=https://api.miapp.com
VITE_ENV=production
```

## Recursos Útiles

- [Vue 3 Docs](https://vuejs.org)
- [Vite Docs](https://vitejs.dev)
- [Tailwind CSS](https://tailwindcss.com)
- [FastAPI CORS](https://fastapi.tiangolo.com/tutorial/cors/)
