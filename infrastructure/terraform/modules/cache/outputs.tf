# Redis Cache Module Outputs
# Version: 1.0.0
# Provider version: hashicorp/aws ~> 4.0

output "redis_endpoint" {
  description = "Primary endpoint address for Redis connections used by the application for cache access"
  value       = aws_elasticache_replication_group.redis.primary_endpoint_address
}

output "redis_port" {
  description = "Standard Redis port number used for establishing connections to the cache cluster"
  value       = 6379
}

output "redis_security_group_id" {
  description = "ID of the security group that controls network access to the Redis cluster"
  value       = aws_security_group.redis.id
}