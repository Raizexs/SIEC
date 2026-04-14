# 🎯 START HERE - HU10 Quick Guide

## ⚡ 30 Segundos para Empezar

### Windows (Recomendado)
```bash
hu10-start.bat
# Esperar 15 segundos...
# Luego abrir: http://localhost:5173
```

### Terminal Manual
```bash
docker-compose up -d
# Esperar 15 segundos...
# Luego abrir: http://localhost:5173
```

---

## 🎨 Qué Verás

Una interfaz moderna con:
1. **Selector de Material** (Madera, Metalcom, Albañilería, Hormigón)
2. **Input de Área** (m²)
3. **Matriz Visual** de rendimientos desde BD
4. **Cálculo Automático** (m² × factor)
5. **Botón Guardar** (almacena en BD)

---

## 🧪 Prueba Rápida

```
1. Selecciona "Madera"
2. Ingresa "100" m²
3. Ve cómo cambia a "50 sacos" automáticamente
4. Haz click en "Guardar Simulación"
5. ✅ Ves mensaje de éxito
```

---

## 📍 URLs Importantes

| Servicio | URL |
|----------|-----|
| Frontend HU10 | http://localhost:5173 |
| API Docs | http://localhost:8000/docs |
| Base Datos | localhost:5432 |

---

## 📚 Documentación

- **[HU10_TESTING.md](./frontend/HU10_TESTING.md)** - Guía interactiva completa
- **[DOCKER_HU10.md](./DOCKER_HU10.md)** - Opciones Docker avanzadas
- **[HU10_FRONTEND_COMPLETE.md](./HU10_FRONTEND_COMPLETE.md)** - Resumen técnico

---

## 🛠️ Comandos Útiles

```bash
# Ver logs en tiempo real
docker-compose logs -f

# Parar servicios
docker-compose down

# Acceder a BD
docker-compose exec db psql -U siec_user -d siec_db

# Reiniciar backend
docker-compose restart backend
```

---

## ❓ Problemas?

### "Cannot connect to localhost:5173"
→ Esperar más tiempo (20s), los servicios se están inicializando

### "POST /api/simulacion/parametros 404"
→ Backend no está listo, ver: `docker-compose logs backend`

### "No hay datos en la matriz"
→ BD no se inicializó, ejecutar migraciones (ver DOCKER_HU10.md)

### "VITE_API_URL undefined"
→ Asegurar que `frontend/.env` existe con `VITE_API_URL=http://localhost:8000`

---

## ✅ Checklist

- [ ] Docker está ejecutándose
- [ ] http://localhost:5173 carga
- [ ] Veo "Matriz de Rendimientos Constructivos"
- [ ] Puedo seleccionar material y área
- [ ] Veo 4 materiales en la matriz
- [ ] Estimación se calcula automáticamente
- [ ] Puedo guardar simulación
- [ ] Mensaje de éxito aparece

Si todos pasaron: ✅ **¡HU10 está funcionando!**

---

## 🚀 Siguientes Pasos

### Para Probar Más
1. Prueba diferentes áreas: 50m², 150m², 75m²
2. Prueba todos los materiales
3. Verifica cálculos (Madera: m² × 0.5, etc.)
4. Usa http://localhost:8000/docs para API interactiva

### Para Producción
1. Agregar autenticación
2. Configurar SSL/TLS
3. Backup automático BD
4. Monitoring y logs
5. CI/CD pipeline

---

## 📖 Implementación Técnica

**HU10** implementa una **matriz dinámica de rendimientos constructivos**:

- ✅ BD consultada en cada operación (NO hardcodeado)
- ✅ 4 materiales con factores precisos (DECIMAL(8,4))
- ✅ Cálculo: m² × factor_rendimiento
- ✅ API REST con validaciones
- ✅ UI responsivo y moderno
- ✅ 100% funcional en Docker

---

## 📞 Contacto / Soporte

Ver documentación en:
- [HU10_TESTING.md](./frontend/HU10_TESTING.md) - Casos de uso
- [DOCKER_HU10.md](./DOCKER_HU10.md) - Troubleshooting
- [HU10_CONFIG.md](./frontend/HU10_CONFIG.md) - Configuración técnica

---

**¡Listo para probar HU10! Ejecuta `hu10-start.bat` ahora 🚀**
