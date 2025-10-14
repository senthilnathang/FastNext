# Microsoft Azure Deployment Guide

This guide provides step-by-step instructions for deploying FastNext Framework on Microsoft Azure.

## Prerequisites

- Azure subscription with appropriate permissions
- Azure CLI installed and configured
- Docker and Docker Compose installed locally
- Domain name (optional, for production)

## Architecture Overview

The Azure deployment uses the following services:
- **Azure Container Apps**: Serverless container platform
- **Azure Database for PostgreSQL**: Managed database
- **Azure Cache for Redis**: Managed caching
- **Azure Blob Storage**: File storage
- **Azure CDN**: Content delivery network
- **Azure Application Gateway**: Load balancing and SSL termination
- **Azure DNS**: DNS management
- **Azure Key Vault**: Secrets management

## Step 1: Set Up Azure Resources

### 1.1 Create Resource Group

```bash
# Create resource group
az group create \
    --name fastnext-rg \
    --location eastus

# Set default resource group
az configure --defaults group=fastnext-rg location=eastus
```

### 1.2 Create Service Principal

```bash
# Create service principal
az ad sp create-for-rbac \
    --name fastnext-sp \
    --role contributor \
    --scopes /subscriptions/$SUBSCRIPTION_ID/resourceGroups/fastnext-rg \
    --sdk-auth
```

### 1.3 Create Virtual Network

```bash
# Create virtual network
az network vnet create \
    --name fastnext-vnet \
    --address-prefix 10.0.0.0/16 \
    --subnet-name fastnext-subnet \
    --subnet-prefix 10.0.0.0/24

# Create subnet for Container Apps
az network vnet subnet create \
    --name fastnext-container-subnet \
    --vnet-name fastnext-vnet \
    --address-prefixes 10.0.1.0/24 \
    --delegations Microsoft.App/environments
```

## Step 2: Set Up Database and Cache

### 2.1 Create Azure Database for PostgreSQL

```bash
# Create PostgreSQL server
az postgres server create \
    --name fastnext-db \
    --resource-group fastnext-rg \
    --location eastus \
    --admin-user fastnextadmin \
    --admin-password $DB_PASSWORD \
    --sku-name B_Gen5_1 \
    --storage-size 5120 \
    --backup-retention 7 \
    --geo-redundant-backup Disabled \
    --version 15 \
    --ssl-enforcement Enabled

# Create database
az postgres db create \
    --name fastnext \
    --server-name fastnext-db

# Configure firewall (allow Azure services)
az postgres server firewall-rule create \
    --resource-group fastnext-rg \
    --server-name fastnext-db \
    --name AllowAllAzureIps \
    --start-ip-address 0.0.0.0 \
    --end-ip-address 0.0.0.0
```

### 2.2 Create Azure Cache for Redis

```bash
# Create Redis cache
az redis create \
    --name fastnext-redis \
    --resource-group fastnext-rg \
    --location eastus \
    --sku Basic \
    --vm-size c0 \
    --enable-non-ssl-port false
```

## Step 3: Create Storage Account

```bash
# Create storage account
az storage account create \
    --name fastnextstorage$ACCOUNT_SUFFIX \
    --resource-group fastnext-rg \
    --location eastus \
    --sku Standard_LRS \
    --kind StorageV2 \
    --access-tier Hot \
    --allow-blob-public-access false \
    --enable-hierarchical-namespace false

# Create blob container
az storage container create \
    --name assets \
    --account-name fastnextstorage$ACCOUNT_SUFFIX \
    --public-access off

# Set CORS rules
az storage cors add \
    --account-name fastnextstorage$ACCOUNT_SUFFIX \
    --services b \
    --methods GET PUT POST DELETE \
    --origins "*" \
    --allowed-headers "*" \
    --max-age 3600
```

## Step 4: Set Up Container Apps Environment

### 4.1 Create Container Apps Environment

