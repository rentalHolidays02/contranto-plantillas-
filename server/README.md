# Base de datos de contratos (self-hosted, Ubuntu + Docker)

Mismo patrón que Vaultwarden: Postgres + PostgREST en Docker, solo visible dentro
de tu tailnet (nunca en internet público).

## 1. Copiar esta carpeta al servidor

```bash
scp -r server usuario@tu-servidor:/opt/contratos-db
ssh usuario@tu-servidor
cd /opt/contratos-db
```

## 2. Configurar contraseña

```bash
echo "POSTGRES_PASSWORD=$(openssl rand -hex 24)" > .env
```

## 3. Levantar los contenedores

```bash
docker compose up -d
docker compose logs -f  # comprobar que arrancan sin errores, Ctrl+C para salir
```

Postgres y PostgREST quedan escuchando solo en `127.0.0.1` del servidor — nadie
fuera de la máquina puede tocarlos todavía.

## 4. Exponer solo por Tailscale

```bash
tailscale serve --bg --https=443 http://127.0.0.1:3001
tailscale serve status
```

Esto te da una URL tipo `https://tu-servidor.tu-tailnet.ts.net` accesible solo
desde dispositivos dentro de tu tailnet. Copia esa URL: la app la pedirá una vez
(botón "Conectar base de datos") y queda guardada en el navegador de cada PC.

## 5. Verificar

Desde cualquier PC con Tailscale activo:

```bash
curl https://tu-servidor.tu-tailnet.ts.net/contratos
```

Debe devolver `[]` (tabla vacía, sin errores).

## Backups

El histórico completo vive en el volumen `db_data` de Docker. Backup manual:

```bash
docker compose exec db pg_dump -U postgres contratos > backup_$(date +%F).sql
```

Restaurar:

```bash
cat backup_2026-XX-XX.sql | docker compose exec -T db psql -U postgres contratos
```
