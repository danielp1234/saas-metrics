# Backend configuration for SaaS Metrics Platform
# Version: 1.0.0
# Purpose: Configures secure state management with S3 backend and DynamoDB locking

terraform {
  # Specify minimum Terraform version required
  required_version = ">= 1.0.0"

  # Configure S3 backend with encryption and environment isolation
  backend "s3" {
    bucket = "saas-metrics-platform-${var.environment}-tfstate"
    key    = "terraform.tfstate"
    region = "us-east-1"
    
    # Enable encryption at rest
    encrypt = true
    
    # Configure DynamoDB table for state locking
    dynamodb_table = "saas-metrics-platform-${var.environment}-tfstate-lock"
    
    # Set bucket access controls
    acl = "private"
  }
}

# S3 bucket for storing Terraform state
resource "aws_s3_bucket" "terraform_state" {
  bucket = "saas-metrics-platform-${var.environment}-tfstate"
  acl    = "private"

  # Enable versioning for state history
  versioning {
    enabled = true
  }

  # Configure server-side encryption
  server_side_encryption_configuration {
    rule {
      apply_server_side_encryption_by_default {
        sse_algorithm = "AES256"
      }
    }
  }

  # Configure lifecycle rules for state file versions
  lifecycle_rule {
    enabled = true

    noncurrent_version_expiration {
      days = 90
    }
  }

  # Enable access logging
  logging {
    target_bucket = "saas-metrics-platform-${var.environment}-logs"
    target_prefix = "tfstate/"
  }

  # Prevent accidental deletion
  lifecycle {
    prevent_destroy = true
  }

  tags = {
    Environment = var.environment
    Purpose     = "Terraform State Storage"
    ManagedBy   = "Terraform"
  }
}

# DynamoDB table for state locking
resource "aws_dynamodb_table" "terraform_state_lock" {
  name         = "saas-metrics-platform-${var.environment}-tfstate-lock"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "LockID"

  attribute {
    name = "LockID"
    type = "S"
  }

  # Enable point-in-time recovery
  point_in_time_recovery {
    enabled = true
  }

  # Prevent accidental deletion
  lifecycle {
    prevent_destroy = true
  }

  tags = {
    Environment = var.environment
    Purpose     = "Terraform State Locking"
    ManagedBy   = "Terraform"
  }
}

# S3 bucket policy for terraform state
resource "aws_s3_bucket_policy" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "EnforceTLSRequestsOnly"
        Effect = "Deny"
        Principal = "*"
        Action = "s3:*"
        Resource = [
          aws_s3_bucket.terraform_state.arn,
          "${aws_s3_bucket.terraform_state.arn}/*"
        ]
        Condition = {
          Bool = {
            "aws:SecureTransport": "false"
          }
        }
      }
    ]
  })
}

# Enable default encryption for the S3 bucket
resource "aws_s3_bucket_server_side_encryption_configuration" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# Block public access to the S3 bucket
resource "aws_s3_bucket_public_access_block" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}