```bash
# Create managed environment
az containerapp env create \
    --name fastnext-env \
    --resource-group fastnext-rg \
    --location eastus \
    --logs-workspace-id $LOG_ANALYTICS_WORKSPACE_ID \
    --logs-workspace-key $LOG_ANALYTICS_KEY
```

### 4.2 Create Key Vault for Secrets

```bash
# Create Key Vault
az keyvault create \
    --name fastnext-kv \
    --resource-group fastnext-rg \
    --location eastus \
    --enabled-for-deployment true \
    --enabled-for-template-deployment true

# Store secrets
az keyvault secret set \
    --vault-name fastnext-kv \
    --name database-url \
    --value "postgresql://fastnextadmin:$DB_PASSWORD@fastnext-db.postgres.database.azure.com:5432/fastnext?sslmode=require"

az keyvault secret set \
    --vault-name fastnext-kv \
    --name redis-url \
    --value "rediss://fastnext-redis.redis.cache.windows.net:6380"

az keyvault secret set \
    --vault-name fastnext-kv \
    --name secret-key \
    --value $SECRET_KEY
```

## Step 5: Build and Deploy Backend

### 5.1 Build and Push Docker Images

```bash
# Login to Azure Container Registry
az acr login --name fastnextacr

# Build and push backend image
cd backend
az acr build \
    --registry fastnextacr \
    --image fastnext-backend:latest \
    --file Dockerfile .

# Build and push frontend image
cd ../frontend
az acr build \
    --registry fastnextacr \
    --image fastnext-frontend:latest \
    --file Dockerfile .
```

### 5.2 Deploy Backend Container App

```bash
# Create backend container app
az containerapp create \
    --name fastnext-backend \
    --resource-group fastnext-rg \
    --environment fastnext-env \
    --image fastnextacr.azurecr.io/fastnext-backend:latest \
    --target-port 8000 \
    --ingress external \
    --min-replicas 1 \
    --max-replicas 10 \
    --cpu 0.5 \
    --memory 1.0Gi \
    --scale-rule-name http-scale \
    --scale-rule-type http \
    --scale-rule-http-concurrency 100 \
    --env-vars SECRET_KEY=secretref:fastnext-kv,secret-key \
    --env-vars DATABASE_URL=secretref:fastnext-kv,database-url \
    --env-vars REDIS_URL=secretref:fastnext-kv,redis-url \
    --env-vars AZURE_STORAGE_ACCOUNT=fastnextstorage$ACCOUNT_SUFFIX \
    --env-vars AZURE_STORAGE_CONTAINER=assets \
    --registry-server fastnextacr.azurecr.io \
    --query properties.configuration.ingress.fqdn
```

## Step 6: Set Up Application Gateway

### 6.1 Create Application Gateway

```bash
# Create public IP
az network public-ip create \
    --name fastnext-agw-pip \
    --resource-group fastnext-rg \
    --allocation-method Static \
    --sku Standard

# Create application gateway
az network application-gateway create \
    --name fastnext-agw \
    --resource-group fastnext-rg \
    --location eastus \
    --vnet-name fastnext-vnet \
    --subnet fastnext-agw-subnet \
    --public-ip-address fastnext-agw-pip \
    --http-settings-protocol Http \
    --http-settings-port 80 \
    --capacity 2 \
    --sku WAF_v2 \
    --frontend-port 80
```

### 6.2 Configure Backend Pool

```bash
# Add backend address pool
az network application-gateway address-pool create \
    --gateway-name fastnext-agw \
    --resource-group fastnext-rg \
    --name fastnext-backend-pool \
    --servers $BACKEND_FQDN
```

### 6.3 Configure HTTP Settings

```bash
# Create HTTP settings
az network application-gateway http-settings create \
    --gateway-name fastnext-agw \
    --resource-group fastnext-rg \
    --name fastnext-http-settings \
    --port 80 \
    --protocol Http \
    --cookie-based-affinity Disabled \
    --timeout 30
```

