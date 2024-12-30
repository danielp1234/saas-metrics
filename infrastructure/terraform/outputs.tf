# Redis Cache Outputs
output "redis_endpoint" {
  description = "Redis cache connection endpoint"
  value       = module.cache.redis_endpoint
}

output "redis_port" {
  description = "Redis cache port number"
  value       = module.cache.redis_port
}

# PostgreSQL Database Outputs
output "database_endpoint" {
  description = "PostgreSQL database connection endpoint"
  value       = module.database.endpoint
  sensitive   = true # Protect sensitive connection information
}

output "database_name" {
  description = "PostgreSQL database name"
  value       = module.database.name
}

output "database_port" {
  description = "PostgreSQL database port number"
  value       = module.database.port
}

output "database_username" {
  description = "PostgreSQL database username"
  value       = module.database.username
  sensitive   = true # Protect database credentials
}

# Storage Outputs
output "storage_bucket" {
  description = "S3-compatible storage bucket name"
  value       = module.storage.bucket_name
}

# CDN Outputs
output "cdn_endpoint" {
  description = "CDN endpoint URL"
  value       = module.cdn.endpoint
}

# Monitoring Outputs
output "monitoring_endpoint" {
  description = "Monitoring system endpoint"
  value       = module.monitoring.endpoint
}

# API Gateway Outputs
output "api_endpoint" {
  description = "API gateway endpoint"
  value       = module.api.endpoint
}