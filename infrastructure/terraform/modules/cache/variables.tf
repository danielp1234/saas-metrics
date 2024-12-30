# Terraform AWS Redis Cache Module Variables
# Version: 1.0
# Provider version requirements: hashicorp/terraform ~> 1.0

variable "environment" {
  type        = string
  description = "Environment name for resource tagging and naming convention enforcement (e.g. staging, production)"

  validation {
    condition     = can(regex("^(staging|production)$", var.environment))
    error_message = "Environment must be either staging or production to ensure proper resource isolation and configuration."
  }
}

variable "vpc_id" {
  type        = string
  description = "ID of the VPC where Redis will be deployed for network isolation"

  validation {
    condition     = can(regex("^vpc-[a-z0-9]{8,}$", var.vpc_id))
    error_message = "VPC ID must be a valid AWS VPC identifier starting with 'vpc-'."
  }
}

variable "subnet_ids" {
  type        = list(string)
  description = "List of subnet IDs for Redis deployment across multiple availability zones"

  validation {
    condition     = length(var.subnet_ids) >= 2
    error_message = "At least two subnets in different availability zones are required for high availability Redis deployment."
  }

  validation {
    condition     = can([for s in var.subnet_ids : regex("^subnet-[a-z0-9]{8,}$", s)])
    error_message = "All subnet IDs must be valid AWS subnet identifiers starting with 'subnet-'."
  }
}

variable "allowed_cidr_blocks" {
  type        = list(string)
  description = "List of CIDR blocks allowed to access Redis cache instances"
  default     = []

  validation {
    condition = alltrue([
      for cidr in var.allowed_cidr_blocks : can(cidrhost(cidr, 0))
    ])
    error_message = "All CIDR blocks must be in valid IPv4 CIDR notation (e.g., 10.0.0.0/16)."
  }
}

variable "node_type" {
  type        = string
  description = "Redis node instance type for performance and capacity management"
  default     = "cache.t4g.medium"

  validation {
    condition     = can(regex("^cache\\.[a-z0-9]{2,}\\.[a-z0-9]+$", var.node_type))
    error_message = "Node type must be a valid AWS ElastiCache instance type (e.g., cache.t4g.medium)."
  }
}

variable "redis_port" {
  type        = number
  description = "Port number for Redis connections"
  default     = 6379

  validation {
    condition     = var.redis_port > 0 && var.redis_port <= 65535
    error_message = "Redis port must be a valid port number between 1 and 65535."
  }
}

variable "redis_version" {
  type        = string
  description = "Redis engine version"
  default     = "6.2"

  validation {
    condition     = can(regex("^[0-9]\\.[0-9]$", var.redis_version))
    error_message = "Redis version must be in the format X.Y (e.g., 6.2)."
  }
}

variable "maintenance_window" {
  type        = string
  description = "Weekly time range for maintenance operations (e.g., sun:05:00-sun:09:00)"
  default     = "sun:05:00-sun:09:00"

  validation {
    condition     = can(regex("^[a-z]{3}:[0-9]{2}:[0-9]{2}-[a-z]{3}:[0-9]{2}:[0-9]{2}$", var.maintenance_window))
    error_message = "Maintenance window must be in the format day:hour:minute-day:hour:minute (e.g., sun:05:00-sun:09:00)."
  }
}

variable "tags" {
  type        = map(string)
  description = "Additional tags to apply to Redis cache resources"
  default     = {}
}

variable "parameter_group_family" {
  type        = string
  description = "Redis parameter group family"
  default     = "redis6.x"

  validation {
    condition     = can(regex("^redis[0-9]+\\.x$", var.parameter_group_family))
    error_message = "Parameter group family must be a valid Redis family (e.g., redis6.x)."
  }
}

variable "snapshot_retention_limit" {
  type        = number
  description = "Number of days to retain automatic Redis snapshots"
  default     = 7

  validation {
    condition     = var.snapshot_retention_limit >= 0 && var.snapshot_retention_limit <= 35
    error_message = "Snapshot retention limit must be between 0 and 35 days."
  }
}