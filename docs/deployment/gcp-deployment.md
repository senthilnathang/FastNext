# Google Cloud Platform Deployment Guide

This guide provides step-by-step instructions for deploying FastNext Framework on Google Cloud Platform (GCP).

## Prerequisites

- Google Cloud Project with billing enabled
- Google Cloud SDK (gcloud) installed and configured
- Docker and Docker Compose installed locally
- Domain name (optional, for production)

## Architecture Overview

The GCP deployment uses the following services:
- **Cloud Run**: Serverless container platform
- **Cloud SQL PostgreSQL**: Managed database
- **Memorystore Redis**: Managed caching
- **Cloud Storage**: File storage
- **Cloud CDN**: Content delivery network
- **Cloud Load Balancing**: Load balancing and SSL termination
- **Cloud DNS**: DNS management
- **Certificate Manager**: SSL certificates

## Step 1: Set Up GCP Project

### 1.1 Enable Required APIs

```bash
# Enable necessary APIs
gcloud services enable run.googleapis.com
gcloud services enable sqladmin.googleapis.com
gcloud services enable redis.googleapis.com
gcloud services enable storage.googleapis.com
gcloud services enable certificatemanager.googleapis.com
gcloud services enable dns.googleapis.com
gcloud services enable compute.googleapis.com
gcloud services enable monitoring.googleapis.com
gcloud services enable logging.googleapis.com
```

### 1.2 Create Service Account

```bash
# Create service account for FastNext
gcloud iam service-accounts create fastnext-sa \
    --description="Service account for FastNext Framework" \
    --display-name="FastNext Service Account"

# Grant necessary permissions
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:fastnext-sa@$PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/cloudsql.client"

gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:fastnext-sa@$PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/storage.objectAdmin"

gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:fastnext-sa@$PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/redis.editor"

# Create and download key
gcloud iam service-accounts keys create fastnext-sa-key.json \
    --iam-account=fastnext-sa@$PROJECT_ID.iam.gserviceaccount.com
```

## Step 2: Set Up Database and Cache

### 2.1 Create Cloud SQL PostgreSQL

```bash
# Create PostgreSQL instance
gcloud sql instances create fastnext-db \
    --database-version=POSTGRES_15 \
    --tier=db-f1-micro \
    --region=us-central1 \
    --storage-type=SSD \
    --storage-size=10GB \
    --backup-start-time=03:00 \
    --maintenance-window-day=SUN \
    --maintenance-window-hour=3 \
    --enable-bin-log \
    --require-ssl

# Create database
gcloud sql databases create fastnext --instance=fastnext-db

# Create user
gcloud sql users create fastnext \
    --instance=fastnext-db \
    --password=$DB_PASSWORD
```

### 2.2 Create Memorystore Redis

```bash
# Create Redis instance
gcloud redis instances create fastnext-redis \
    --size=1 \
    --region=us-central1 \
    --redis-version=redis_7_0 \
    --tier=basic
```

## Step 3: Create Cloud Storage Bucket

```bash
# Create bucket
gsutil mb -p $PROJECT_ID -c standard -l us-central1 gs://fastnext-assets-$PROJECT_ID

# Set CORS policy
cat > cors-config.json << EOF
[
  {
    "origin": ["*"],
    "method": ["GET", "PUT", "POST", "DELETE"],
    "responseHeader": ["*"],
    "maxAgeSeconds": 3600
  }
]
EOF

gsutil cors set cors-config.json gs://fastnext-assets-$PROJECT_ID

# Enable versioning
gsutil versioning set on gs://fastnext-assets-$PROJECT_ID
```

## Step 4: Build and Deploy Backend

### 4.1 Prepare Docker Images

```bash
# Build backend image
cd backend
gcloud builds submit --tag gcr.io/$PROJECT_ID/fastnext-backend .

# Build frontend image
cd ../frontend
gcloud builds submit --tag gcr.io/$PROJECT_ID/fastnext-frontend .
```

### 4.2 Deploy Backend to Cloud Run

```bash
# Deploy backend service
gcloud run deploy fastnext-backend \
    --image gcr.io/$PROJECT_ID/fastnext-backend \
    --platform managed \
    --region us-central1 \
    --allow-unauthenticated \
    --port 8000 \
    --memory 1Gi \
    --cpu 1 \
    --max-instances 10 \
    --min-instances 1 \
    --concurrency 80 \
    --timeout 300 \
    --service-account fastnext-sa@$PROJECT_ID.iam.gserviceaccount.com \
    --set-env-vars "DATABASE_URL=postgresql://fastnext:$DB_PASSWORD@/fastnext?host=/cloudsql/$PROJECT_ID:us-central1:fastnext-db" \
    --set-env-vars "REDIS_URL=redis://$REDIS_HOST:$REDIS_PORT" \
    --set-env-vars "GCS_BUCKET=fastnext-assets-$PROJECT_ID" \
    --set-env-vars "SECRET_KEY=$SECRET_KEY" \
    --set-env-vars "GOOGLE_CLOUD_PROJECT=$PROJECT_ID" \
    --add-cloudsql-instances $PROJECT_ID:us-central1:fastnext-db \
    --vpc-connector fastnext-connector
```

