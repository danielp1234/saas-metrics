# Environment identifier
# Used for resource tagging and environment-specific configurations
environment = "staging"

# AWS Region configuration
# US East 1 selected for development team proximity and service availability
region = "us-east-1"

# PostgreSQL Database Configuration
# Optimized for staging environment with cost-effective settings while maintaining functionality
database_config = {
  # t3.medium provides balanced compute and memory for staging workloads
  instance_class = "db.t3.medium"
  
  # 20GB storage allocation sufficient for staging data requirements
  allocated_storage = 20
  
  # PostgreSQL 14.6 as specified in technical requirements
  engine_version = "14.6"
  
  # 100 connections adequate for staging concurrent users
  max_connections = 100
  
  # 7-day backup retention for staging environment
  backup_retention_period = 7
  
  # Multi-AZ disabled for cost optimization in staging
  multi_az = false
  
  # PostgreSQL 14 parameter group family
  parameter_group_family = "postgres14"
  
  # Staging-specific security settings
  deletion_protection = false
  skip_final_snapshot = true
  
  # Maintenance and backup windows during off-peak hours
  maintenance_window = "Mon:03:00-Mon:04:00"
  backup_window = "02:00-03:00"
}

# Redis Cache Configuration
# Balanced performance and cost optimization for staging environment
cache_config = {
  # t4g.medium provides cost-effective performance for staging workloads
  node_type = "cache.t4g.medium"
  
  # 2 nodes for basic redundancy in staging
  num_cache_nodes = 2
  
  # 2GB memory allocation sufficient for staging cache requirements
  memory_size_mb = 2048
  
  # Redis 6.x as specified in technical requirements
  parameter_group_family = "redis6.x"
  
  # Staging-specific availability settings
  automatic_failover_enabled = false
  
  # Reduced snapshot retention for staging
  snapshot_retention_limit = 3
  
  # Maintenance and snapshot windows during off-peak hours
  snapshot_window = "04:00-05:00"
  maintenance_window = "sun:05:00-sun:06:00"
  
  # Standard Redis port
  port = 6379
  
  # Allow immediate application of changes in staging
  apply_immediately = true
}