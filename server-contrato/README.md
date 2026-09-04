# Base de datos de contratos (Ubuntu + Docker + Tailscale)

Postgres + PostgREST en Docker, visibles **solo dentro de tu tailnet**, nunca en
internet público. Mismo patrón que Vaultwarden.

Por qué cerrado: los contratos guardan nombre, NIF y domicilio de propietarios.
Son datos personales, así que la base no puede quedar abierta sin autenticación.

## Antes de empezar

En el servidor, comprueba que tienes Docker:

```bash
docker --version && docker compose version
```

Si falta:

```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER   # cierra la sesión SSH y vuelve a entrar
```

## 1. Instalar Tailscale (si aún no está)

```bash
tailscale version || curl -fsSL https://tailscale.com/install.sh | sh
sudo tailscale up
```

El comando imprime un enlace: ábrelo en el navegador para autorizar la máquina.

Apunta el nombre que le queda:

```bash
tailscale status --json | grep -m1 DNSName
```

Sale algo como `servidor.tu-tailnet.ts.net` — lo necesitas en el paso 5.

## 2. Activar certificados HTTPS del tailnet

**Esto es obligatorio y se hace una sola vez desde el navegador**, no por consola:
entra en <https://login.tailscale.com/admin/dns>, activa **MagicDNS** y luego
**HTTPS Certificates**. Sin esto, el paso 5 falla.

## 3. Copiar esta carpeta al servidor

Desde tu PC Windows, en la carpeta `contratos`:

```bash
scp -r server-contrato usuario@IP-DEL-SERVIDOR:~/
```

Y ya en el servidor:

```bash
ssh usuario@IP-DEL-SERVIDOR

cd ~/server-contrato
```

## 4. Contraseña y arranque

```bash
echo "POSTGRES_PASSWORD=$(openssl rand -hex 24)" > .env
docker compose up -d
docker compose ps        # las dos deben figurar como "running"
```

Si alguna no arranca, mira el motivo con `docker compose logs`.

Comprueba que responde dentro del propio servidor:

```bash
curl http://127.0.0.1:3001/contratos
```

Debe devolver `[]`: tabla vacía, sin errores. Hasta aquí nadie fuera de la
máquina puede tocar nada, porque los puertos se publican solo en `127.0.0.1`.

## 5. Publicar en el tailnet

Se usa el puerto **8443** y no el 443 porque Nextcloud ya ocupa el 443 en este
servidor:

```bash
sudo tailscale serve --bg --https=8443 http://127.0.0.1:3001
tailscale serve status
```

Tu URL queda así, con el nombre del paso 1:

```
https://servidor.tu-tailnet.ts.net:8443
```

## 6. Conectar la aplicación

En cada PC que vaya a usarla, con Tailscale instalado y conectado:

1. Abre la aplicación de contratos.
2. Pulsa el botón de estado de la cabecera (**💾 Solo local**).
3. Pega la URL del paso 5.

El botón pasa a **☁️ Sincronizado** y las plantillas se comparten entre equipos.
La URL queda guardada en ese navegador, solo se introduce una vez.

Funciona igual con la app abierta desde Vercel: la petición la hace el navegador,
así que basta con que ese PC esté en el tailnet.

## Verificar desde otro PC

```bash
curl https://servidor.tu-tailnet.ts.net:8443/contratos
```

Otra vez `[]`. Si da error de conexión, ese equipo no está en el tailnet.

## Backups

Todo vive en el volumen `db_data` de Docker:

```bash
cd ~/server-contrato
docker compose exec db pg_dump -U postgres contratos > backup_$(date +%F).sql
```

Restaurar:

```bash
cat backup_2026-XX-XX.sql | docker compose exec -T db psql -U postgres contratos
```

Conviene automatizarlo con cron una vez esté en uso.

## Si algo falla

| Síntoma | Causa habitual |
|---|---|
| `tailscale serve` da error de certificado | Falta el paso 2 (HTTPS Certificates) |
| `curl` local devuelve error de conexión | Los contenedores no arrancaron: `docker compose logs` |
| Responde `{"message":"Could not find table"}` | Reinicia PostgREST: `docker compose restart postgrest` |
| Desde otro PC no conecta | Ese equipo no está conectado al tailnet |
