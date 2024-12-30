# Provider version constraints and configuration
terraform {
  required_version = ">= 1.0.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 4.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.0"
    }
  }
}

# Random password generator for enhanced security
resource "random_password" "master_password" {
  length           = 16
  special          = true
  override_special = "!#$%&*()-_=+[]{}<>:?"
}

# DB subnet group for network isolation
resource "aws_db_subnet_group" "main" {
  name        = "${var.instance_name}-subnet-group"
  subnet_ids  = var.subnet_ids
  description = "Subnet group for ${var.instance_name} RDS instance"

  tags = merge(
    var.tags,
    {
      Name = "${var.instance_name}-subnet-group"
    }
  )
}

# Parameter group for PostgreSQL configuration
resource "aws_db_parameter_group" "main" {
  name        = "${var.instance_name}-parameter-group"
  family      = var.parameter_group_family
  description = "Custom parameter group for ${var.instance_name}"

  # Configure performance and connection parameters
  dynamic "parameter" {
    for_each = var.parameters
    content {
      name         = parameter.value.name
      value        = parameter.value.value
      apply_method = "pending-reboot"
    }
  }

  # Additional required parameters for security and performance
  parameter {
    name  = "ssl"
    value = "1"
  }

  parameter {
    name  = "rds.force_ssl"
    value = "1"
  }

  tags = var.tags
}

# Option group for additional database features
resource "aws_db_option_group" "main" {
  name                     = "${var.instance_name}-option-group"
  engine_name              = "postgres"
  major_engine_version     = split(".", var.engine_version)[0]
  option_group_description = "Option group for ${var.instance_name}"

  tags = var.tags
}

# Enhanced monitoring role
resource "aws_iam_role" "enhanced_monitoring" {
  name = "${var.instance_name}-enhanced-monitoring"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "monitoring.rds.amazonaws.com"
        }
      }
    ]
  })

  managed_policy_arns = ["arn:aws:iam::aws:policy/service-role/AmazonRDSEnhancedMonitoringRole"]
  tags               = var.tags
}

# Main RDS instance
resource "aws_db_instance" "main" {
  identifier = var.instance_name
  
  # Engine configuration
  engine                = "postgres"
  engine_version        = var.engine_version
  instance_class        = var.instance_class
  
  # Storage configuration
  allocated_storage     = var.allocated_storage
  max_allocated_storage = var.max_allocated_storage
  storage_type          = var.storage_type
  storage_encrypted     = var.storage_encrypted
  
  # Network configuration
  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = var.vpc_security_group_ids
  publicly_accessible    = var.publicly_accessible
  port                   = var.port
  
  # Authentication and access
  username                            = var.username
  password                            = var.password != null ? var.password : random_password.master_password.result
  iam_database_authentication_enabled = var.iam_database_authentication_enabled
  
  # Parameter and option groups
  parameter_group_name = aws_db_parameter_group.main.name
  option_group_name    = aws_db_option_group.main.name
  
  # Performance Insights
  performance_insights_enabled          = var.performance_insights_enabled
  performance_insights_retention_period = var.performance_insights_retention_period
  
  # Enhanced monitoring
  monitoring_interval = var.monitoring_interval
  monitoring_role_arn = var.monitoring_interval > 0 ? aws_iam_role.enhanced_monitoring.arn : null
  
  # Backup configuration
  backup_retention_period = var.backup_retention_period
  backup_window          = var.backup_window
  maintenance_window     = var.maintenance_window
  
  # High availability and reliability
  multi_az             = var.multi_az
  deletion_protection  = var.deletion_protection
  skip_final_snapshot  = false
  copy_tags_to_snapshot = true
  
  # Auto minor version upgrade
  auto_minor_version_upgrade = true
  
  # Connection settings from variables
  max_allocated_storage = lookup(var.connection_pool_config, "max_connections", 100)
  
  tags = merge(
    var.tags,
    {
      Name = var.instance_name
    }
  )

  # Lifecycle policies
  lifecycle {
    prevent_destroy = true
    ignore_changes = [
      password,
      snapshot_identifier
    ]
  }

  depends_on = [
    aws_db_subnet_group.main,
    aws_db_parameter_group.main,
    aws_db_option_group.main
  ]
}

# Performance Insights KMS key
resource "aws_kms_key" "performance_insights" {
  count                   = var.performance_insights_enabled ? 1 : 0
  description             = "KMS key for Performance Insights - ${var.instance_name}"
  deletion_window_in_days = 7
  enable_key_rotation     = true
  tags                   = var.tags
}

# CloudWatch alarms for monitoring
resource "aws_cloudwatch_metric_alarm" "database_cpu" {
  alarm_name          = "${var.instance_name}-cpu-utilization"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/RDS"
  period              = "300"
  statistic           = "Average"
  threshold           = "80"
  alarm_description   = "This metric monitors RDS CPU utilization"
  alarm_actions       = []  # Add SNS topic ARN for notifications

  dimensions = {
    DBInstanceIdentifier = aws_db_instance.main.id
  }

  tags = var.tags
}

# Outputs for use in other modules
output "instance_endpoint" {
  description = "The connection endpoint for the RDS instance"
  value       = aws_db_instance.main.endpoint
}

output "instance_port" {
  description = "The port the RDS instance is listening on"
  value       = aws_db_instance.main.port
}

output "instance_arn" {
  description = "The ARN of the RDS instance"
  value       = aws_db_instance.main.arn
}

output "instance_id" {
  description = "The ID of the RDS instance"
  value       = aws_db_instance.main.id
}

output "subnet_group_name" {
  description = "The name of the DB subnet group"
  value       = aws_db_subnet_group.main.name
}

output "parameter_group_name" {
  description = "The name of the DB parameter group"
  value       = aws_db_parameter_group.main.name
}