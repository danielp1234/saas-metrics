# Environment variable inherited from root module
variable "environment" {
  description = "Deployment environment (production, staging) with specific configuration sets"
  type        = string
  validation {
    condition     = can(regex("^(production|staging)$", var.environment))
    error_message = "Environment must be either 'production' or 'staging'"
  }
}

# Database instance configuration
variable "database_name" {
  description = "Name of the PostgreSQL database following naming conventions"
  type        = string
  validation {
    condition     = can(regex("^[a-zA-Z][a-zA-Z0-9_]*$", var.database_name))
    error_message = "Database name must start with a letter and contain only alphanumeric characters and underscores"
  }
}

variable "database_username" {
  description = "Master username for the PostgreSQL database with strict security requirements"
  type        = string
  sensitive   = true
  validation {
    condition     = can(regex("^[a-zA-Z][a-zA-Z0-9_]{8,16}$", var.database_username))
    error_message = "Username must be 8-16 characters, start with a letter, and contain only alphanumeric characters and underscores"
  }
}

variable "database_password" {
  description = "Master password for the PostgreSQL database with strict security requirements"
  type        = string
  sensitive   = true
  validation {
    condition     = can(regex("^(?=.*[A-Z])(?=.*[a-z])(?=.*[0-9])(?=.*[^A-Za-z0-9]).{12,}$", var.database_password))
    error_message = "Password must be at least 12 characters and include uppercase, lowercase, numbers, and special characters"
  }
}

variable "instance_class" {
  description = "RDS instance class for the PostgreSQL database with performance considerations"
  type        = string
  default     = "db.t3.medium"
  validation {
    condition     = can(regex("^db\\.(t3|r5|m5)\\.(medium|large|xlarge|2xlarge)$", var.instance_class))
    error_message = "Instance class must be a valid RDS instance type (t3, r5, or m5 series)"
  }
}

variable "allocated_storage" {
  description = "Allocated storage in GB for the PostgreSQL database with growth considerations"
  type        = number
  default     = 20
  validation {
    condition     = var.allocated_storage >= 20 && var.allocated_storage <= 1000
    error_message = "Allocated storage must be between 20GB and 1000GB"
  }
}

variable "backup_retention_period" {
  description = "Number of days to retain automated backups for disaster recovery"
  type        = number
  default     = 7
  validation {
    condition     = var.backup_retention_period >= 1 && var.backup_retention_period <= 35
    error_message = "Backup retention period must be between 1 and 35 days"
  }
}

variable "multi_az" {
  description = "Enable Multi-AZ deployment for high availability"
  type        = bool
  default     = true
}

variable "performance_insights_enabled" {
  description = "Enable Performance Insights for monitoring and optimization"
  type        = bool
  default     = true
}

variable "vpc_security_group_ids" {
  description = "List of VPC security group IDs to associate with the RDS instance for network security"
  type        = list(string)
}

variable "subnet_ids" {
  description = "List of subnet IDs for the RDS subnet group supporting high availability"
  type        = list(string)
  validation {
    condition     = length(var.subnet_ids) >= 2
    error_message = "At least two subnet IDs are required for high availability"
  }
}

variable "parameter_group_family" {
  description = "PostgreSQL parameter group family for database engine configuration"
  type        = string
  default     = "postgres14"
  validation {
    condition     = can(regex("^postgres[0-9]{2}$", var.parameter_group_family))
    error_message = "Parameter group family must be a valid PostgreSQL version (e.g., postgres14)"
  }
}

variable "max_connections" {
  description = "Maximum allowed connections to the database"
  type        = number
  default     = 100
  validation {
    condition     = var.max_connections >= 100 && var.max_connections <= 5000
    error_message = "Maximum connections must be between 100 and 5000"
  }
}

variable "tags" {
  description = "Tags to apply to all database resources for resource management"
  type        = map(string)
  default     = {}
}

variable "maintenance_window" {
  description = "Preferred maintenance window for database updates"
  type        = string
  default     = "sun:03:00-sun:04:00"
  validation {
    condition     = can(regex("^[a-z]{3}:[0-9]{2}:[0-9]{2}-[a-z]{3}:[0-9]{2}:[0-9]{2}$", var.maintenance_window))
    error_message = "Maintenance window must be in the format 'ddd:hh:mm-ddd:hh:mm'"
  }
}

variable "backup_window" {
  description = "Preferred backup window for automated backups"
  type        = string
  default     = "02:00-03:00"
  validation {
    condition     = can(regex("^[0-9]{2}:[0-9]{2}-[0-9]{2}:[0-9]{2}$", var.backup_window))
    error_message = "Backup window must be in the format 'hh:mm-hh:mm'"
  }
}

variable "deletion_protection" {
  description = "Enable deletion protection for the database instance"
  type        = bool
  default     = true
}

variable "storage_encrypted" {
  description = "Enable storage encryption for the database instance"
  type        = bool
  default     = true
}

variable "monitoring_interval" {
  description = "Enhanced monitoring interval in seconds"
  type        = number
  default     = 60
  validation {
    condition     = contains([0, 1, 5, 10, 15, 30, 60], var.monitoring_interval)
    error_message = "Monitoring interval must be one of: 0, 1, 5, 10, 15, 30, 60"
  }
}