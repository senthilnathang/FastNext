# AWS Deployment Guide

This guide provides step-by-step instructions for deploying FastNext Framework on Amazon Web Services (AWS).

## Prerequisites

- AWS Account with appropriate permissions
- AWS CLI installed and configured
- Docker and Docker Compose installed locally
- Domain name (optional, for production)

## Architecture Overview

The AWS deployment uses the following services:
- **ECS Fargate**: Container orchestration
- **RDS PostgreSQL**: Managed database
- **ElastiCache Redis**: Managed caching
- **S3**: File storage
- **CloudFront**: CDN for static assets
- **Route 53**: DNS management
- **Certificate Manager**: SSL certificates
- **Application Load Balancer**: Load balancing

## Step 1: Prepare AWS Resources

### 1.1 Create VPC and Networking

```bash
# Create VPC
aws ec2 create-vpc --cidr-block 10.0.0.0/16 --tag-specifications 'ResourceType=vpc,Tags=[{Key=Name,Value=fastnext-vpc}]'

# Create subnets (2 public, 2 private for high availability)
aws ec2 create-subnet --vpc-id $VPC_ID --cidr-block 10.0.1.0/24 --availability-zone us-east-1a --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=fastnext-public-1a}]'
aws ec2 create-subnet --vpc-id $VPC_ID --cidr-block 10.0.2.0/24 --availability-zone us-east-1b --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=fastnext-public-1b}]'
aws ec2 create-subnet --vpc-id $VPC_ID --cidr-block 10.0.3.0/24 --availability-zone us-east-1a --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=fastnext-private-1a}]'
aws ec2 create-subnet --vpc-id $VPC_ID --cidr-block 10.0.4.0/24 --availability-zone us-east-1b --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=fastnext-private-1b}]'

# Create Internet Gateway
aws ec2 create-internet-gateway --tag-specifications 'ResourceType=internet-gateway,Tags=[{Key=Name,Value=fastnext-igw}]'
aws ec2 attach-internet-gateway --vpc-id $VPC_ID --internet-gateway-id $IGW_ID

# Create NAT Gateway
aws ec2 create-nat-gateway --subnet-id $PUBLIC_SUBNET_1 --allocation-id $EIP_ALLOCATION_ID --tag-specifications 'ResourceType=natgateway,Tags=[{Key=Name,Value=fastnext-nat}]'

# Create route tables
aws ec2 create-route-table --vpc-id $VPC_ID --tag-specifications 'ResourceType=route-table,Tags=[{Key=Name,Value=fastnext-public-rt}]'
aws ec2 create-route --route-table-id $PUBLIC_RT_ID --destination-cidr-block 0.0.0.0/0 --gateway-id $IGW_ID
```

### 1.2 Create Security Groups

```bash
# ALB Security Group
aws ec2 create-security-group --group-name fastnext-alb-sg --description "ALB Security Group" --vpc-id $VPC_ID
aws ec2 authorize-security-group-ingress --group-id $ALB_SG_ID --protocol tcp --port 80 --cidr 0.0.0.0/0
aws ec2 authorize-security-group-ingress --group-id $ALB_SG_ID --protocol tcp --port 443 --cidr 0.0.0.0/0

# ECS Security Group
aws ec2 create-security-group --group-name fastnext-ecs-sg --description "ECS Security Group" --vpc-id $VPC_ID
aws ec2 authorize-security-group-ingress --group-id $ECS_SG_ID --protocol tcp --port 8000 --source-group $ALB_SG_ID

# RDS Security Group
aws ec2 create-security-group --group-name fastnext-rds-sg --description "RDS Security Group" --vpc-id $VPC_ID
aws ec2 authorize-security-group-ingress --group-id $RDS_SG_ID --protocol tcp --port 5432 --source-group $ECS_SG_ID

# Redis Security Group
aws ec2 create-security-group --group-name fastnext-redis-sg --description "Redis Security Group" --vpc-id $VPC_ID
aws ec2 authorize-security-group-ingress --group-id $REDIS_SG_ID --protocol tcp --port 6379 --source-group $ECS_SG_ID
```

## Step 2: Set Up Database and Cache

### 2.1 Create RDS PostgreSQL

```bash
aws rds create-db-subnet-group \
    --db-subnet-group-name fastnext-db-subnet-group \
    --db-subnet-group-description "FastNext DB Subnet Group" \
    --subnet-ids $PRIVATE_SUBNET_1 $PRIVATE_SUBNET_2

aws rds create-db-instance \
    --db-instance-identifier fastnext-db \
    --db-instance-class db.t3.micro \
    --engine postgres \
    --engine-version 15.4 \
    --master-username fastnext \
    --master-user-password $DB_PASSWORD \
    --allocated-storage 20 \
    --db-subnet-group-name fastnext-db-subnet-group \
    --vpc-security-group-ids $RDS_SG_ID \
    --backup-retention-period 7 \
    --multi-az \
    --storage-encrypted \
    --enable-performance-insights \
    --tags Key=Name,Value=fastnext-db
```

