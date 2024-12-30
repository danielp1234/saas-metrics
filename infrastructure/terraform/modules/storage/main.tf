# Provider configuration with AWS S3-compatible storage
# AWS Provider version ~> 4.0
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 4.0"
    }
  }
}

# Static Assets Bucket Configuration
resource "aws_s3_bucket" "static_assets" {
  bucket = "${var.bucket_names.static_assets}-${var.environment}"
  tags   = merge(var.tags, {
    Name        = "Static Assets"
    Environment = var.environment
    Type        = "Public"
  })
}

resource "aws_s3_bucket_versioning" "static_assets_versioning" {
  bucket = aws_s3_bucket.static_assets.id
  versioning_configuration {
    status = var.storage_config.versioning_enabled ? "Enabled" : "Disabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "static_assets_encryption" {
  bucket = aws_s3_bucket.static_assets.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# Backups Bucket Configuration
resource "aws_s3_bucket" "backups" {
  bucket = "${var.bucket_names.backups}-${var.environment}"
  tags   = merge(var.tags, {
    Name        = "Backups"
    Environment = var.environment
    Type        = "Restricted"
  })
}

resource "aws_s3_bucket_versioning" "backups_versioning" {
  bucket = aws_s3_bucket.backups.id
  versioning_configuration {
    status = var.storage_config.versioning_enabled ? "Enabled" : "Disabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "backups_encryption" {
  bucket = aws_s3_bucket.backups.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# Data Archive Bucket Configuration
resource "aws_s3_bucket" "data_archive" {
  bucket = "${var.bucket_names.data_archive}-${var.environment}"
  tags   = merge(var.tags, {
    Name        = "Data Archive"
    Environment = var.environment
    Type        = "Confidential"
  })
}

resource "aws_s3_bucket_versioning" "data_archive_versioning" {
  bucket = aws_s3_bucket.data_archive.id
  versioning_configuration {
    status = var.storage_config.versioning_enabled ? "Enabled" : "Disabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "data_archive_encryption" {
  bucket = aws_s3_bucket.data_archive.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# Lifecycle Rules for Data Archive
resource "aws_s3_bucket_lifecycle_configuration" "data_archive_lifecycle" {
  bucket = aws_s3_bucket.data_archive.id

  rule {
    id     = "archive_old_data"
    status = "Enabled"

    transition {
      days          = var.storage_config.lifecycle_rules.transition_to_ia_days
      storage_class = "STANDARD_IA"
    }

    transition {
      days          = var.storage_config.lifecycle_rules.archive_after_days
      storage_class = "GLACIER"
    }

    expiration {
      days = var.storage_config.lifecycle_rules.expire_after_days
    }
  }
}

# Access Logging Configuration (if enabled)
resource "aws_s3_bucket_logging" "logging_config" {
  count  = var.storage_config.access_logging ? 1 : 0
  bucket = aws_s3_bucket.data_archive.id

  target_bucket = aws_s3_bucket.backups.id
  target_prefix = "access-logs/"
}

# Bucket Policies
resource "aws_s3_bucket_policy" "static_assets_policy" {
  bucket = aws_s3_bucket.static_assets.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "PublicReadGetObject"
        Effect    = "Allow"
        Principal = "*"
        Action    = "s3:GetObject"
        Resource  = "${aws_s3_bucket.static_assets.arn}/*"
      }
    ]
  })
}

resource "aws_s3_bucket_policy" "backups_policy" {
  bucket = aws_s3_bucket.backups.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "DenyUnencryptedObjectUploads"
        Effect    = "Deny"
        Principal = "*"
        Action    = "s3:PutObject"
        Resource  = "${aws_s3_bucket.backups.arn}/*"
        Condition = {
          StringNotEquals = {
            "s3:x-amz-server-side-encryption" = "AES256"
          }
        }
      },
      {
        Sid       = "DenyPublicAccess"
        Effect    = "Deny"
        Principal = "*"
        Action    = "s3:*"
        Resource  = [
          aws_s3_bucket.backups.arn,
          "${aws_s3_bucket.backups.arn}/*"
        ]
        Condition = {
          Bool = {
            "aws:SecureTransport" = "false"
          }
        }
      }
    ]
  })
}

resource "aws_s3_bucket_public_access_block" "backups_access" {
  bucket = aws_s3_bucket.backups.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_public_access_block" "data_archive_access" {
  bucket = aws_s3_bucket.data_archive.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# CORS Configuration for Static Assets
resource "aws_s3_bucket_cors_configuration" "static_assets_cors" {
  bucket = aws_s3_bucket.static_assets.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "HEAD"]
    allowed_origins = ["*"]
    expose_headers  = ["ETag"]
    max_age_seconds = 3000
  }
}