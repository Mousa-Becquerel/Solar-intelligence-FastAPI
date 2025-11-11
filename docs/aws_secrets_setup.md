# AWS Secrets Manager Setup Guide

## ⚠️ Security Issue: Exposed Secrets

Your task definition currently has secrets in plain text. Here's how to fix it:

## Step 1: Create Secrets in AWS Secrets Manager

### 1. Create Database Secret

```bash
aws secretsmanager create-secret \
  --name solar-intelligence/database \
  --description "PostgreSQL database credentials" \
  --secret-string '{
    "username": "solar_admin",
    "password": "NEW_SECURE_PASSWORD_HERE",
    "host": "solar-intelligence-db.cp6wsmk62efj.eu-north-1.rds.amazonaws.com",
    "port": 5432,
    "dbname": "solar_intelligence"
  }' \
  --region eu-north-1
```

### 2. Create OpenAI API Key Secret

```bash
aws secretsmanager create-secret \
  --name solar-intelligence/openai-key \
  --description "OpenAI API Key" \
  --secret-string "NEW_OPENAI_KEY_HERE" \
  --region eu-north-1
```

### 3. Create Flask Secret Key

```bash
# Generate new secure key
NEW_FLASK_KEY=$(python3 -c 'import secrets; print(secrets.token_hex(32))')

aws secretsmanager create-secret \
  --name solar-intelligence/flask-secret \
  --description "Flask Secret Key" \
  --secret-string "$NEW_FLASK_KEY" \
  --region eu-north-1
```

## Step 2: Update IAM Role

Add permissions to your ECS task execution role:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue"
      ],
      "Resource": [
        "arn:aws:secretsmanager:eu-north-1:196621412948:secret:solar-intelligence/*"
      ]
    }
  ]
}
```

Apply this policy:

```bash
aws iam put-role-policy \
  --role-name ecsTaskExecutionRole \
  --policy-name SecretsManagerAccess \
  --policy-document file://secrets-policy.json
```

## Step 3: Update Task Definition

Replace environment variables with secrets:

```json
{
  "containerDefinitions": [
    {
      "name": "datahub_agents",
      "secrets": [
        {
          "name": "DATABASE_URL",
          "valueFrom": "arn:aws:secretsmanager:eu-north-1:196621412948:secret:solar-intelligence/database:host::"
        },
        {
          "name": "OPENAI_API_KEY",
          "valueFrom": "arn:aws:secretsmanager:eu-north-1:196621412948:secret:solar-intelligence/openai-key::"
        },
        {
          "name": "FLASK_SECRET_KEY",
          "valueFrom": "arn:aws:secretsmanager:eu-north-1:196621412948:secret:solar-intelligence/flask-secret::"
        }
      ],
      "environment": [
        {
          "name": "PORT",
          "value": "5000"
        },
        {
          "name": "FLASK_ENV",
          "value": "production"
        },
        {
          "name": "GOOGLE_ANALYTICS_ID",
          "value": "G-H5Y8S0MREN"
        }
      ]
    }
  ]
}
```

## Step 4: Rotate Exposed Keys

### Rotate OpenAI API Key
1. Go to https://platform.openai.com/api-keys
2. Create new key
3. Update secret in AWS Secrets Manager
4. Delete old key

### Change Database Password
1. Go to AWS RDS Console
2. Select `solar-intelligence-db`
3. Click "Modify"
4. Change master password
5. Update secret in AWS Secrets Manager

## Cost

AWS Secrets Manager pricing:
- $0.40 per secret per month
- $0.05 per 10,000 API calls
- **Total: ~$1.50/month for 3 secrets**

## Benefits

✅ Secrets not visible in task definitions
✅ Automatic rotation support
✅ Audit trail in CloudTrail
✅ Encrypted at rest
✅ Fine-grained access control