### 2.2 Create ElastiCache Redis

```bash
aws elasticache create-cache-subnet-group \
    --cache-subnet-group-name fastnext-redis-subnet-group \
    --cache-subnet-group-description "FastNext Redis Subnet Group" \
    --subnet-ids $PRIVATE_SUBNET_1 $PRIVATE_SUBNET_2

aws elasticache create-cache-cluster \
    --cache-cluster-id fastnext-redis \
    --cache-node-type cache.t3.micro \
    --engine redis \
    --engine-version 7.0 \
    --num-cache-nodes 1 \
    --cache-subnet-group-name fastnext-redis-subnet-group \
    --security-group-ids $REDIS_SG_ID \
    --tags Key=Name,Value=fastnext-redis
```

## Step 3: Create S3 Bucket and CloudFront

### 3.1 Create S3 Bucket

```bash
aws s3 mb s3://fastnext-assets-$ACCOUNT_ID --region us-east-1

# Enable versioning
aws s3api put-bucket-versioning \
    --bucket fastnext-assets-$ACCOUNT_ID \
    --versioning-configuration Status=Enabled

# Set up CORS
aws s3api put-bucket-cors --bucket fastnext-assets-$ACCOUNT_ID --cors-configuration '{
    "CORSRules": [
        {
            "AllowedOrigins": ["*"],
            "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
            "AllowedHeaders": ["*"],
            "MaxAgeSeconds": 3000
        }
    ]
}'
```

### 3.2 Create CloudFront Distribution

```bash
aws cloudfront create-distribution --distribution-config '{
    "CallerReference": "fastnext-assets-'$(date +%s)'",
    "Comment": "FastNext Assets Distribution",
    "DefaultCacheBehavior": {
        "TargetOriginId": "fastnext-assets-origin",
        "ViewerProtocolPolicy": "redirect-to-https",
        "TrustedSigners": {
            "Enabled": false,
            "Quantity": 0
        },
        "ForwardedValues": {
            "QueryString": false,
            "Cookies": {
                "Forward": "none"
            }
        },
        "MinTTL": 0
    },
    "Origins": {
        "Quantity": 1,
        "Items": [
            {
                "Id": "fastnext-assets-origin",
                "DomainName": "fastnext-assets-'$ACCOUNT_ID'.s3.amazonaws.com",
                "S3OriginConfig": {
                    "OriginAccessIdentity": ""
                }
            }
        ]
    },
    "Enabled": true
}'
```

## Step 4: Set Up ECS Cluster

### 4.1 Create ECS Cluster

```bash
aws ecs create-cluster --cluster-name fastnext-cluster --tags key=Name,value=fastnext-cluster
```

### 4.2 Create Task Execution Role

```bash
aws iam create-role \
    --role-name fastnext-task-execution-role \
    --assume-role-policy-document '{
        "Version": "2012-10-17",
        "Statement": [
            {
                "Effect": "Allow",
                "Principal": {
                    "Service": "ecs-tasks.amazonaws.com"
                },
                "Action": "sts:AssumeRole"
            }
        ]
    }'

aws iam attach-role-policy \
    --role-name fastnext-task-execution-role \
    --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy
```

### 4.3 Create Task Definition

```bash
aws ecs register-task-definition \
    --family fastnext-backend \
    --task-role-arn $TASK_EXECUTION_ROLE_ARN \
    --execution-role-arn $TASK_EXECUTION_ROLE_ARN \
    --network-mode awsvpc \
    --requires-compatibilities FARGATE \
    --cpu 256 \
    --memory 512 \
    --container-definitions '[
        {
            "name": "fastnext-backend",
            "image": "'$ACCOUNT_ID'.dkr.ecr.us-east-1.amazonaws.com/fastnext-backend:latest",
            "essential": true,
            "portMappings": [
                {
                    "containerPort": 8000,
                    "protocol": "tcp"
                }
            ],
            "environment": [
                {"name": "DATABASE_URL", "value": "postgresql://fastnext:'$DB_PASSWORD'@'$DB_ENDPOINT':5432/fastnext"},
                {"name": "REDIS_URL", "value": "redis://'$REDIS_ENDPOINT':6379"},
                {"name": "AWS_S3_BUCKET", "value": "fastnext-assets-'$ACCOUNT_ID'"},
                {"name": "SECRET_KEY", "value": "'$SECRET_KEY'"}
            ],
            "logConfiguration": {
                "logDriver": "awslogs",
                "options": {
                    "awslogs-group": "/ecs/fastnext-backend",
                    "awslogs-region": "us-east-1",
                    "awslogs-stream-prefix": "ecs"
                }
            }
        }
    ]'
```