## Step 7: Configure SSL/TLS

### 7.1 Create Key Vault Certificate

```bash
# Upload certificate to Key Vault
az keyvault certificate import \
    --vault-name fastnext-kv \
    --name fastnext-cert \
    --file $CERTIFICATE_FILE
```

### 7.2 Configure Application Gateway for HTTPS

```bash
# Add HTTPS listener
az network application-gateway http-listener create \
    --gateway-name fastnext-agw \
    --resource-group fastnext-rg \
    --name fastnext-https-listener \
    --frontend-ip fastnext-agw-pip \
    --frontend-port fastnext-443-port \
    --ssl-cert fastnext-cert

# Create HTTPS port
az network application-gateway frontend-port create \
    --gateway-name fastnext-agw \
    --resource-group fastnext-rg \
    --name fastnext-443-port \
    --port 443
```

## Step 8: Set Up Azure CDN

```bash
# Create CDN profile
az cdn profile create \
    --name fastnext-cdn \
    --resource-group fastnext-rg \
    --sku Standard_Microsoft \
    --location Global

# Create CDN endpoint
az cdn endpoint create \
    --name fastnext-assets \
    --profile-name fastnext-cdn \
    --resource-group fastnext-rg \
    --location Global \
    --origin fastnextstorage$ACCOUNT_SUFFIX.blob.core.windows.net \
    --origin-host-header fastnextstorage$ACCOUNT_SUFFIX.blob.core.windows.net \
    --enable-compression true \
    --query-optimization GeneralWebDelivery
```

## Step 9: Configure DNS

```bash
# Create DNS zone
az network dns zone create \
    --name fastnext.dev \
    --resource-group fastnext-rg

# Add A record for API
az network dns record-set a add-record \
    --record-set-name api \
    --zone-name fastnext.dev \
    --resource-group fastnext-rg \
    --ipv4-address $AGW_PUBLIC_IP

# Add CNAME record for CDN
az network dns record-set cname set-record \
    --record-set-name assets \
    --zone-name fastnext.dev \
    --resource-group fastnext-rg \
    --cname fastnext-assets.azureedge.net
```

## Step 10: Run Database Migrations

```bash
# Create migration container app
az containerapp create \
    --name fastnext-migration \
    --resource-group fastnext-rg \
    --environment fastnext-env \
    --image fastnextacr.azurecr.io/fastnext-backend:latest \
    --command "alembic upgrade head" \
    --env-vars DATABASE_URL=secretref:fastnext-kv,database-url \
    --registry-server fastnextacr.azurecr.io \
    --cpu 0.5 \
    --memory 1.0Gi \
    --min-replicas 0 \
    --max-replicas 1
```

## Step 11: Set Up Monitoring and Logging

### 11.1 Create Log Analytics Workspace

```bash
# Create Log Analytics workspace
az monitor diagnostic-settings create \
    --name fastnext-diagnostics \
    --resource /subscriptions/$SUBSCRIPTION_ID/resourceGroups/fastnext-rg/providers/Microsoft.App/managedEnvironments/fastnext-env \
    --logs '[{"category": "ContainerAppConsoleLogs", "enabled": true}]' \
    --metrics '[{"category": "AllMetrics", "enabled": true}]' \
    --workspace /subscriptions/$SUBSCRIPTION_ID/resourceGroups/DefaultResourceGroup/providers/Microsoft.OperationalInsights/workspaces/DefaultWorkspace
```

### 11.2 Create Application Insights

```bash
# Create Application Insights
az monitor app-insights component create \
    --app fastnext-appinsights \
    --location eastus \
    --resource-group fastnext-rg \
    --application-type web \
    --kind web
```

### 11.3 Set Up Alerts

