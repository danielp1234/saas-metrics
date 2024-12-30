# Provider configuration for SaaS Metrics Platform
# Version: 1.0.0
# Last Updated: 2024

terraform {
  # Terraform version constraint
  required_version = ">= 1.0.0"

  # Required provider configurations
  required_providers {
    # AWS Provider v4.0
    aws = {
      source  = "hashicorp/aws"
      version = "~> 4.0"
    }

    # Random Provider v3.0
    random = {
      source  = "hashicorp/random"
      version = "~> 3.0"
    }

    # Null Provider v3.0
    null = {
      source  = "hashicorp/random"
      version = "~> 3.0"
    }
  }
}

# AWS Provider Configuration
provider "aws" {
  region = var.region

  # Comprehensive resource tagging strategy
  default_tags {
    tags = {
      Project              = "saas-metrics-platform"
      Environment          = var.environment
      ManagedBy           = "terraform"
      SecurityCompliance   = "high"
      DataClassification  = "confidential"
      BackupPolicy        = "enabled"
      CostCenter          = "platform-infrastructure"
      MaintenanceWindow   = "sunday-01:00-UTC"
      Owner               = "platform-team"
      LastUpdated         = timestamp()
    }
  }

  # Enhanced security configurations
  assume_role {
    role_arn     = var.assume_role_arn
    session_name = "terraform-${var.environment}"
    external_id  = var.external_id
    duration     = "3600"
  }

  # Account security boundary
  allowed_account_ids = [var.aws_account_id]

  # Default encryption configuration
  default_encryption_configuration {
    encryption_at_rest  = true
    encryption_in_transit = true
  }
}

# Random provider for secure resource naming
provider "random" {
  # Random provider doesn't require additional configuration
  # Used for generating secure random identifiers
}

# Null provider for dependency management
provider "null" {
  # Null provider doesn't require additional configuration
  # Used for resource dependencies and conditional creation
}

# Provider feature flags for enhanced security
provider_meta "aws" {
  features {
    iam_authentication {
      require_mfa = true
      session_duration = 3600
    }
    
    logging {
      enable_cloudtrail = true
      enable_cloudwatch = true
      retention_days    = 90
    }
    
    backup {
      enable_automatic_backups = true
      retention_period        = 30
    }
  }
}

# Lifecycle configuration for all AWS resources
locals {
  common_lifecycle_rules = {
    prevent_destroy = true
    ignore_changes = [
      tags["LastUpdated"],
      tags["MaintenanceWindow"]
    ]
  }
}