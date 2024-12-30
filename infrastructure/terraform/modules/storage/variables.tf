# Environment variable with strict validation for staging or production
variable "environment" {
  type        = string
  description = "Deployment environment with strict validation"
  
  validation {
    condition     = can(regex("^(staging|production)$", var.environment))
    error_message = "Environment must be either staging or production"
  }
}

# AWS region variable with default to us-east-1
variable "region" {
  type        = string
  description = "AWS region for resource deployment"
  default     = "us-east-1"
}

# Comprehensive storage configuration object
variable "storage_config" {
  type = object({
    versioning_enabled = bool
    encryption_enabled = bool
    access_logging    = bool
    lifecycle_rules   = object({
      archive_after_days    = number
      expire_after_days     = number
      transition_to_ia_days = number
    })
  })
  
  description = "Comprehensive storage configuration settings"
  
  default = {
    versioning_enabled = true
    encryption_enabled = true
    access_logging    = true
    lifecycle_rules   = {
      archive_after_days    = 730  # 2 years before archival
      expire_after_days     = 1095 # 3 years before expiration
      transition_to_ia_days = 90   # 90 days before IA transition
    }
  }

  validation {
    condition     = var.storage_config.archive_after_days <= var.storage_config.expire_after_days
    error_message = "Archive period must be less than or equal to expiration period"
  }

  validation {
    condition     = var.storage_config.transition_to_ia_days < var.storage_config.archive_after_days
    error_message = "Transition to IA must occur before archival"
  }
}

# Bucket naming configuration with validation
variable "bucket_names" {
  type = object({
    static_assets = string
    backups       = string
    data_archive  = string
  })
  
  description = "Storage bucket naming configuration"

  validation {
    condition = (
      can(regex("^[a-z0-9.-]+$", var.bucket_names.static_assets)) && 
      can(regex("^[a-z0-9.-]+$", var.bucket_names.backups)) && 
      can(regex("^[a-z0-9.-]+$", var.bucket_names.data_archive))
    )
    error_message = "Bucket names must contain only lowercase letters, numbers, dots, and hyphens"
  }

  validation {
    condition = (
      length(var.bucket_names.static_assets) >= 3 && length(var.bucket_names.static_assets) <= 63 &&
      length(var.bucket_names.backups) >= 3 && length(var.bucket_names.backups) <= 63 &&
      length(var.bucket_names.data_archive) >= 3 && length(var.bucket_names.data_archive) <= 63
    )
    error_message = "Bucket names must be between 3 and 63 characters long"
  }
}

# Resource tagging configuration
variable "tags" {
  type        = map(string)
  description = "Resource tags for cost allocation and management"
  default     = {}

  validation {
    condition = length(var.tags) <= 50
    error_message = "Maximum of 50 tags are allowed"
  }

  validation {
    condition = alltrue([
      for key, value in var.tags :
      length(key) <= 128 && length(value) <= 256
    ])
    error_message = "Tag keys must not exceed 128 characters and values must not exceed 256 characters"
  }
}