### 4.3 Create VPC Connector (for Cloud SQL)

```bash
# Create VPC network
gcloud compute networks create fastnext-network --subnet-mode=custom

# Create subnet
gcloud compute networks subnets create fastnext-subnet \
    --network=fastnext-network \
    --region=us-central1 \
    --range=10.0.0.0/24

# Create VPC connector
gcloud compute networks vpc-access connectors create fastnext-connector \
    --network fastnext-network \
    --region us-central1 \
    --range 10.8.0.0/28
```

## Step 5: Set Up Load Balancing

### 5.1 Create Backend Services

```bash
# Create backend service for Cloud Run
gcloud compute backend-services create fastnext-backend-service \
    --protocol HTTP \
    --port-name http \
    --timeout 30s \
    --region us-central1

# Add Cloud Run service as backend
gcloud compute backend-services add-backend fastnext-backend-service \
    --instance-group $INSTANCE_GROUP \
    --instance-group-region us-central1 \
    --balancing-mode UTILIZATION \
    --max-utilization 0.8
```

### 5.2 Create URL Map and Target HTTP Proxy

```bash
# Create URL map
gcloud compute url-maps create fastnext-url-map \
    --default-service fastnext-backend-service

# Create target HTTP proxy
gcloud compute target-http-proxies create fastnext-http-proxy \
    --url-map fastnext-url-map
```

### 5.3 Create Global Load Balancer

```bash
# Reserve global IP
gcloud compute addresses create fastnext-ip \
    --global \
    --ip-version IPV4

# Create forwarding rule
gcloud compute forwarding-rules create fastnext-forwarding-rule \
    --global \
    --target-http-proxy fastnext-http-proxy \
    --ports 80 \
    --address fastnext-ip
```

## Step 6: Configure SSL Certificate

```bash
# Create managed SSL certificate
gcloud certificate-manager certificates create fastnext-cert \
    --domains api.fastnext.dev

# Create certificate map
gcloud certificate-manager maps create fastnext-cert-map

# Create certificate map entry
gcloud certificate-manager maps entries create fastnext-cert-entry \
    --map fastnext-cert-map \
    --certificates fastnext-cert \
    --hostname api.fastnext.dev

# Update target HTTPS proxy
gcloud compute target-https-proxies create fastnext-https-proxy \
    --url-map fastnext-url-map \
    --ssl-certificates fastnext-cert

# Update forwarding rule for HTTPS
gcloud compute forwarding-rules create fastnext-https-forwarding-rule \
    --global \
    --target-https-proxy fastnext-https-proxy \
    --ports 443 \
    --address fastnext-ip
```

## Step 7: Set Up Cloud CDN

```bash
# Create backend bucket for static assets
gcloud compute backend-buckets create fastnext-assets-backend \
    --gcs-bucket-name fastnext-assets-$PROJECT_ID

# Create URL map for CDN
gcloud compute url-maps create fastnext-cdn-url-map \
    --default-backend-bucket fastnext-assets-backend

# Create target HTTP proxy for CDN
gcloud compute target-http-proxies create fastnext-cdn-proxy \
    --url-map fastnext-cdn-url-map

# Create forwarding rule for CDN
gcloud compute forwarding-rules create fastnext-cdn-forwarding-rule \
    --global \
    --target-http-proxy fastnext-cdn-proxy \
    --ports 80 \
    --address fastnext-cdn-ip
```

## Step 8: Configure DNS

```bash
# Create Cloud DNS managed zone
gcloud dns managed-zones create fastnext-zone \
    --dns-name fastnext.dev. \
    --description "FastNext DNS zone"

# Add A record for API
gcloud dns record-sets create api.fastnext.dev. \
    --zone fastnext-zone \
    --type A \
    --ttl 300 \
    --rrdatas $(gcloud compute addresses describe fastnext-ip --global --format="value(address)")

# Add CNAME record for assets
gcloud dns record-sets create assets.fastnext.dev. \
    --zone fastnext-zone \
    --type CNAME \
    --ttl 300 \
    --rrdatas c.storage.googleapis.com.
```

## Step 9: Run Database Migrations

