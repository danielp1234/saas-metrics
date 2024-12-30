# Production environment Terraform configuration for SaaS Metrics Platform
# Implements secure, highly available infrastructure with enhanced monitoring

terraform {
  required_version = ">=1.0.0"
  
  # Enhanced state management with encryption and locking
  backend "s3" {
    bucket         = "saas-metrics-platform-tfstate-prod"
    key            = "terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-lock"
    kms_key_id     = "arn:aws:kms:us-east-1:123456789012:key/terraform-state"
  }
}

# AWS Provider configuration with comprehensive tagging strategy
provider "aws" {
  region = "us-east-1"
  
  default_tags {
    tags = {
      Environment       = "production"
      Project          = "saas-metrics-platform"
      ManagedBy        = "terraform"
      SecurityLevel    = "high"
      BackupEnabled    = "true"
      MonitoringEnabled = "true"
      LastUpdated      = timestamp()
    }
  }
}

# Root module configuration with enhanced production settings
module "root" {
  source = "../.."

  # Environment configuration
  environment = "production"
  region      = "us-east-1"

  # Enhanced database configuration for production
  database_config = {
    instance_class           = "db.t3.medium"
    allocated_storage       = 100
    max_connections        = 100
    engine_version         = "14"
    backup_retention_period = 7
    multi_az               = true
    ssl_mode               = "require"
    storage_encrypted      = true
    deletion_protection    = true
    monitoring_interval    = 60
    performance_insights_enabled = true
  }

  # Enhanced cache configuration for production
  cache_config = {
    node_type                    = "cache.t4g.medium"
    num_cache_nodes             = 2
    memory_size_mb              = 2048
    parameter_group_family      = "redis6.x"
    eviction_policy             = "allkeys-lru"
    persistence_enabled         = true
    multi_az_enabled            = true
    automatic_failover_enabled  = true
    transit_encryption_enabled  = true
    at_rest_encryption_enabled  = true
  }

  # Enhanced monitoring configuration
  monitoring_config = {
    datadog_api_key = var.datadog_api_key
    datadog_app_key = var.datadog_app_key
    alarm_sns_topic = "arn:aws:sns:us-east-1:123456789012:saas-metrics-platform-alarms"
    log_retention_days = 90
    enhanced_monitoring = true
    detailed_monitoring = true
  }

  # Enhanced backup configuration
  backup_config = {
    retention_days = 7
    backup_window = "03:00-04:00"
    maintenance_window = "Mon:04:00-Mon:05:00"
    snapshot_copy_enabled = true
    cross_region_copy = true
  }

  # Enhanced security configuration
  security_config = {
    ssl_required = true
    ip_whitelist = ["10.0.0.0/8"]
    vpc_flow_logs_enabled = true
    cloudtrail_enabled = true
    guardduty_enabled = true
    securityhub_enabled = true
  }

  # Enhanced networking configuration
  network_config = {
    vpc_cidr = "10.0.0.0/16"
    public_subnets = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
    private_subnets = ["10.0.4.0/24", "10.0.5.0/24", "10.0.6.0/24"]
    nat_gateway_count = 3
    enable_vpc_endpoints = true
  }
}

# Additional production-specific security group rules
resource "aws_security_group_rule" "additional_db_protection" {
  type              = "ingress"
  from_port         = 5432
  to_port           = 5432
  protocol          = "tcp"
  cidr_blocks       = ["10.0.0.0/8"]
  security_group_id = module.root.database_security_group_id
  description       = "Allow PostgreSQL access from internal network only"
}

resource "aws_security_group_rule" "additional_redis_protection" {
  type              = "ingress"
  from_port         = 6379
  to_port           = 6379
  protocol          = "tcp"
  cidr_blocks       = ["10.0.0.0/8"]
  security_group_id = module.root.redis_security_group_id
  description       = "Allow Redis access from internal network only"
}

# CloudWatch alarms for enhanced monitoring
resource "aws_cloudwatch_metric_alarm" "database_cpu" {
  alarm_name          = "prod-database-cpu-utilization"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/RDS"
  period              = "300"
  statistic           = "Average"
  threshold           = "80"
  alarm_description   = "Database CPU utilization is too high"
  alarm_actions       = [module.root.monitoring_config.alarm_sns_topic]
  dimensions = {
    DBInstanceIdentifier = module.root.database_instance_id
  }
}

resource "aws_cloudwatch_metric_alarm" "redis_memory" {
  alarm_name          = "prod-redis-memory-utilization"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "DatabaseMemoryUsagePercentage"
  namespace           = "AWS/ElastiCache"
  period              = "300"
  statistic           = "Average"
  threshold           = "80"
  alarm_description   = "Redis memory utilization is too high"
  alarm_actions       = [module.root.monitoring_config.alarm_sns_topic]
  dimensions = {
    CacheClusterId = module.root.redis_cluster_id
  }
}