## Step 5: Set Up Load Balancer

### 5.1 Create Application Load Balancer

```bash
aws elbv2 create-load-balancer \
    --name fastnext-alb \
    --subnets $PUBLIC_SUBNET_1 $PUBLIC_SUBNET_2 \
    --security-groups $ALB_SG_ID \
    --scheme internet-facing \
    --type application \
    --ip-address-type ipv4

aws elbv2 create-target-group \
    --name fastnext-target-group \
    --protocol HTTP \
    --port 8000 \
    --vpc-id $VPC_ID \
    --target-type ip

aws elbv2 create-listener \
    --load-balancer-arn $ALB_ARN \
    --protocol HTTP \
    --port 80 \
    --default-actions Type=forward,TargetGroupArn=$TARGET_GROUP_ARN
```

### 5.2 Add SSL Certificate (Optional)

```bash
# Request certificate
aws acm request-certificate \
    --domain-name api.fastnext.dev \
    --validation-method DNS

# Add HTTPS listener after validation
aws elbv2 create-listener \
    --load-balancer-arn $ALB_ARN \
    --protocol HTTPS \
    --port 443 \
    --certificates CertificateArn=$CERTIFICATE_ARN \
    --default-actions Type=forward,TargetGroupArn=$TARGET_GROUP_ARN
```

## Step 6: Deploy Application

### 6.1 Build and Push Docker Images

```bash
# Build backend image
cd backend
docker build -t fastnext-backend .
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin $ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com
docker tag fastnext-backend:latest $ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/fastnext-backend:latest
docker push $ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/fastnext-backend:latest

# Build frontend image
cd ../frontend
docker build -t fastnext-frontend .
docker tag fastnext-frontend:latest $ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/fastnext-frontend:latest
docker push $ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/fastnext-frontend:latest
```

### 6.2 Create ECS Service

```bash
aws ecs create-service \
    --cluster fastnext-cluster \
    --service-name fastnext-backend-service \
    --task-definition fastnext-backend \
    --desired-count 2 \
    --launch-type FARGATE \
    --network-configuration '{
        "awsvpcConfiguration": {
            "subnets": ["'$PRIVATE_SUBNET_1'", "'$PRIVATE_SUBNET_2'"],
            "securityGroups": ["'$ECS_SG_ID'"],
            "assignPublicIp": "ENABLED"
        }
    }' \
    --load-balancers '[
        {
            "targetGroupArn": "'$TARGET_GROUP_ARN'",
            "containerName": "fastnext-backend",
            "containerPort": 8000
        }
    ]' \
    --tags key=Name,value=fastnext-backend-service
```

## Step 7: Configure DNS (Optional)

```bash
# Create hosted zone
aws route53 create-hosted-zone --name fastnext.dev --caller-reference $(date +%s)

# Create A record for ALB
aws route53 change-resource-record-sets \
    --hosted-zone-id $HOSTED_ZONE_ID \
    --change-batch '{
        "Changes": [
            {
                "Action": "CREATE",
                "ResourceRecordSet": {
                    "Name": "api.fastnext.dev",
                    "Type": "A",
                    "AliasTarget": {
                        "DNSName": "'$ALB_DNS_NAME'",
                        "HostedZoneId": "'$ALB_HOSTED_ZONE_ID'",
                        "EvaluateTargetHealth": true
                    }
                }
            }
        ]
    }'
```

## Step 8: Run Database Migrations

```bash
# Run migrations via ECS task
aws ecs run-task \
    --cluster fastnext-cluster \
    --task-definition fastnext-migration \
    --launch-type FARGATE \
    --network-configuration '{
        "awsvpcConfiguration": {
            "subnets": ["'$PRIVATE_SUBNET_1'"],
            "securityGroups": ["'$ECS_SG_ID'"]
        }
    }' \
    --overrides '{
        "containerOverrides": [
            {
                "name": "fastnext-backend",
                "command": ["alembic", "upgrade", "head"]
            }
        ]
    }'
```

## Step 9: Monitoring and Logging

### 9.1 Set Up CloudWatch Logs

```bash
aws logs create-log-group --log-group-name /ecs/fastnext-backend
aws logs create-log-group --log-group-name /ecs/fastnext-frontend
```

