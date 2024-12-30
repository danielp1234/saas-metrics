# Static Assets Bucket Outputs
output "static_assets_bucket" {
  description = "Static assets bucket information for CDN integration and public content delivery. Compatible with Cloudflare R2 for global distribution."
  value = {
    id          = aws_s3_bucket.static_assets.id
    arn         = aws_s3_bucket.static_assets.arn
    domain_name = aws_s3_bucket.static_assets.bucket_domain_name
  }
  
  # No sensitive flag as this is public bucket information
}

# Backups Bucket Outputs
output "backups_bucket" {
  description = "Secure backups bucket information for encrypted backup storage with retention policies. Access restricted to authorized services."
  value = {
    id          = aws_s3_bucket.backups.id
    arn         = aws_s3_bucket.backups.arn
    domain_name = aws_s3_bucket.backups.bucket_domain_name
  }
  
  # Mark as sensitive since this is for restricted access
  sensitive = true
}

# Data Archive Bucket Outputs
output "data_archive_bucket" {
  description = "Data archive bucket information for long-term data retention with encryption and compliance requirements. Used for cold storage of historical data."
  value = {
    id          = aws_s3_bucket.data_archive.id
    arn         = aws_s3_bucket.data_archive.arn
    domain_name = aws_s3_bucket.data_archive.bucket_domain_name
  }
  
  # Mark as sensitive since this contains confidential data
  sensitive = true
}

# Storage Configuration Status Outputs
output "storage_configuration" {
  description = "Storage configuration status including versioning, encryption, and lifecycle rules."
  value = {
    versioning_enabled = var.storage_config.versioning_enabled
    encryption_enabled = var.storage_config.encryption_enabled
    access_logging    = var.storage_config.access_logging
    lifecycle_rules   = {
      archive_after_days    = var.storage_config.lifecycle_rules.archive_after_days
      expire_after_days     = var.storage_config.lifecycle_rules.expire_after_days
      transition_to_ia_days = var.storage_config.lifecycle_rules.transition_to_ia_days
    }
  }
}

# Environment Information
output "environment_info" {
  description = "Environment information for the storage resources."
  value = {
    environment = var.environment
    region      = var.region
  }
}