```bash
# Run migrations using Cloud Run job
gcloud run jobs create fastnext-migration \
    --image gcr.io/$PROJECT_ID/fastnext-backend \
    --region us-central1 \
    --service-account fastnext-sa@$PROJECT_ID.iam.gserviceaccount.com \
    --set-env-vars "DATABASE_URL=postgresql://fastnext:$DB_PASSWORD@/fastnext?host=/cloudsql/$PROJECT_ID:us-central1:fastnext-db" \
    --command "alembic" \
    --args "upgrade,head" \
    --add-cloudsql-instances $PROJECT_ID:us-central1:fastnext-db \
    --vpc-connector fastnext-connector \
    --max-retries 0

# Execute the migration job
gcloud run jobs execute fastnext-migration --region us-central1
```

## Step 10: Set Up Monitoring and Logging

### 10.1 Create Monitoring Dashboard

```bash
# Create custom dashboard
gcloud monitoring dashboards create fastnext-dashboard \
    --config-from-file dashboard-config.json
```

### 10.2 Set Up Alerts

```bash
# Create CPU utilization alert
gcloud alpha monitoring policies create \
    --policy-from-file cpu-alert-policy.json

# Create memory utilization alert
gcloud alpha monitoring policies create \
    --policy-from-file memory-alert-policy.json

# Create error rate alert
gcloud alpha monitoring policies create \
    --policy-from-file error-alert-policy.json
```

### 10.3 Configure Log Sinks

```bash
# Create log sink for application logs
gcloud logging sinks create fastnext-app-logs \
    bigquery.googleapis.com/projects/$PROJECT_ID/datasets/fastnext_logs \
    --log-filter 'resource.type="cloud_run_revision" AND resource.labels.service_name="fastnext-backend"'
```

## Step 11: Backup and Disaster Recovery

### 11.1 Configure Cloud SQL Backups

```bash
# Enable automated backups
gcloud sql instances patch fastnext-db \
    --backup-start-time 03:00 \
    --retained-backups-count 7

# Create on-demand backup
gcloud sql backups create fastnext-manual-backup \
    --instance fastnext-db \
    --description "Manual backup for FastNext"
```

### 11.2 Set Up Cross-Region Replication

```bash
# Create read replica in different region
gcloud sql instances create fastnext-db-replica \
    --master-instance-name fastnext-db \
    --region us-west1 \
    --tier db-f1-micro
```

### 11.3 Configure Backup Export

```bash
# Export database to Cloud Storage
gcloud sql export sql fastnext-db \
    gs://fastnext-backups-$(date +%Y%m%d_%H%M%S).sql \
    --database fastnext \
    --offload
```

## Step 12: Cost Optimization

### 12.1 Set Up Auto Scaling

```bash
# Configure Cloud Run auto scaling
gcloud run services update fastnext-backend \
    --max-instances 20 \
    --min-instances 0 \
    --concurrency 100 \
    --cpu 1 \
    --memory 2Gi \
    --platform managed \
    --region us-central1
```

### 12.2 Configure Budget Alerts

```bash
# Create budget
gcloud billing budgets create fastnext-budget \
    --billing-account $BILLING_ACCOUNT_ID \
    --display-name "FastNext Monthly Budget" \
    --budget-amount 500.00 USD \
    --threshold-rule percent=50.0 \
    --threshold-rule percent=90.0 \
    --threshold-rule percent=100.0
```

## Troubleshooting

### Common Issues

1. **Cloud Run Deployment Fails**
   - Check build logs: `gcloud builds log --stream`
   - Verify service account permissions
   - Check VPC connector configuration

2. **Database Connection Issues**
   - Verify Cloud SQL instance is running
   - Check VPC connector and Cloud SQL proxy
   - Ensure service account has Cloud SQL client role

3. **SSL Certificate Issues**
   - Wait for certificate provisioning (can take up to 30 minutes)
   - Check domain ownership verification
   - Verify DNS configuration

### Monitoring Commands

```bash
# Check Cloud Run service status
gcloud run services describe fastnext-backend --region us-central1

# View logs
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=fastnext-backend" --limit 50

# Check Cloud SQL status
gcloud sql instances describe fastnext-db

# Monitor load balancer
gcloud compute forwarding-rules describe fastnext-forwarding-rule --global
```

## Security Best Practices

- Use Google Cloud Armor for WAF protection
- Enable VPC Service Controls for data perimeter
- Implement Cloud Identity-Aware Proxy (IAP)
- Use Secret Manager for sensitive configuration
- Enable Cloud Audit Logs for compliance
- Implement organization policies for security

---

*This deployment guide is for FastNext Framework v1.5. For the latest updates, check the official documentation.*