### 9.2 Create CloudWatch Alarms

```bash
# CPU utilization alarm
aws cloudwatch put-metric-alarm \
    --alarm-name fastnext-high-cpu \
    --alarm-description "CPU utilization is high" \
    --metric-name CPUUtilization \
    --namespace AWS/ECS \
    --statistic Average \
    --period 300 \
    --threshold 80 \
    --comparison-operator GreaterThanThreshold \
    --dimensions Name=ClusterName,Value=fastnext-cluster Name=ServiceName,Value=fastnext-backend-service \
    --evaluation-periods 2

# Memory utilization alarm
aws cloudwatch put-metric-alarm \
    --alarm-name fastnext-high-memory \
    --alarm-description "Memory utilization is high" \
    --metric-name MemoryUtilization \
    --namespace AWS/ECS \
    --statistic Average \
    --period 300 \
    --threshold 80 \
    --comparison-operator GreaterThanThreshold \
    --dimensions Name=ClusterName,Value=fastnext-cluster Name=ServiceName,Value=fastnext-backend-service \
    --evaluation-periods 2
```

## Step 10: Backup and Disaster Recovery

### 10.1 Configure RDS Automated Backups

```bash
aws rds modify-db-instance \
    --db-instance-identifier fastnext-db \
    --backup-retention-period 30 \
    --preferred-backup-window 03:00-04:00 \
    --apply-immediately
```

### 10.2 Set Up Cross-Region Backup

```bash
aws backup create-backup-vault \
    --backup-vault-name fastnext-dr-vault \
    --encryption-key-arn $KMS_KEY_ARN \
    --region us-west-2

aws backup create-backup-plan \
    --backup-plan '{
        "BackupPlan": {
            "BackupPlanName": "fastnext-dr-plan",
            "Rules": [
                {
                    "RuleName": "daily-backups",
                    "TargetBackupVaultName": "fastnext-dr-vault",
                    "ScheduleExpression": "cron(0 5 ? * * *)",
                    "Lifecycle": {
                        "DeleteAfterDays": 30
                    },
                    "CopyActions": [
                        {
                            "DestinationBackupVaultArn": "arn:aws:backup:us-west-2:'$ACCOUNT_ID':backup-vault:fastnext-dr-vault",
                            "Lifecycle": {
                                "DeleteAfterDays": 365
                            }
                        }
                    ]
                }
            ]
        }
    }'
```

## Cost Optimization

### Auto Scaling

```bash
aws application-autoscaling register-scalable-target \
    --service-namespace ecs \
    --scalable-dimension ecs:service:DesiredCount \
    --resource-id service/fastnext-cluster/fastnext-backend-service \
    --min-capacity 2 \
    --max-capacity 10

aws application-autoscaling put-scaling-policy \
    --policy-name fastnext-cpu-scaling \
    --service-namespace ecs \
    --scalable-dimension ecs:service:DesiredCount \
    --resource-id service/fastnext-cluster/fastnext-backend-service \
    --policy-type TargetTrackingScaling \
    --target-tracking-scaling-policy-configuration '{
        "TargetValue": 70.0,
        "PredefinedMetricSpecification": {
            "PredefinedMetricType": "ECSServiceAverageCPUUtilization"
        },
        "ScaleInCooldown": 300,
        "ScaleOutCooldown": 300
    }'
```

## Troubleshooting

### Common Issues

1. **ECS Task Fails to Start**
   - Check CloudWatch logs for container errors
   - Verify security groups allow necessary traffic
   - Ensure IAM roles have correct permissions

2. **Database Connection Issues**
   - Verify RDS endpoint and port accessibility
   - Check security group rules for database access
   - Ensure database credentials are correct

3. **Load Balancer Health Checks Fail**
   - Verify target group health check configuration
   - Check application logs for errors on health check endpoint
   - Ensure application is binding to correct port

### Monitoring Commands

```bash
# Check ECS service status
aws ecs describe-services --cluster fastnext-cluster --services fastnext-backend-service

# View CloudWatch logs
aws logs tail /ecs/fastnext-backend --follow

# Check RDS status
aws rds describe-db-instances --db-instance-identifier fastnext-db

# Monitor ELB status
aws elbv2 describe-target-health --target-group-arn $TARGET_GROUP_ARN
```

## Security Best Practices

- Use AWS KMS for encryption at rest
- Implement AWS WAF for additional security
- Enable AWS Shield for DDoS protection
- Use AWS Config for compliance monitoring
- Implement least privilege IAM policies
- Enable CloudTrail for audit logging

---

*This deployment guide is for FastNext Framework v1.5. For the latest updates, check the official documentation.*