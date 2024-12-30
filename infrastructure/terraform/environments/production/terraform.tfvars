# Production Environment Identifier
# Used for resource tagging and naming conventions
environment = "production"

# AWS Region Configuration
# Primary production region with multi-AZ support
region = "us-east-1"

# PostgreSQL Database Configuration
# Implements high-availability production database requirements
database_config = {
  # DB instance class optimized for production workloads
  instance_class = "db.t3.large"
  
  # Storage allocation with room for growth
  allocated_storage = 100
  
  # PostgreSQL 14.6 as specified in technical requirements
  engine_version = "14.6"
  
  # Maximum connections as per technical specifications
  max_connections = 100
  
  # Extended backup retention for production data safety
  backup_retention_period = 30
  
  # Multi-AZ deployment for high availability
  multi_az = true
  
  # Required SSL mode for secure connections
  ssl_mode = "require"
  
  # Connection pool size as specified in technical requirements
  connection_pool_size = 20
  
  # Maintenance window during low-traffic period
  maintenance_window = "sun:03:00-sun:04:00"
  
  # Enhanced monitoring interval
  monitoring_interval = 60
}

# Redis Cache Configuration
# Implements production caching requirements
cache_config = {
  # Cache node type optimized for production workloads
  node_type = "cache.t4g.medium"
  
  # Multiple nodes for high availability
  num_cache_nodes = 2
  
  # Memory size as specified in technical requirements (2GB)
  memory_size_mb = 2048
  
  # Redis 6.x as specified in technical requirements
  parameter_group_family = "redis6.x"
  
  # LRU eviction policy as specified
  eviction_policy = "allkeys-lru"
  
  # Automatic failover enabled for high availability
  automatic_failover = true
  
  # Maintenance window during low-traffic period
  maintenance_window = "mon:03:00-mon:04:00"
  
  # Snapshot retention for disaster recovery
  snapshot_retention = 7
}