# AWS Redis Cache Infrastructure Module
# Provider version: hashicorp/aws ~> 4.0
# Module version: 1.0.0

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 4.0"
    }
  }
}

locals {
  name_prefix = "redis-${var.environment}"
  common_tags = merge(
    var.tags,
    {
      Environment = var.environment
      ManagedBy   = "terraform"
      Service     = "redis-cache"
    }
  )
}

# Redis Parameter Group with optimized settings for metrics caching
resource "aws_elasticache_parameter_group" "redis" {
  family      = var.parameter_group_family
  name        = "${local.name_prefix}-params"
  description = "Redis parameter group for ${var.environment} metrics caching"

  # Performance and memory management parameters
  parameter {
    name  = "maxmemory-policy"
    value = "allkeys-lru"
  }

  parameter {
    name  = "maxmemory"
    value = "2gb"
  }

  # Connection and timeout settings
  parameter {
    name  = "timeout"
    value = "300"
  }

  parameter {
    name  = "tcp-keepalive"
    value = "300"
  }

  parameter {
    name  = "repl-timeout"
    value = "60"
  }

  # Event notification settings
  parameter {
    name  = "notify-keyspace-events"
    value = "Ex"
  }

  tags = local.common_tags
}

# Subnet group for multi-AZ Redis deployment
resource "aws_elasticache_subnet_group" "redis" {
  name        = "${local.name_prefix}-subnet-group"
  description = "Redis subnet group for ${var.environment}"
  subnet_ids  = var.subnet_ids

  tags = local.common_tags
}

# Security group for Redis access
resource "aws_security_group" "redis" {
  name_prefix = "${local.name_prefix}-sg"
  description = "Security group for Redis ${var.environment} cluster"
  vpc_id      = var.vpc_id

  ingress {
    description = "Redis access from allowed CIDR blocks"
    from_port   = var.redis_port
    to_port     = var.redis_port
    protocol    = "tcp"
    cidr_blocks = var.allowed_cidr_blocks
  }

  egress {
    description = "Allow all outbound traffic"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  lifecycle {
    create_before_destroy = true
  }

  tags = merge(
    local.common_tags,
    {
      Name = "${local.name_prefix}-security-group"
    }
  )
}

# Redis replication group with high availability configuration
resource "aws_elasticache_replication_group" "redis" {
  replication_group_id          = "${local.name_prefix}-cluster"
  replication_group_description = "Redis replication group for ${var.environment} metrics caching"
  
  # Engine configuration
  engine               = "redis"
  engine_version       = var.redis_version
  node_type           = var.node_type
  port                = var.redis_port
  parameter_group_name = aws_elasticache_parameter_group.redis.name

  # High availability settings
  num_cache_clusters         = 2
  automatic_failover_enabled = true
  multi_az_enabled          = true
  subnet_group_name         = aws_elasticache_subnet_group.redis.name
  security_group_ids        = [aws_security_group.redis.id]

  # Encryption configuration
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true

  # Maintenance and backup settings
  maintenance_window      = var.maintenance_window
  snapshot_window        = "00:00-05:00"
  snapshot_retention_limit = var.snapshot_retention_limit
  auto_minor_version_upgrade = true

  # Performance and connection settings
  apply_immediately = false

  lifecycle {
    prevent_destroy = true
    ignore_changes = [
      num_cache_clusters # Prevent accidental cluster count changes
    ]
  }

  tags = merge(
    local.common_tags,
    {
      Name = "${local.name_prefix}-replication-group"
    }
  )
}

# CloudWatch alarms for monitoring Redis metrics
resource "aws_cloudwatch_metric_alarm" "redis_cpu" {
  alarm_name          = "${local.name_prefix}-cpu-utilization"
  alarm_description   = "Redis cluster CPU utilization"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name        = "CPUUtilization"
  namespace          = "AWS/ElastiCache"
  period             = "300"
  statistic          = "Average"
  threshold          = "75"
  alarm_actions      = []  # Add SNS topic ARN for notifications
  ok_actions         = []  # Add SNS topic ARN for notifications

  dimensions = {
    CacheClusterId = aws_elasticache_replication_group.redis.id
  }

  tags = local.common_tags
}

resource "aws_cloudwatch_metric_alarm" "redis_memory" {
  alarm_name          = "${local.name_prefix}-memory-utilization"
  alarm_description   = "Redis cluster memory utilization"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name        = "DatabaseMemoryUsagePercentage"
  namespace          = "AWS/ElastiCache"
  period             = "300"
  statistic          = "Average"
  threshold          = "80"
  alarm_actions      = []  # Add SNS topic ARN for notifications
  ok_actions         = []  # Add SNS topic ARN for notifications

  dimensions = {
    CacheClusterId = aws_elasticache_replication_group.redis.id
  }

  tags = local.common_tags
}