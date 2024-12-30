# Environment variable with validation
variable "environment" {
  type        = string
  description = "Deployment environment (staging or production)"

  validation {
    condition     = can(regex("^(staging|production)$", var.environment))
    error_message = "Environment must be either staging or production."
  }
}

# AWS region variable with default
variable "region" {
  type        = string
  description = "AWS region for resource deployment"
  default     = "us-east-1"

  validation {
    condition     = can(regex("^[a-z]{2}-[a-z]+-[0-9]{1}$", var.region))
    error_message = "Region must be a valid AWS region format (e.g., us-east-1)."
  }
}

# PostgreSQL database configuration object
variable "database_config" {
  type = object({
    instance_class          = string
    allocated_storage      = number
    engine_version         = string
    max_connections       = number
    backup_retention_period = number
    multi_az              = bool
  })
  description = "PostgreSQL database configuration settings"

  default = {
    instance_class          = "db.t3.medium"
    allocated_storage      = 20
    engine_version         = "14.6"
    max_connections       = 100
    backup_retention_period = 7
    multi_az              = true
  }

  validation {
    condition     = var.database_config.allocated_storage >= 20
    error_message = "Allocated storage must be at least 20 GB."
  }

  validation {
    condition     = var.database_config.max_connections >= 100
    error_message = "Maximum connections must be at least 100."
  }

  validation {
    condition     = var.database_config.backup_retention_period >= 7
    error_message = "Backup retention period must be at least 7 days."
  }

  validation {
    condition     = can(regex("^14\\.", var.database_config.engine_version))
    error_message = "PostgreSQL engine version must be 14.x."
  }
}

# Redis cache configuration object
variable "cache_config" {
  type = object({
    node_type              = string
    num_cache_nodes       = number
    memory_size_mb        = number
    parameter_group_family = string
  })
  description = "Redis cache configuration settings"

  default = {
    node_type              = "cache.t4g.medium"
    num_cache_nodes       = 2
    memory_size_mb        = 2048
    parameter_group_family = "redis6.x"
  }

  validation {
    condition     = var.cache_config.memory_size_mb >= 2048
    error_message = "Memory size must be at least 2048 MB (2GB)."
  }

  validation {
    condition     = var.cache_config.num_cache_nodes >= 2
    error_message = "Number of cache nodes must be at least 2 for high availability."
  }

  validation {
    condition     = can(regex("^cache\\.", var.cache_config.node_type))
    error_message = "Node type must be a valid Redis node type (starting with 'cache.')."
  }

  validation {
    condition     = var.cache_config.parameter_group_family == "redis6.x"
    error_message = "Parameter group family must be redis6.x as specified in requirements."
  }
}