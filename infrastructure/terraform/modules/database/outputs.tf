# Database Instance Identification
output "db_instance_id" {
  description = "The ID of the RDS instance for reference and tracking"
  value       = aws_db_instance.main.id
}

# Connection Details
output "db_instance_endpoint" {
  description = "The connection endpoint in the format of 'hostname:port' for the RDS instance"
  value       = aws_db_instance.main.endpoint
}

output "db_instance_port" {
  description = "The port number on which the database accepts connections"
  value       = aws_db_instance.main.port
}

output "db_instance_address" {
  description = "The hostname of the RDS instance without port information"
  value       = aws_db_instance.main.address
}

# Secure Connection String
output "db_connection_string" {
  description = "PostgreSQL connection string with all required parameters (sensitive)"
  value       = "postgresql://${aws_db_instance.main.username}:${aws_db_instance.main.password}@${aws_db_instance.main.endpoint}/${aws_db_instance.main.db_name}?sslmode=require"
  sensitive   = true
}

# Monitoring and Performance Insights
output "db_monitoring_role_arn" {
  description = "The Amazon Resource Name (ARN) of the enhanced monitoring IAM role"
  value       = aws_db_instance.main.monitoring_role_arn
}

output "db_performance_insights_enabled" {
  description = "Indicates whether Performance Insights is enabled for the RDS instance"
  value       = aws_db_instance.main.performance_insights_enabled
}

# Security and Network Configuration
output "db_security_group_ids" {
  description = "List of VPC security group IDs associated with the RDS instance"
  value       = aws_db_instance.main.vpc_security_group_ids
}

output "db_subnet_group_name" {
  description = "The name of the DB subnet group associated with the RDS instance"
  value       = aws_db_instance.main.db_subnet_group_name
}

# Backup and Recovery
output "db_latest_backup_time" {
  description = "The latest backup time of the RDS instance"
  value       = aws_db_instance.main.latest_restorable_time
}

output "db_backup_retention_period" {
  description = "The backup retention period in days"
  value       = aws_db_instance.main.backup_retention_period
}

# Resource Tags
output "db_instance_tags" {
  description = "Tags assigned to the RDS instance"
  value       = aws_db_instance.main.tags
}

# Status Information
output "db_instance_status" {
  description = "The current status of the RDS instance"
  value       = aws_db_instance.main.status
}

output "db_instance_availability_zone" {
  description = "The Availability Zone of the RDS instance"
  value       = aws_db_instance.main.availability_zone
}

# Storage Information
output "db_allocated_storage" {
  description = "The amount of allocated storage in gibibytes"
  value       = aws_db_instance.main.allocated_storage
}

output "db_storage_type" {
  description = "The storage type associated with the RDS instance"
  value       = aws_db_instance.main.storage_type
}

# Engine Information
output "db_engine_version" {
  description = "The database engine version"
  value       = aws_db_instance.main.engine_version
}

output "db_instance_class" {
  description = "The RDS instance class"
  value       = aws_db_instance.main.instance_class
}