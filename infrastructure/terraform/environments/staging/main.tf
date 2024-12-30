# Terraform configuration for staging environment
# AWS Provider version: ~> 4.0
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 4.0"
    }
  }

  backend "s3" {
    encrypt = true
    # Backend configuration should be provided via backend config file
  }
}

# Configure AWS Provider with staging-specific tags
provider "aws" {
  region = var.region

  default_tags {
    tags = {
      Environment        = "staging"
      Project           = "saas-metrics-platform"
      ManagedBy         = "terraform"
      CostCenter        = "development"
      DataClassification = "test"
      LastUpdated       = timestamp()
    }
  }
}

# Root module configuration for staging environment
module "root" {
  source = "../.."

  environment = "staging"
  region     = var.region

  # Database configuration optimized for staging
  database_config = {
    instance_class           = "db.t3.medium"
    allocated_storage       = 20
    max_connections        = 100
    engine_version         = "14.6"
    backup_retention_period = 7
    multi_az               = false
    deletion_protection    = false
    skip_final_snapshot    = true
    performance_insights_enabled = true
    monitoring_interval    = 60
  }

  # Redis cache configuration for staging
  cache_config = {
    node_type                  = "cache.t4g.medium"
    num_cache_nodes           = 2
    memory_size_mb           = 2048
    parameter_group_family    = "redis6.x"
    automatic_failover_enabled = false
    snapshot_retention_limit  = 3
    transit_encryption_enabled = true
  }

  # Monitoring configuration for staging environment
  monitoring_config = {
    enable_enhanced_monitoring = true
    retention_in_days        = 30
    alarm_evaluation_periods = 2
    alarm_threshold_cpu     = 80
    alarm_threshold_memory  = 85
  }
}

# Output the database endpoint for application configuration
output "database_endpoint" {
  description = "PostgreSQL database endpoint for staging environment"
  value = {
    endpoint = module.root.database_endpoint
    port     = 5432
  }
  sensitive = true
}

# Output the Redis endpoint for application configuration
output "redis_endpoint" {
  description = "Redis cache endpoint for staging environment"
  value = {
    endpoint = module.root.redis_endpoint
    port     = 6379
  }
  sensitive = true
}

# Local variables for staging-specific configurations
locals {
  environment = "staging"
  project_name = "saas-metrics-platform"
  
  # Common tags for staging resources
  common_tags = {
    Environment     = local.environment
    Project        = local.project_name
    ManagedBy      = "terraform"
    CostCenter     = "development"
    SecurityLevel  = "medium"
    BackupRequired = "true"
  }
}

# Data source for availability zones
data "aws_availability_zones" "available" {
  state = "available"
}