```bash
# Create CPU alert
az monitor metrics alert create \
    --name "High CPU Usage" \
    --resource /subscriptions/$SUBSCRIPTION_ID/resourceGroups/fastnext-rg/providers/Microsoft.App/containerApps/fastnext-backend \
    --condition "avg Percentage CPU > 80" \
    --description "CPU usage is above 80%" \
    --evaluation-frequency 5m \
    --window-size 15m \
    --action /subscriptions/$SUBSCRIPTION_ID/resourceGroups/fastnext-rg/providers/microsoft.insights/actionGroups/fastnext-action-group

# Create memory alert
az monitor metrics alert create \
    --name "High Memory Usage" \
    --resource /subscriptions/$SUBSCRIPTION_ID/resourceGroups/fastnext-rg/providers/Microsoft.App/containerApps/fastnext-backend \
    --condition "avg Memory Percentage > 80" \
    --description "Memory usage is above 80%" \
    --evaluation-frequency 5m \
    --window-size 15m \
    --action /subscriptions/$SUBSCRIPTION_ID/resourceGroups/fastnext-rg/providers/microsoft.insights/actionGroups/fastnext-action-group
```

## Step 12: Backup and Disaster Recovery

### 12.1 Configure PostgreSQL Backups

```bash
# Enable geo-redundant backup
az postgres server update \
    --name fastnext-db \
    --resource-group fastnext-rg \
    --geo-redundant-backup Enabled

# Create read replica
az postgres server replica create \
    --name fastnext-db-replica \
    --resource-group fastnext-rg \
    --source-server fastnext-db \
    --location westus
```

### 12.2 Configure Blob Storage Backup

```bash
# Enable blob versioning
az storage account blob-service-properties update \
    --account-name fastnextstorage$ACCOUNT_SUFFIX \
    --enable-versioning true

# Set up lifecycle management
az storage account management-policy create \
    --account-name fastnextstorage$ACCOUNT_SUFFIX \
    --policy @lifecycle-policy.json
```

## Step 13: Cost Optimization

### 13.1 Configure Auto Scaling

```bash
# Update container app scaling rules
az containerapp update \
    --name fastnext-backend \
    --resource-group fastnext-rg \
    --min-replicas 0 \
    --max-replicas 20 \
    --scale-rule-name cpu-scale \
    --scale-rule-type cpu \
    --scale-rule-value 70
```

### 13.2 Set Up Cost Alerts

```bash
# Create budget
az consumption budget create \
    --budget-name fastnext-budget \
    --amount 500 \
    --time-grain Monthly \
    --start-date 2024-01-01 \
    --end-date 2024-12-31 \
    --notifications '[{"enabled": true, "operator": "GreaterThan", "threshold": 80, "contactEmails": ["admin@fastnext.dev"]}]'
```

## Troubleshooting

### Common Issues

1. **Container App Deployment Fails**
   - Check Azure Container Registry permissions
   - Verify environment variables and secrets
   - Review container logs: `az containerapp logs show`

2. **Database Connection Issues**
   - Verify firewall rules allow Azure services
   - Check connection string format
   - Ensure SSL is properly configured

3. **SSL Certificate Issues**
   - Verify certificate is properly uploaded to Key Vault
   - Check Application Gateway SSL settings
   - Ensure domain ownership

### Monitoring Commands

```bash
# Check container app status
az containerapp show --name fastnext-backend --resource-group fastnext-rg

# View logs
az containerapp logs show --name fastnext-backend --resource-group fastnext-rg --follow

# Check database status
az postgres server show --name fastnext-db --resource-group fastnext-rg

# Monitor Application Gateway
az network application-gateway show --name fastnext-agw --resource-group fastnext-rg
```

## Security Best Practices

- Use Azure Front Door for global WAF protection
- Implement Azure Policy for governance
- Enable Azure Defender for threat protection
- Use Managed Identity for service authentication
- Implement Azure Information Protection
- Enable Azure Monitor for compliance auditing

---

*This deployment guide is for FastNext Framework v1.5. For the latest updates, check the official documentation.*