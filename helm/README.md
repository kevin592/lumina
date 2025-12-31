# Lumina Helm Chart

A Helm chart for deploying Lumina, a note-taking application, on Kubernetes.

## Prerequisites

- Kubernetes 1.19+
- Helm 3.2.0+

## Installing the Chart

To install the chart with the release name `my-lumina`:

```bash
# Add the Bitnami repository (required for PostgreSQL dependency)
helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo update

# Install Lumina with built-in PostgreSQL
helm install my-lumina ./helm

# Or install from a packaged chart
helm package ./helm
helm install my-lumina lumina-0.1.0.tgz
```

## Uninstalling the Chart

To uninstall/delete the `my-lumina` deployment:

```bash
helm delete my-lumina
```

## Configuration

The following table lists the configurable parameters and their default values.

### Global Parameters

| Parameter | Description | Default |
|-----------|-------------|---------|
| `replicaCount` | Number of Lumina replicas | `1` |
| `image.repository` | Lumina image repository | `luminaspace/lumina` |
| `image.tag` | Lumina image tag | `""` (uses appVersion) |
| `image.pullPolicy` | Image pull policy | `IfNotPresent` |
| `nameOverride` | Override the name of the chart | `""` |
| `fullnameOverride` | Override the full name of the chart | `""` |

### Service Parameters

| Parameter | Description | Default |
|-----------|-------------|---------|
| `service.type` | Kubernetes service type | `ClusterIP` |
| `service.port` | Service port | `1111` |
| `service.targetPort` | Target port | `1111` |

### Ingress Parameters

| Parameter | Description | Default |
|-----------|-------------|---------|
| `ingress.enabled` | Enable ingress | `false` |
| `ingress.className` | Ingress class name | `""` |
| `ingress.annotations` | Ingress annotations | `{}` |
| `ingress.hosts` | Ingress hosts configuration | `[{host: "lumina.local", paths: [{path: "/", pathType: "Prefix"}]}]` |
| `ingress.tls` | Ingress TLS configuration | `[]` |

### Application Configuration

| Parameter | Description | Default |
|-----------|-------------|---------|
| `config.baseUrl` | Base URL for the application | `"http://localhost:1111"` |
| `config.nextauth.url` | NextAuth URL | `"http://localhost:1111"` |
| `config.nextauth.secret` | NextAuth secret | `"my_ultra_secure_nextauth_secret"` |
| `config.nodeEnv` | Node environment | `"production"` |

### Database Configuration

#### Built-in PostgreSQL (Default)

| Parameter | Description | Default |
|-----------|-------------|---------|
| `postgresql.enabled` | Enable built-in PostgreSQL | `true` |
| `postgresql.auth.postgresPassword` | PostgreSQL admin password | `"mysecretpassword"` |
| `postgresql.auth.username` | PostgreSQL username | `"postgres"` |
| `postgresql.auth.password` | PostgreSQL password | `"mysecretpassword"` |
| `postgresql.auth.database` | PostgreSQL database name | `"postgres"` |
| `postgresql.primary.persistence.enabled` | Enable PostgreSQL persistence | `true` |
| `postgresql.primary.persistence.size` | PostgreSQL storage size | `8Gi` |

#### External Database

| Parameter | Description | Default |
|-----------|-------------|---------|
| `externalDatabase.enabled` | Use external database | `false` |
| `externalDatabase.type` | Database type | `postgresql` |
| `externalDatabase.host` | Database host | `""` |
| `externalDatabase.port` | Database port | `5432` |
| `externalDatabase.database` | Database name | `postgres` |
| `externalDatabase.username` | Database username | `postgres` |
| `externalDatabase.password` | Database password | `""` |
| `externalDatabase.existingSecret` | Existing secret with database credentials | `""` |
| `externalDatabase.existingSecretPasswordKey` | Key in existing secret containing password | `"password"` |

### Resource Management

| Parameter | Description | Default |
|-----------|-------------|---------|
| `resources` | CPU/Memory resource requests/limits | `{}` |
| `autoscaling.enabled` | Enable HPA | `false` |
| `autoscaling.minReplicas` | Minimum replicas | `1` |
| `autoscaling.maxReplicas` | Maximum replicas | `100` |
| `autoscaling.targetCPUUtilizationPercentage` | Target CPU utilization | `80` |

## Examples

### Installing with External PostgreSQL

```bash
helm install my-lumina ./helm \
  --set postgresql.enabled=false \
  --set externalDatabase.enabled=true \
  --set externalDatabase.host=my-postgres-host \
  --set externalDatabase.password=mypassword
```

### Installing with Ingress

```bash
helm install my-lumina ./helm \
  --set ingress.enabled=true \
  --set ingress.hosts[0].host=lumina.example.com \
  --set ingress.hosts[0].paths[0].path="/" \
  --set ingress.hosts[0].paths[0].pathType="Prefix"
```

### Installing with Custom Configuration

```bash
helm install my-lumina ./helm \
  --set config.baseUrl="https://lumina.example.com" \
  --set config.nextauth.url="https://lumina.example.com" \
  --set config.nextauth.secret="your-super-secret-key" \
  --set resources.requests.memory="256Mi" \
  --set resources.requests.cpu="250m"
```

### Installing with External Database using Existing Secret

```bash
# Create a secret with database credentials
kubectl create secret generic my-db-secret --from-literal=password=mydbpassword

# Install Lumina
helm install my-lumina ./helm \
  --set postgresql.enabled=false \
  --set externalDatabase.enabled=true \
  --set externalDatabase.host=my-postgres-host \
  --set externalDatabase.existingSecret=my-db-secret \
  --set externalDatabase.existingSecretPasswordKey=password
```

## Upgrading

To upgrade the chart:

```bash
helm upgrade my-lumina ./helm
```

## Backup and Restore

### Backup PostgreSQL Data

If using the built-in PostgreSQL:

```bash
# Get the PostgreSQL password
export POSTGRES_PASSWORD=$(kubectl get secret my-lumina-postgresql -o jsonpath="{.data.postgres-password}" | base64 -d)

# Create a backup
kubectl exec -it my-lumina-postgresql-0 -- pg_dump -U postgres -d postgres > lumina-backup.sql
```

### Restore PostgreSQL Data

```bash
# Restore from backup
kubectl exec -i my-lumina-postgresql-0 -- psql -U postgres -d postgres < lumina-backup.sql
```

## Troubleshooting

### Check Pod Status

```bash
kubectl get pods -l app.kubernetes.io/name=lumina
```

### View Logs

```bash
kubectl logs -l app.kubernetes.io/name=lumina
```

### Check Database Connection

```bash
kubectl exec -it deployment/my-lumina -- env | grep DATABASE
```

### Connect to PostgreSQL

```bash
export POSTGRES_PASSWORD=$(kubectl get secret my-lumina-postgresql -o jsonpath="{.data.postgres-password}" | base64 -d)
kubectl run my-lumina-postgresql-client --rm --tty -i --restart='Never' --image docker.io/bitnami/postgresql:15 --env="PGPASSWORD=$POSTGRES_PASSWORD" --command -- psql --host my-lumina-postgresql -U postgres -d postgres -p 5432
```

## Dependencies

This chart depends on:

- [Bitnami PostgreSQL](https://github.com/bitnami/charts/tree/main/bitnami/postgresql) - Optional database backend

## Contributing

Please read the [contribution guidelines](https://github.com/lumina-space/lumina/blob/main/CONTRIBUTING.md) before submitting pull requests.
